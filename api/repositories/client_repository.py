"""
Repository for business.clients table.

Manages property owners / customers.
"""
from typing import List, Optional
from api.repositories.base import BaseRepository
from api.schemas.operations import ClientResponse
from api.services.supabase_errors import handle_supabase_error
import logging

logger = logging.getLogger("apex_assistant.repository.client")


class ClientRepository(BaseRepository[ClientResponse]):
    """Repository for clients (property owners/customers)."""

    def __init__(self):
        super().__init__(
            table_name="clients",
            schema="business",
            model=ClientResponse,
        )

    async def find_by_name(self, name: str) -> Optional[ClientResponse]:
        """
        Find client by exact name match.

        Args:
            name: Client name

        Returns:
            Client if found, None otherwise
        """
        try:
            result = (
                self._get_table()
                .select("*")
                .eq("name", name)
                .execute()
            )

            if not result.data:
                return None

            return self.model(**result.data[0])

        except Exception as e:
            logger.error(f"Error finding client by name {name}: {e}")
            raise handle_supabase_error(e)

    async def find_by_email(self, email: str) -> Optional[ClientResponse]:
        """
        Find client by email address.

        Args:
            email: Email address

        Returns:
            Client if found, None otherwise
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
            logger.error(f"Error finding client by email {email}: {e}")
            raise handle_supabase_error(e)

    async def search(
        self,
        search_term: str,
        include_inactive: bool = False,
        limit: int = 50,
    ) -> List[ClientResponse]:
        """
        Search clients by name, email, or phone.

        Args:
            search_term: Search string
            include_inactive: Include inactive clients
            limit: Max results

        Returns:
            List of matching clients
        """
        try:
            query = (
                self._get_table()
                .select("*")
                .or_(
                    f"name.ilike.%{search_term}%,"
                    f"email.ilike.%{search_term}%,"
                    f"phone.ilike.%{search_term}%"
                )
            )

            if not include_inactive:
                query = query.eq("is_active", True)

            result = (
                query
                .order("name")
                .limit(limit)
                .execute()
            )

            return [self.model(**item) for item in result.data]

        except Exception as e:
            logger.error(f"Error searching clients: {e}")
            raise handle_supabase_error(e)

    async def find_or_create(
        self,
        name: str,
        phone: Optional[str] = None,
        email: Optional[str] = None,
    ) -> ClientResponse:
        """
        Find existing client by name or create new one.

        Args:
            name: Client name
            phone: Optional phone
            email: Optional email

        Returns:
            Existing or newly created client
        """
        # Try to find by name first
        existing = await self.find_by_name(name)
        if existing:
            return existing

        # Create new client
        data = {
            "name": name,
            "phone": phone,
            "email": email,
            "is_active": True,
        }
        return await self.create(data)
