"""
Role-Based Access Control (RBAC) middleware.

Provides route-level access control based on user roles.
"""
from typing import Dict, Any, List, Optional
from fastapi import HTTPException
from enum import Enum
import logging

logger = logging.getLogger("apex_assistant.middleware.rbac")


class Role(str, Enum):
    """User role enumeration."""
    ADMIN = "admin"
    MANAGER = "manager"
    EMPLOYEE = "employee"


class Permission(str, Enum):
    """Permission enumeration."""
    # Job permissions
    JOB_VIEW = "job:view"
    JOB_CREATE = "job:create"
    JOB_UPDATE = "job:update"
    JOB_DELETE = "job:delete"

    # Client permissions
    CLIENT_VIEW = "client:view"
    CLIENT_CREATE = "client:create"
    CLIENT_UPDATE = "client:update"
    CLIENT_DELETE = "client:delete"

    # Financial permissions
    ESTIMATE_VIEW = "estimate:view"
    ESTIMATE_CREATE = "estimate:create"
    ESTIMATE_UPDATE = "estimate:update"
    ESTIMATE_APPROVE = "estimate:approve"

    PAYMENT_VIEW = "payment:view"
    PAYMENT_CREATE = "payment:create"
    PAYMENT_UPDATE = "payment:update"

    # User management
    USER_VIEW = "user:view"
    USER_CREATE = "user:create"
    USER_UPDATE = "user:update"
    USER_DELETE = "user:delete"

    # Settings
    SETTINGS_VIEW = "settings:view"
    SETTINGS_UPDATE = "settings:update"


class RBACMiddleware:
    """
    RBAC middleware for enforcing permissions.

    Maps roles to permissions and provides enforcement logic.
    """

    # Role to permissions mapping
    ROLE_PERMISSIONS: Dict[Role, List[Permission]] = {
        Role.ADMIN: [
            # Admins have all permissions
            Permission.JOB_VIEW,
            Permission.JOB_CREATE,
            Permission.JOB_UPDATE,
            Permission.JOB_DELETE,
            Permission.CLIENT_VIEW,
            Permission.CLIENT_CREATE,
            Permission.CLIENT_UPDATE,
            Permission.CLIENT_DELETE,
            Permission.ESTIMATE_VIEW,
            Permission.ESTIMATE_CREATE,
            Permission.ESTIMATE_UPDATE,
            Permission.ESTIMATE_APPROVE,
            Permission.PAYMENT_VIEW,
            Permission.PAYMENT_CREATE,
            Permission.PAYMENT_UPDATE,
            Permission.USER_VIEW,
            Permission.USER_CREATE,
            Permission.USER_UPDATE,
            Permission.USER_DELETE,
            Permission.SETTINGS_VIEW,
            Permission.SETTINGS_UPDATE,
        ],
        Role.MANAGER: [
            # Managers can do most things except user management
            Permission.JOB_VIEW,
            Permission.JOB_CREATE,
            Permission.JOB_UPDATE,
            Permission.CLIENT_VIEW,
            Permission.CLIENT_CREATE,
            Permission.CLIENT_UPDATE,
            Permission.ESTIMATE_VIEW,
            Permission.ESTIMATE_CREATE,
            Permission.ESTIMATE_UPDATE,
            Permission.ESTIMATE_APPROVE,
            Permission.PAYMENT_VIEW,
            Permission.PAYMENT_CREATE,
            Permission.PAYMENT_UPDATE,
            Permission.USER_VIEW,
            Permission.SETTINGS_VIEW,
        ],
        Role.EMPLOYEE: [
            # Employees can view and create but not delete
            Permission.JOB_VIEW,
            Permission.CLIENT_VIEW,
            Permission.ESTIMATE_VIEW,
            Permission.PAYMENT_VIEW,
        ],
    }

    @classmethod
    def has_permission(
        cls,
        user: Dict[str, Any],
        permission: Permission,
    ) -> bool:
        """
        Check if user has a specific permission.

        Args:
            user: User dict with role
            permission: Required permission

        Returns:
            True if user has permission
        """
        user_role = user.get("role", "employee")

        try:
            role = Role(user_role)
        except ValueError:
            logger.warning(f"Invalid role: {user_role}")
            return False

        permissions = cls.ROLE_PERMISSIONS.get(role, [])
        return permission in permissions

    @classmethod
    def require_permission(
        cls,
        user: Dict[str, Any],
        permission: Permission,
    ) -> None:
        """
        Require user to have specific permission.

        Args:
            user: User dict with role
            permission: Required permission

        Raises:
            HTTPException 403 if user lacks permission
        """
        if not cls.has_permission(user, permission):
            logger.warning(
                f"Permission denied: User {user.get('id')} "
                f"(role: {user.get('role')}) lacks {permission}"
            )
            raise HTTPException(
                status_code=403,
                detail=f"You do not have permission to {permission.value}"
            )

    @classmethod
    def require_any_permission(
        cls,
        user: Dict[str, Any],
        permissions: List[Permission],
    ) -> None:
        """
        Require user to have at least one of the specified permissions.

        Args:
            user: User dict with role
            permissions: List of acceptable permissions

        Raises:
            HTTPException 403 if user lacks all permissions
        """
        has_any = any(cls.has_permission(user, perm) for perm in permissions)

        if not has_any:
            logger.warning(
                f"Permission denied: User {user.get('id')} lacks any of {permissions}"
            )
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to perform this action"
            )

    @classmethod
    def get_user_permissions(cls, user: Dict[str, Any]) -> List[Permission]:
        """
        Get all permissions for a user.

        Args:
            user: User dict with role

        Returns:
            List of permissions
        """
        user_role = user.get("role", "employee")

        try:
            role = Role(user_role)
        except ValueError:
            return []

        return cls.ROLE_PERMISSIONS.get(role, [])


def require_permission(permission: Permission):
    """
    Create a dependency for requiring specific permission.

    Args:
        permission: Required permission

    Returns:
        Dependency function

    Example:
        @router.delete("/jobs/{job_id}")
        async def delete_job(
            job_id: int,
            user = Depends(require_auth),
            _ = Depends(require_permission(Permission.JOB_DELETE))
        ):
            ...
    """
    def permission_dependency(user: Dict[str, Any]) -> None:
        RBACMiddleware.require_permission(user, permission)

    return permission_dependency
