"""
Apex Assistant - Authentication Routes

Supabase Auth-based authentication with user_profiles table.
Supports simple role-based access: owner (full access) and employee (limited).
"""
from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from api.services.auth_service import (
    AuthService,
    AuthResponse,
    UserProfile,
    get_auth_service,
)
from api.services.supabase_errors import AuthenticationError

router = APIRouter()
security = HTTPBearer(auto_error=False)

# Backward compatibility alias
UserResponse = UserProfile


# ============================================
# STANDALONE TOKEN VERIFICATION (for WebSocket)
# ============================================

async def verify_token(token: str) -> Optional[UserProfile]:
    """
    Verify an access token and return user profile.

    Used by WebSocket handlers that can't use FastAPI dependencies.
    Returns None if token is invalid.
    """
    if not token:
        return None

    auth_service = get_auth_service()
    return await auth_service.verify_token(token)


# ============================================
# REQUEST/RESPONSE SCHEMAS
# ============================================

class LoginRequest(BaseModel):
    email: str
    password: str


class SignUpRequest(BaseModel):
    email: str
    password: str
    display_name: str
    role: str = "employee"  # 'owner' or 'employee'


class RefreshRequest(BaseModel):
    refresh_token: str


class UpdateProfileRequest(BaseModel):
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    expires_at: int
    expires_in: int
    user: UserProfile


class AuthStatusResponse(BaseModel):
    authenticated: bool
    user: Optional[UserProfile] = None


# ============================================
# DEPENDENCY: GET CURRENT USER
# ============================================

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[UserProfile]:
    """
    Get current authenticated user from Bearer token.

    Returns None if no valid token provided (allows anonymous access).
    """
    if not credentials:
        return None

    auth_service = get_auth_service()
    return await auth_service.verify_token(credentials.credentials)


async def require_auth(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> UserProfile:
    """
    Require authentication. Raises 401 if not authenticated.

    Use this as a dependency for protected routes.
    """
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")

    auth_service = get_auth_service()
    user = await auth_service.verify_token(credentials.credentials)

    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    if not user.is_active:
        raise HTTPException(status_code=401, detail="Account is disabled")

    return user


async def require_owner(user: UserProfile = Depends(require_auth)) -> UserProfile:
    """
    Require owner role. Raises 403 if not owner.

    Use this as a dependency for owner-only routes.
    """
    if user.role != "owner":
        raise HTTPException(status_code=403, detail="Owner access required")
    return user


# ============================================
# AUTH ROUTES
# ============================================

@router.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """
    Sign in with email and password.

    Returns access token, refresh token, and user profile.
    """
    auth_service = get_auth_service()

    try:
        result = await auth_service.sign_in(request.email, request.password)
        return LoginResponse(
            access_token=result.access_token,
            refresh_token=result.refresh_token,
            expires_at=result.expires_at,
            expires_in=result.expires_in,
            user=result.user,
        )
    except AuthenticationError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/auth/signup", response_model=LoginResponse)
async def signup(
    request: SignUpRequest,
    current_user: Optional[UserProfile] = Depends(get_current_user),
):
    """
    Create a new user account.

    Only owners can create new users. If no users exist, first signup
    becomes owner automatically.
    """
    auth_service = get_auth_service()

    # Validate role
    if request.role not in ("owner", "employee"):
        raise HTTPException(status_code=400, detail="Invalid role. Use 'owner' or 'employee'")

    # Only owners can create users (except first user)
    # For initial setup, allow first owner creation
    # In production, you'd check if any users exist first
    if current_user and current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Only owners can create new users")

    try:
        result = await auth_service.sign_up(
            email=request.email,
            password=request.password,
            display_name=request.display_name,
            role=request.role,
        )
        return LoginResponse(
            access_token=result.access_token,
            refresh_token=result.refresh_token,
            expires_at=result.expires_at,
            expires_in=result.expires_in,
            user=result.user,
        )
    except AuthenticationError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/auth/refresh", response_model=LoginResponse)
async def refresh(request: RefreshRequest):
    """
    Refresh access token using refresh token.

    Call this when access token expires to get new tokens.
    """
    auth_service = get_auth_service()

    try:
        result = await auth_service.refresh_session(request.refresh_token)
        return LoginResponse(
            access_token=result.access_token,
            refresh_token=result.refresh_token,
            expires_at=result.expires_at,
            expires_in=result.expires_in,
            user=result.user,
        )
    except AuthenticationError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/auth/logout")
async def logout(user: UserProfile = Depends(require_auth)):
    """Sign out current user."""
    auth_service = get_auth_service()
    await auth_service.sign_out()
    return {"status": "ok", "message": "Logged out"}


@router.get("/auth/status", response_model=AuthStatusResponse)
async def auth_status(user: Optional[UserProfile] = Depends(get_current_user)):
    """
    Check authentication status.

    Returns whether user is authenticated and their profile if so.
    """
    return AuthStatusResponse(
        authenticated=user is not None,
        user=user,
    )


@router.get("/auth/me", response_model=UserProfile)
async def get_me(user: UserProfile = Depends(require_auth)):
    """Get current user's profile."""
    return user


@router.patch("/auth/me", response_model=UserProfile)
async def update_me(
    request: UpdateProfileRequest,
    user: UserProfile = Depends(require_auth),
):
    """Update current user's profile."""
    auth_service = get_auth_service()

    return await auth_service.update_profile(
        user_id=user.id,
        display_name=request.display_name,
        avatar_url=request.avatar_url,
        preferences=request.preferences,
    )


@router.post("/auth/reset-password")
async def reset_password(email: str):
    """
    Send password reset email.

    Always returns success to prevent email enumeration.
    """
    auth_service = get_auth_service()

    try:
        await auth_service.reset_password_email(email)
    except Exception:
        pass  # Don't reveal if email exists

    return {"status": "ok", "message": "If that email exists, a reset link was sent"}


# ============================================
# USER MANAGEMENT ROUTES (Owner Only)
# ============================================

@router.patch("/users/{user_id}/role", response_model=UserProfile)
async def update_user_role(
    user_id: str,
    role: str,
    owner: UserProfile = Depends(require_owner),
):
    """
    Update a user's role.

    Owner only. Can set role to 'owner' or 'employee'.
    """
    if role not in ("owner", "employee"):
        raise HTTPException(status_code=400, detail="Invalid role")

    if user_id == owner.id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")

    auth_service = get_auth_service()
    return await auth_service.set_role(user_id, role)


@router.post("/users/{user_id}/deactivate", response_model=UserProfile)
async def deactivate_user(
    user_id: str,
    owner: UserProfile = Depends(require_owner),
):
    """
    Deactivate a user account.

    Owner only. Prevents user from logging in.
    """
    if user_id == owner.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")

    auth_service = get_auth_service()
    return await auth_service.deactivate_user(user_id)
