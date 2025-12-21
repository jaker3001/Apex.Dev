"""
Authentication service using Supabase Auth.

Wraps Supabase Auth operations for consistent error handling
and business logic.
"""
from typing import Dict, Any, Optional
from supabase import Client
from api.services.supabase_client import get_client
from api.services.supabase_errors import AuthenticationError, handle_supabase_error
import logging

logger = logging.getLogger("apex_assistant.service.auth")


class AuthService:
    """Service for managing authentication with Supabase Auth."""

    def __init__(self):
        self.client: Client = get_client()

    async def sign_in(self, email: str, password: str) -> Dict[str, Any]:
        """
        Sign in with email and password.

        Args:
            email: User email
            password: User password

        Returns:
            Dict with access_token, refresh_token, user, expires_at, expires_in

        Raises:
            AuthenticationError if credentials are invalid
        """
        try:
            result = self.client.auth.sign_in_with_password({
                "email": email,
                "password": password,
            })

            if not result.session:
                raise AuthenticationError("Sign in failed - no session returned")

            return {
                "access_token": result.session.access_token,
                "refresh_token": result.session.refresh_token,
                "user": {
                    "id": result.user.id,
                    "email": result.user.email,
                    "user_metadata": result.user.user_metadata,
                    "role": result.user.user_metadata.get("role", "employee") if result.user.user_metadata else "employee",
                },
                "expires_at": result.session.expires_at,
                "expires_in": result.session.expires_in,
            }

        except Exception as e:
            logger.error(f"Sign in failed for {email}: {e}")
            raise handle_supabase_error(e)

    async def sign_up(
        self,
        email: str,
        password: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Create new user account.

        Args:
            email: User email
            password: User password
            metadata: Optional user metadata (display_name, role, etc.)

        Returns:
            Dict with user info

        Raises:
            AuthenticationError if signup fails
        """
        try:
            result = self.client.auth.sign_up({
                "email": email,
                "password": password,
                "options": {"data": metadata or {}}
            })

            if not result.user:
                raise AuthenticationError("Sign up failed - no user returned")

            return {
                "user": {
                    "id": result.user.id,
                    "email": result.user.email,
                    "user_metadata": result.user.user_metadata,
                },
                "session": {
                    "access_token": result.session.access_token if result.session else None,
                    "refresh_token": result.session.refresh_token if result.session else None,
                } if result.session else None,
            }

        except Exception as e:
            logger.error(f"Sign up failed for {email}: {e}")
            raise handle_supabase_error(e)

    async def refresh_session(self, refresh_token: str) -> Dict[str, Any]:
        """
        Refresh access token using refresh token.

        Args:
            refresh_token: Refresh token

        Returns:
            Dict with new access_token and expires_at

        Raises:
            AuthenticationError if refresh fails
        """
        try:
            result = self.client.auth.refresh_session(refresh_token)

            if not result.session:
                raise AuthenticationError("Refresh failed - no session returned")

            return {
                "access_token": result.session.access_token,
                "refresh_token": result.session.refresh_token,
                "expires_at": result.session.expires_at,
                "expires_in": result.session.expires_in,
            }

        except Exception as e:
            logger.error(f"Session refresh failed: {e}")
            raise handle_supabase_error(e)

    async def sign_out(self) -> None:
        """
        Sign out current user.

        Raises:
            AuthenticationError if sign out fails
        """
        try:
            await self.client.auth.sign_out()
        except Exception as e:
            logger.error(f"Sign out failed: {e}")
            raise handle_supabase_error(e)

    async def get_user_from_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Get user information from JWT token.

        Args:
            token: JWT access token

        Returns:
            Dict with user info, or None if invalid

        Raises:
            AuthenticationError if token is invalid
        """
        try:
            # Set the auth token
            self.client.auth.set_session(token)

            # Get user
            user = self.client.auth.get_user()

            if not user:
                return None

            return {
                "id": user.id,
                "email": user.email,
                "user_metadata": user.user_metadata,
                "role": user.user_metadata.get("role", "employee") if user.user_metadata else "employee",
            }

        except Exception as e:
            logger.error(f"Failed to get user from token: {e}")
            raise handle_supabase_error(e)

    async def reset_password_email(self, email: str) -> None:
        """
        Send password reset email.

        Args:
            email: User email

        Raises:
            AuthenticationError if request fails
        """
        try:
            self.client.auth.reset_password_for_email(email)
        except Exception as e:
            logger.error(f"Password reset request failed for {email}: {e}")
            raise handle_supabase_error(e)

    async def update_user_metadata(
        self,
        user_id: str,
        metadata: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Update user metadata.

        Args:
            user_id: User UUID
            metadata: Metadata to update

        Returns:
            Updated user info

        Raises:
            AuthenticationError if update fails
        """
        try:
            result = self.client.auth.admin.update_user_by_id(
                user_id,
                {"user_metadata": metadata}
            )

            return {
                "id": result.id,
                "email": result.email,
                "user_metadata": result.user_metadata,
            }

        except Exception as e:
            logger.error(f"Failed to update user metadata for {user_id}: {e}")
            raise handle_supabase_error(e)
