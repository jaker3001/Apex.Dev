"""
Apex Assistant - Authentication Routes

Database-backed multi-user authentication with bcrypt password hashing.
"""

import os
import jwt
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

try:
    import bcrypt
    BCRYPT_AVAILABLE = True
except ImportError:
    BCRYPT_AVAILABLE = False

from database.schema import get_connection

router = APIRouter()
security = HTTPBearer(auto_error=False)

AUTH_SECRET_KEY = os.environ.get("AUTH_SECRET_KEY", secrets.token_hex(32))
TOKEN_EXPIRE_HOURS = int(os.environ.get("TOKEN_EXPIRE_HOURS", "24"))


class LoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    display_name: str
    role: str
    is_active: bool
    contact_id: Optional[int] = None
    created_at: Optional[str] = None
    last_login: Optional[str] = None


class LoginResponse(BaseModel):
    token: str
    user: UserResponse
    expires_at: str


class AuthStatus(BaseModel):
    authenticated: bool
    user: Optional[UserResponse] = None


class RegisterRequest(BaseModel):
    email: str
    password: str
    display_name: str
    role: str = "employee"
    contact_id: Optional[int] = None


def hash_password(password: str) -> str:
    if BCRYPT_AVAILABLE:
        return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str, password_hash: str) -> bool:
    if BCRYPT_AVAILABLE:
        try:
            return bcrypt.checkpw(password.encode(), password_hash.encode())
        except ValueError:
            return hashlib.sha256(password.encode()).hexdigest() == password_hash
    return hashlib.sha256(password.encode()).hexdigest() == password_hash


def create_token(user_id: int, email: str) -> tuple[str, datetime]:
    expires = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS)
    payload = {"sub": str(user_id), "email": email, "exp": expires, "iat": datetime.now(timezone.utc)}
    token = jwt.encode(payload, AUTH_SECRET_KEY, algorithm="HS256")
    return token, expires


def verify_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, AUTH_SECRET_KEY, algorithms=["HS256"])
        return {"user_id": int(payload.get("sub")), "email": payload.get("email")}
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


def get_user_by_email(email: str) -> Optional[dict]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, email, password_hash, display_name, role, is_active, contact_id, created_at, last_login FROM users WHERE email = ?", (email,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def get_user_by_id(user_id: int) -> Optional[dict]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, email, password_hash, display_name, role, is_active, contact_id, created_at, last_login FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def create_user_db(email: str, password_hash: str, display_name: str, role: str = "employee", contact_id: Optional[int] = None) -> int:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO users (email, password_hash, display_name, role, contact_id) VALUES (?, ?, ?, ?, ?)", (email, password_hash, display_name, role, contact_id))
    user_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return user_id


def update_user_last_login(user_id: int) -> None:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()


def user_to_response(user: dict) -> UserResponse:
    return UserResponse(id=user["id"], email=user["email"], display_name=user["display_name"], role=user["role"], is_active=bool(user["is_active"]), contact_id=user.get("contact_id"), created_at=user.get("created_at"), last_login=user.get("last_login"))


async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[UserResponse]:
    if credentials is None:
        return None
    payload = verify_token(credentials.credentials)
    if payload is None:
        return None
    user = get_user_by_id(payload["user_id"])
    if user is None or not user["is_active"]:
        return None
    return user_to_response(user)


async def require_auth(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> UserResponse:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = verify_token(credentials.credentials)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = get_user_by_id(payload["user_id"])
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    if not user["is_active"]:
        raise HTTPException(status_code=401, detail="User account is disabled")
    return user_to_response(user)


async def require_admin(user: UserResponse = Depends(require_auth)) -> UserResponse:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    user = get_user_by_email(request.email)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user["is_active"]:
        raise HTTPException(status_code=401, detail="Account is disabled")
    if not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    update_user_last_login(user["id"])
    token, expires = create_token(user["id"], user["email"])
    return LoginResponse(token=token, user=user_to_response(user), expires_at=expires.isoformat())


@router.get("/auth/status", response_model=AuthStatus)
async def auth_status(user: Optional[UserResponse] = Depends(get_current_user)):
    return AuthStatus(authenticated=user is not None, user=user)


@router.post("/auth/logout")
async def logout():
    return {"status": "ok", "message": "Logged out"}


@router.get("/auth/verify")
async def verify(user: UserResponse = Depends(require_auth)):
    return {"authenticated": True, "user": user}


@router.post("/users", response_model=UserResponse)
async def create_user(request: RegisterRequest, admin: UserResponse = Depends(require_admin)):
    existing = get_user_by_email(request.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    if request.role not in ["admin", "manager", "employee"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    password_hash = hash_password(request.password)
    user_id = create_user_db(email=request.email, password_hash=password_hash, display_name=request.display_name, role=request.role, contact_id=request.contact_id)
    user = get_user_by_id(user_id)
    return user_to_response(user)
