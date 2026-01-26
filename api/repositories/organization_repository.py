"""
Repository for business.organizations table.

Manages insurance carriers, TPAs, vendors, and internal entities.
"""
from typing import List, Optional
from api.repositories.base import BaseRepository
from api.schemas.operations import OrganizationResponse
from api.services.supabase_errors import handle_supabase_error
import logging

logger = logging.getLogger("apex_assistant.repository.organization")


class OrganizationRepository(BaseRepository[OrganizationResponse]):
    """Repository for organizations (carriers, TPAs, vendors)."""

    def __init__(self):
        super().__init__(
            table_name="organizations",
            schema="business",
            model=OrganizationResponse,
        )

    async def find_by_type(
        self,
        org_type: str,
        include_inactive: bool = False,
        limit: int = 100,
        offset: int = 0,
    ) -> List[OrganizationResponse]:
        """
        Find organizations by type.

        Args:
            org_type: One of 'insurance_carrier', 'tpa', 'vendor', 'internal'
            include_inactive: Include inactive organizations
            limit: Max results
            offset: Skip N results

        Returns:
            List of organizations
        """
        try:
            query = (
                self._get_table()
                .select("*")
                .eq("org_type", org_type)
            )

            if not include_inactive:
                query = query.eq("is_active", True)

            result = (
                query
                .order("name")
                .limit(limit)
                .offset(offset)
                .execute()
            )

            return [self.model(**item) for item in result.data]

        except Exception as e:
            logger.error(f"Error finding organizations by type {org_type}: {e}")
            raise handle_supabase_error(e)

    async def find_carriers(self, include_inactive: bool = False) -> List[OrganizationResponse]:
        """Find all insurance carriers."""
        return await self.find_by_type("insurance_carrier", include_inactive)

    async def find_tpas(self, include_inactive: bool = False) -> List[OrganizationResponse]:
        """Find all TPAs."""
        return await self.find_by_type("tpa", include_inactive)

    async def find_vendors(self, include_inactive: bool = False) -> List[OrganizationResponse]:
        """Find all vendors."""
        return await self.find_by_type("vendor", include_inactive)

    async def find_with_msa(self) -> List[OrganizationResponse]:
        """
        Find all organizations with active MSA.

        Returns:
            List of organizations with has_msa = true
        """
        try:
            result = (
                self._get_table()
                .select("*")
                .eq("has_msa", True)
                .eq("is_active", True)
                .order("name")
                .execute()
            )

            return [self.model(**item) for item in result.data]

        except Exception as e:
            logger.error(f"Error finding organizations with MSA: {e}")
            raise handle_supabase_error(e)

    async def search(
        self,
        search_term: str,
        limit: int = 50,
    ) -> List[OrganizationResponse]:
        """
        Search organizations by name.

        Args:
            search_term: Search string
            limit: Max results

        Returns:
            List of matching organizations
        """
        try:
            result = (
                self._get_table()
                .select("*")
                .ilike("name", f"%{search_term}%")
                .eq("is_active", True)
                .order("name")
                .limit(limit)
                .execute()
            )

            return [self.model(**item) for item in result.data]

        except Exception as e:
            logger.error(f"Error searching organizations: {e}")
            raise handle_supabase_error(e)
