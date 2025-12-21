"""
Service for validating cross-schema references.

This validator ensures data integrity when dashboard tables
reference business tables (e.g., tasks.job_id → business.jobs.id).
"""
from api.services.supabase_client import get_client
from typing import Optional
import logging

logger = logging.getLogger("apex_assistant.repository.validator")


class CrossSchemaValidator:
    """
    Validates references between dashboard and business schemas.

    Critical for ensuring data integrity when dashboard tables
    reference business tables (e.g., tasks.job_id → business.jobs.id).
    """

    def __init__(self):
        self.client = get_client()

    async def validate_job_reference(self, job_id: int) -> bool:
        """
        Validate that a job exists in business.jobs.

        Args:
            job_id: Job ID to validate

        Returns:
            True if job exists, False otherwise
        """
        try:
            result = (
                self.client.schema("business")
                .table("jobs")
                .select("id")
                .eq("id", job_id)
                .execute()
            )

            return len(result.data) > 0

        except Exception as e:
            logger.error(f"Error validating job reference {job_id}: {e}")
            return False

    async def validate_user_reference(self, user_id: str) -> bool:
        """
        Validate that a user exists in auth.users.

        Args:
            user_id: User UUID to validate

        Returns:
            True if user exists, False otherwise
        """
        try:
            result = self.client.auth.admin.get_user_by_id(user_id)
            return result is not None

        except Exception as e:
            logger.error(f"Error validating user reference {user_id}: {e}")
            return False

    async def validate_client_reference(self, client_id: int) -> bool:
        """
        Validate that a client exists in business.clients.

        Args:
            client_id: Client ID to validate

        Returns:
            True if client exists, False otherwise
        """
        try:
            result = (
                self.client.schema("business")
                .table("clients")
                .select("id")
                .eq("id", client_id)
                .execute()
            )

            return len(result.data) > 0

        except Exception as e:
            logger.error(f"Error validating client reference {client_id}: {e}")
            return False

    async def validate_organization_reference(self, org_id: int) -> bool:
        """
        Validate that an organization exists in business.organizations.

        Args:
            org_id: Organization ID to validate

        Returns:
            True if organization exists, False otherwise
        """
        try:
            result = (
                self.client.schema("business")
                .table("organizations")
                .select("id")
                .eq("id", org_id)
                .execute()
            )

            return len(result.data) > 0

        except Exception as e:
            logger.error(f"Error validating organization reference {org_id}: {e}")
            return False

    async def get_job_info(self, job_id: int) -> Optional[dict]:
        """
        Get basic job information for display.

        Args:
            job_id: Job ID

        Returns:
            Dict with job_number, client_name, status, or None
        """
        try:
            result = (
                self.client.schema("business")
                .table("jobs")
                .select("id, job_number, status, client:clients(name)")
                .eq("id", job_id)
                .execute()
            )

            if not result.data:
                return None

            job = result.data[0]
            return {
                "id": job.get("id"),
                "job_number": job.get("job_number"),
                "status": job.get("status"),
                "client_name": job.get("client", {}).get("name") if job.get("client") else None,
            }

        except Exception as e:
            logger.error(f"Error getting job info {job_id}: {e}")
            return None
