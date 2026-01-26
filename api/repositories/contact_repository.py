"""
Repository for business.contacts table.

Manages business contacts (adjusters, vendors, employees).
These are BUSINESS contacts, separate from personal contacts in dashboard.people.
"""
from typing import List, Optional, Dict, Any
from api.repositories.base import BaseRepository
from api.schemas.operations import ContactResponse
from api.services.supabase_errors import handle_supabase_error
import logging

logger = logging.getLogger("apex_assistant.repository.contact")


class ContactRepository(BaseRepository[ContactResponse]):
    """Repository for business contacts."""

    def __init__(self):
        super().__init__(
            table_name="contacts",
            schema="business",
            model=ContactResponse,
        )

    async def find_by_organization(
        self,
        organization_id: int,
        include_inactive: bool = False,
    ) -> List[ContactResponse]:
        """
        Find all contacts for an organization.

        Args:
            organization_id: Organization ID
            include_inactive: Include inactive contacts

        Returns:
            List of contacts
        """
        try:
            query = (
                self._get_table()
                .select("*")
                .eq("organization_id", organization_id)
            )

            if not include_inactive:
                query = query.eq("is_active", True)

            result = query.order("last_name").execute()

            return [self.model(**item) for item in result.data]

        except Exception as e:
            logger.error(f"Error finding contacts by organization {organization_id}: {e}")
            raise handle_supabase_error(e)

    async def find_with_organization(self, id: int) -> Optional[Dict[str, Any]]:
        """
        Find contact with organization details.

        Args:
            id: Contact ID

        Returns:
            Dict with contact and organization info
        """
        try:
            result = (
                self._get_table()
                .select(
                    """
                    *,
                    organization:organizations(*)
                    """
                )
                .eq("id", id)
                .execute()
            )

            if not result.data:
                return None

            return result.data[0]

        except Exception as e:
            logger.error(f"Error finding contact with organization {id}: {e}")
            raise handle_supabase_error(e)

    async def search(
        self,
        search_term: str,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """
        Search contacts by name or email.

        Args:
            search_term: Search string
            limit: Max results

        Returns:
            List of matching contacts with organization info
        """
        try:
            result = (
                self._get_table()
                .select(
                    """
                    *,
                    organization:organizations(name, org_type)
                    """
                )
                .or_(
                    f"first_name.ilike.%{search_term}%,"
                    f"last_name.ilike.%{search_term}%,"
                    f"email.ilike.%{search_term}%"
                )
                .eq("is_active", True)
                .order("last_name")
                .limit(limit)
                .execute()
            )

            return result.data

        except Exception as e:
            logger.error(f"Error searching contacts: {e}")
            raise handle_supabase_error(e)

    async def find_adjusters(self) -> List[Dict[str, Any]]:
        """
        Find all contacts that are insurance adjusters.

        Returns:
            List of adjusters with organization info
        """
        try:
            result = (
                self._get_table()
                .select(
                    """
                    *,
                    organization:organizations!inner(name, org_type)
                    """
                )
                .eq("is_active", True)
                .in_("organization.org_type", ["insurance_carrier", "tpa"])
                .order("last_name")
                .execute()
            )

            return result.data

        except Exception as e:
            logger.error(f"Error finding adjusters: {e}")
            raise handle_supabase_error(e)

    async def find_by_email(self, email: str) -> Optional[ContactResponse]:
        """
        Find contact by email address.

        Args:
            email: Email address

        Returns:
            Contact if found, None otherwise
        """
        try:
            result = (
                self._get_table()
                .select("*")
                .eq("email", email)
                .execute()
            )

            if not result.data:
                return None

            return self.model(**result.data[0])

        except Exception as e:
            logger.error(f"Error finding contact by email {email}: {e}")
            raise handle_supabase_error(e)
