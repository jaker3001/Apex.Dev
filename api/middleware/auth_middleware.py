"""
Authentication middleware for Supabase JWT tokens.

Provides dependency injection functions for route protection.
"""
from typing import Optional, Dict, Any
from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from api.services.auth_service import AuthService
from api.services.supabase_errors import AuthenticationError
import logging

logger = logging.getLogger("apex_assistant.middleware.auth")

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict[str, Any]:
    """
    Get current user from JWT token.

    Args:
        credentials: HTTP Bearer token credentials

    Returns:
        Dict with user info (id, email, role, metadata)

    Raises:
        HTTPException 401 if token is invalid
    """
    try:
        token = credentials.credentials
        auth_service = AuthService()
        user = await auth_service.get_user_from_token(token)

        if not user:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token"
            )

        return user

    except AuthenticationError as e:
        logger.warning(f"Authentication failed: {e}")
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error in get_current_user: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")


async def require_auth(
    user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Require authentication.

    Simple wrapper around get_current_user for explicit route protection.

    Args:
        user: Current user from get_current_user

    Returns:
        User dict

    Raises:
        HTTPException 401 if not authenticated
    """
    return user


async def require_role(
    required_role: str,
    user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Require specific role for access.

    Args:
        required_role: Required role (admin, manager, employee)
        user: Current user from get_current_user

    Returns:
        User dict

    Raises:
        HTTPException 403 if user lacks required role
    """
    user_role = user.get("role", "employee")

    # Role hierarchy
    role_hierarchy = {
        "admin": 3,
        "manager": 2,
        "employee": 1,
    }

    user_level = role_hierarchy.get(user_role, 0)
    required_level = role_hierarchy.get(required_role, 0)

    if user_level < required_level:
        logger.warning(
            f"Access denied: User {user.get('id')} (role: {user_role}) "
            f"attempted to access resource requiring {required_role}"
        )
        raise HTTPException(
            status_code=403,
            detail=f"This action requires {required_role} role"
        )

    return user


def create_role_dependency(required_role: str):
    """
    Create a role dependency for use in route decorators.

    Args:
        required_role: Required role (admin, manager, employee)

    Returns:
        Dependency function

    Example:
        @router.post("/projects")
        async def create_project(
            project: ProjectCreate,
            user = Depends(create_role_dependency("manager"))
        ):
            ...
    """
    async def role_dependency(
        user: Dict[str, Any] = Depends(get_current_user)
    ) -> Dict[str, Any]:
        return await require_role(required_role, user)

    return role_dependency


# Pre-built role dependencies for convenience
require_admin = create_role_dependency("admin")
require_manager = create_role_dependency("manager")
require_employee = create_role_dependency("employee")


async def get_optional_user(request: Request) -> Optional[Dict[str, Any]]:
    """
    Get current user if authenticated, None otherwise.

    Useful for routes that work differently for authenticated users
    but don't require authentication.

    Args:
        request: FastAPI request

    Returns:
        User dict or None
    """
    try:
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None

        token = auth_header.replace("Bearer ", "")
        auth_service = AuthService()
        user = await auth_service.get_user_from_token(token)

        return user

    except Exception:
        return None
