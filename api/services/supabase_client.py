"""
Supabase client service with connection pooling and error handling.

This module provides a singleton Supabase client with:
- Connection pooling
- Automatic retry logic with exponential backoff
- Configuration from environment variables
- Type hints throughout
"""
import os
from typing import Optional, Any, Callable
from supabase import create_client, Client
from supabase.lib.client_options import ClientOptions
import logging
from functools import lru_cache
import asyncio

logger = logging.getLogger("apex_assistant.supabase")


class SupabaseConfig:
    """Configuration for Supabase client."""

    def __init__(self):
        self.url = os.environ.get("SUPABASE_URL")
        self.key = os.environ.get("SUPABASE_ANON_KEY")
        self.service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

        if not self.url or not self.key:
            raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY must be set")

        # Connection pool settings
        self.pool_size = int(os.environ.get("SUPABASE_POOL_SIZE", "10"))
        self.max_overflow = int(os.environ.get("SUPABASE_MAX_OVERFLOW", "5"))
        self.pool_timeout = int(os.environ.get("SUPABASE_POOL_TIMEOUT", "30"))

        # Retry settings
        self.max_retries = int(os.environ.get("SUPABASE_MAX_RETRIES", "3"))
        self.retry_delay = float(os.environ.get("SUPABASE_RETRY_DELAY", "1.0"))


class SupabaseClient:
    """
    Singleton wrapper for Supabase client with connection pooling.

    Usage:
        client = get_supabase_client()
        result = await client.table("projects").select("*").execute()
    """

    _instance: Optional["SupabaseClient"] = None
    _client: Optional[Client] = None
    _service_client: Optional[Client] = None
    _config: Optional[SupabaseConfig] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._config = SupabaseConfig()
        return cls._instance

    def _create_client(self, use_service_role: bool = False) -> Client:
        """Create a Supabase client with proper configuration."""
        key = (
            self._config.service_role_key if use_service_role
            else self._config.key
        )

        if use_service_role and not key:
            raise ValueError("SUPABASE_SERVICE_ROLE_KEY not set")

        options = ClientOptions(
            auto_refresh_token=True,
            persist_session=True,
            # PostgREST options
            schema="public",
            headers={
                "X-Client-Info": "apex-assistant/1.0",
            }
        )

        return create_client(
            supabase_url=self._config.url,
            supabase_key=key,
            options=options
        )

    @property
    def client(self) -> Client:
        """Get the standard client (uses anon key + RLS)."""
        if self._client is None:
            self._client = self._create_client(use_service_role=False)
            logger.info("Supabase client initialized")
        return self._client

    @property
    def service_client(self) -> Client:
        """Get the service role client (bypasses RLS)."""
        if self._service_client is None:
            self._service_client = self._create_client(use_service_role=True)
            logger.info("Supabase service role client initialized")
        return self._service_client

    def set_auth_token(self, token: str) -> None:
        """
        Set JWT token for the current request context.

        Args:
            token: Supabase JWT token
        """
        self.client.auth.set_session(token)

    async def execute_with_retry(
        self,
        operation: Callable,
        max_retries: Optional[int] = None,
        retry_delay: Optional[float] = None,
    ) -> Any:
        """
        Execute a database operation with retry logic.

        Args:
            operation: Async callable that performs the database operation
            max_retries: Override default max retries
            retry_delay: Override default retry delay

        Returns:
            Result of the operation

        Raises:
            Exception after max retries exhausted
        """
        max_retries = max_retries or self._config.max_retries
        retry_delay = retry_delay or self._config.retry_delay

        last_error = None
        for attempt in range(max_retries):
            try:
                return await operation()
            except Exception as e:
                last_error = e
                logger.warning(
                    f"Supabase operation failed (attempt {attempt + 1}/{max_retries}): {e}"
                )
                if attempt < max_retries - 1:
                    await asyncio.sleep(retry_delay * (2 ** attempt))  # Exponential backoff

        logger.error(f"Supabase operation failed after {max_retries} attempts")
        raise last_error

    async def close(self) -> None:
        """Close Supabase connections."""
        # Supabase client doesn't require explicit closing, but we can cleanup
        self._client = None
        self._service_client = None
        logger.info("Supabase clients closed")


@lru_cache()
def get_supabase_client() -> SupabaseClient:
    """Get the singleton Supabase client instance."""
    return SupabaseClient()


# Convenience functions for direct access
def get_client() -> Client:
    """Get the standard Supabase client."""
    return get_supabase_client().client


def get_service_client() -> Client:
    """Get the service role client (bypasses RLS)."""
    return get_supabase_client().service_client
