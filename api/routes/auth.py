"""
Apex Assistant - Authentication Routes

Simple authentication using environment variables for credentials.
"""

import os
import jwt
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

router = APIRouter()
security = HTTPBearer(auto_error=False)

# Get credentials from environment variables
AUTH_EMAIL = os.environ.get("AUTH_EMAIL", "admin@apex.local")
AUTH_PASSWORD = os.environ.get("AUTH_PASSWORD", "changeme")
AUTH_SECRET_KEY = os.environ.get("AUTH_SECRET_KEY", secrets.token_hex(32))
TOKEN_EXPIRE_HOURS = int(os.environ.get("TOKEN_EXPIRE_HOURS", "24"))


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    token: str
    email: str
    expires_at: str


class AuthStatus(BaseModel):
    authenticated: bool
    email: Optional[str] = None


def create_token(email: str) -> tuple[str, datetime]:
    """Create a JWT token for the user."""
    expires = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS)
    payload = {
        "sub": email,
        "exp": expires,
        "iat": datetime.now(timezone.utc),
    }
    token = jwt.encode(payload, AUTH_SECRET_KEY, algorithm="HS256")
    return token, expires


def verify_token(token: str) -> Optional[str]:
    """Verify a JWT token and return the email if valid."""
    try:
        payload = jwt.decode(token, AUTH_SECRET_KEY, algorithms=["HS256"])
        return payload.get("sub")
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[str]:
    """Get the current user from the authorization header."""
    if credentials is None:
        return None
    return verify_token(credentials.credentials)


async def require_auth(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> str:
    """Require authentication - raises 401 if not authenticated."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    email = verify_token(credentials.credentials)
    if email is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return email


@router.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """
    Login with email and password.

    Returns a JWT token if credentials are valid.
    """
    if request.email != AUTH_EMAIL or request.password != AUTH_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token, expires = create_token(request.email)

    return LoginResponse(
        token=token,
        email=request.email,
        expires_at=expires.isoformat(),
    )


@router.get("/auth/status", response_model=AuthStatus)
async def auth_status(email: Optional[str] = Depends(get_current_user)):
    """Check authentication status."""
    return AuthStatus(
        authenticated=email is not None,
        email=email,
    )


@router.post("/auth/logout")
async def logout():
    """
    Logout - client should clear the token.

    This endpoint is mainly for logging purposes.
    """
    return {"status": "ok", "message": "Logged out"}


@router.get("/auth/verify")
async def verify(email: str = Depends(require_auth)):
    """Verify that the current token is valid."""
    return {"authenticated": True, "email": email}
