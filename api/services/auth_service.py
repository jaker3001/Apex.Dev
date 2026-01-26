"""
Supabase Auth Service

Handles authentication using Supabase Auth with user_profiles table.
Supports simple role-based access: owner (full) and employee (limited).
"""
from typing import Dict, Any, Optional
from supabase import Client
from pydantic import BaseModel
from api.services.supabase_client import get_client, get_service_client
from api.services.supabase_errors import AuthenticationError, handle_supabase_error
import logging

logger = logging.getLogger("apex_assistant.service.auth")


class UserProfile(BaseModel):
    """User profile from dashboard.user_profiles."""
    id: str  # UUID from Supabase Auth
    email: str
    display_name: str
    role: str  # 'owner' or 'employee'
    avatar_url: Optional[str] = None
    preferences: Dict[str, Any] = {}
    is_active: bool = True
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class AuthResponse(BaseModel):
    """Response from sign in/sign up."""
    access_token: str
    refresh_token: str
    expires_at: int
    expires_in: int
    user: UserProfile


class AuthService:
    """
    Service for managing authentication with Supabase Auth.

    Uses Supabase Auth for authentication and dashboard.user_profiles
    for application-specific user data (role, preferences, etc.).
    """

    def __init__(self):
        self.client: Client = get_client()
        self._service_client: Optional[Client] = None

    @property
    def service_client(self) -> Client:
        """Get service client (bypasses RLS)."""
        if self._service_client is None:
            self._service_client = get_service_client()
        return self._service_client

    async def sign_in(self, email: str, password: str) -> AuthResponse:
        """
        Sign in with email and password.

        Args:
            email: User email
            password: User password

        Returns:
            AuthResponse with tokens and user profile

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

            # Get user profile
            profile = await self.get_profile(result.user.id)

            if not profile.is_active:
                raise AuthenticationError("Account is disabled")

            logger.info(f"User signed in: {email}")

            return AuthResponse(
                access_token=result.session.access_token,
                refresh_token=result.session.refresh_token,
                expires_at=result.session.expires_at,
                expires_in=result.session.expires_in,
                user=profile,
            )

        except AuthenticationError:
            raise
        except Exception as e:
            logger.error(f"Sign in failed for {email}: {e}")
            raise handle_supabase_error(e)

    async def sign_up(
        self,
        email: str,
        password: str,
        display_name: str,
        role: str = "employee",
    ) -> AuthResponse:
        """
        Create new user account with profile.

        Args:
            email: User email
            password: User password (min 6 chars)
            display_name: User display name
            role: User role (owner/employee)

        Returns:
            AuthResponse with tokens and user profile

        Raises:
            AuthenticationError if signup fails
        """
        try:
            # Create auth user
            result = self.client.auth.sign_up({
                "email": email,
                "password": password,
                "options": {
                    "data": {
                        "display_name": display_name,
                        "role": role,
                    }
                }
            })

            if not result.user:
                raise AuthenticationError("Sign up failed - no user returned")

            # Create user profile in dashboard schema
            profile_data = {
                "id": result.user.id,
                "email": email,
                "display_name": display_name,
                "role": role,
                "is_active": True,
                "preferences": {},
            }

            self.service_client.schema("dashboard").table("user_profiles").insert(
                profile_data
            ).execute()

            logger.info(f"Created new user: {email} with role: {role}")

            profile = UserProfile(**profile_data)

            # Return auth response (may not have session if email confirmation required)
            if result.session:
                return AuthResponse(
                    access_token=result.session.access_token,
                    refresh_token=result.session.refresh_token,
                    expires_at=result.session.expires_at,
                    expires_in=result.session.expires_in,
                    user=profile,
                )
            else:
                # Email confirmation required - return profile without tokens
                return AuthResponse(
                    access_token="",
                    refresh_token="",
                    expires_at=0,
                    expires_in=0,
                    user=profile,
                )

        except AuthenticationError:
            raise
        except Exception as e:
            logger.error(f"Sign up failed for {email}: {e}")
            raise handle_supabase_error(e)

    async def refresh_session(self, refresh_token: str) -> AuthResponse:
        """
        Refresh access token using refresh token.

        Args:
            refresh_token: Refresh token

        Returns:
            AuthResponse with new tokens

        Raises:
            AuthenticationError if refresh fails
        """
        try:
            result = self.client.auth.refresh_session(refresh_token)

            if not result.session:
                raise AuthenticationError("Refresh failed - no session returned")

            profile = await self.get_profile(result.user.id)

            return AuthResponse(
                access_token=result.session.access_token,
                refresh_token=result.session.refresh_token,
                expires_at=result.session.expires_at,
                expires_in=result.session.expires_in,
                user=profile,
            )

        except AuthenticationError:
            raise
        except Exception as e:
            logger.error(f"Session refresh failed: {e}")
            raise handle_supabase_error(e)

    async def sign_out(self) -> None:
        """Sign out current user."""
        try:
            self.client.auth.sign_out()
            logger.info("User signed out")
        except Exception as e:
            logger.error(f"Sign out failed: {e}")
            raise handle_supabase_error(e)

    async def get_profile(self, user_id: str) -> UserProfile:
        """
        Get user profile by ID.

        Args:
            user_id: User UUID

        Returns:
            UserProfile

        Raises:
            AuthenticationError if not found
        """
        try:
            result = (
                self.service_client.schema("dashboard")
                .table("user_profiles")
                .select("*")
                .eq("id", user_id)
                .execute()
            )

            if not result.data:
                raise AuthenticationError("User profile not found")

            return UserProfile(**result.data[0])

        except AuthenticationError:
            raise
        except Exception as e:
            logger.error(f"Get profile failed for {user_id}: {e}")
            raise handle_supabase_error(e)

    async def update_profile(
        self,
        user_id: str,
        display_name: Optional[str] = None,
        avatar_url: Optional[str] = None,
        preferences: Optional[Dict[str, Any]] = None,
    ) -> UserProfile:
        """
        Update user profile.

        Args:
            user_id: User UUID
            display_name: New display name
            avatar_url: New avatar URL
            preferences: New preferences (merges with existing)

        Returns:
            Updated UserProfile
        """
        try:
            data = {}
            if display_name is not None:
                data["display_name"] = display_name
            if avatar_url is not None:
                data["avatar_url"] = avatar_url
            if preferences is not None:
                data["preferences"] = preferences

            if not data:
                return await self.get_profile(user_id)

            result = (
                self.service_client.schema("dashboard")
                .table("user_profiles")
                .update(data)
                .eq("id", user_id)
                .execute()
            )

            if not result.data:
                raise AuthenticationError("User profile not found")

            return UserProfile(**result.data[0])

        except AuthenticationError:
            raise
        except Exception as e:
            logger.error(f"Update profile failed for {user_id}: {e}")
            raise handle_supabase_error(e)

    async def verify_token(self, access_token: str) -> Optional[UserProfile]:
        """
        Verify access token and return user profile.

        Args:
            access_token: JWT access token

        Returns:
            UserProfile if valid, None otherwise
        """
        try:
            result = self.client.auth.get_user(access_token)

            if not result.user:
                return None

            return await self.get_profile(result.user.id)

        except Exception as e:
            logger.debug(f"Token verification failed: {e}")
            return None

    async def get_user_from_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Get Supabase user from access token.

        Args:
            token: JWT access token

        Returns:
            Dict with user info, or None if invalid
        """
        try:
            result = self.client.auth.get_user(token)

            if not result.user:
                return None

            return {
                "id": result.user.id,
                "email": result.user.email,
                "user_metadata": result.user.user_metadata,
            }

        except Exception as e:
            logger.debug(f"Failed to get user from token: {e}")
            return None

    async def reset_password_email(self, email: str) -> None:
        """
        Send password reset email.

        Args:
            email: User email
        """
        try:
            self.client.auth.reset_password_for_email(email)
            logger.info(f"Password reset email sent to {email}")
        except Exception as e:
            logger.error(f"Password reset request failed for {email}: {e}")
            raise handle_supabase_error(e)

    async def set_role(self, user_id: str, role: str) -> UserProfile:
        """
        Update user role (admin only).

        Args:
            user_id: User UUID
            role: New role (owner/employee)

        Returns:
            Updated UserProfile
        """
        if role not in ("owner", "employee"):
            raise ValueError(f"Invalid role: {role}")

        try:
            result = (
                self.service_client.schema("dashboard")
                .table("user_profiles")
                .update({"role": role})
                .eq("id", user_id)
                .execute()
            )

            if not result.data:
                raise AuthenticationError("User profile not found")

            logger.info(f"Updated role for {user_id} to {role}")
            return UserProfile(**result.data[0])

        except Exception as e:
            logger.error(f"Set role failed for {user_id}: {e}")
            raise handle_supabase_error(e)

    async def deactivate_user(self, user_id: str) -> UserProfile:
        """
        Deactivate a user account.

        Args:
            user_id: User UUID

        Returns:
            Updated UserProfile
        """
        try:
            result = (
                self.service_client.schema("dashboard")
                .table("user_profiles")
                .update({"is_active": False})
                .eq("id", user_id)
                .execute()
            )

            if not result.data:
                raise AuthenticationError("User profile not found")

            logger.info(f"Deactivated user {user_id}")
            return UserProfile(**result.data[0])

        except Exception as e:
            logger.error(f"Deactivate user failed for {user_id}: {e}")
            raise handle_supabase_error(e)

    def is_owner(self, profile: UserProfile) -> bool:
        """Check if user has owner role."""
        return profile.role == "owner"

    def is_employee(self, profile: UserProfile) -> bool:
        """Check if user has employee role."""
        return profile.role == "employee"


# Singleton
_auth_service: Optional[AuthService] = None


def get_auth_service() -> AuthService:
    """Get the auth service singleton."""
    global _auth_service
    if _auth_service is None:
        _auth_service = AuthService()
    return _auth_service
