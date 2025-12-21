"""
Custom exceptions for Supabase operations.

This module defines a hierarchy of exceptions for handling
Supabase-specific errors consistently across the application.
"""
from typing import Optional


class SupabaseError(Exception):
    """Base exception for Supabase operations."""
    pass


class AuthenticationError(SupabaseError):
    """Raised when authentication fails."""
    pass


class AuthorizationError(SupabaseError):
    """Raised when user lacks permissions (RLS violation)."""
    pass


class ResourceNotFoundError(SupabaseError):
    """Raised when a requested resource doesn't exist."""

    def __init__(self, resource_type: str, resource_id: any):
        self.resource_type = resource_type
        self.resource_id = resource_id
        super().__init__(f"{resource_type} with ID {resource_id} not found")


class ValidationError(SupabaseError):
    """Raised when data validation fails."""

    def __init__(self, message: str, field: Optional[str] = None):
        self.field = field
        super().__init__(message)


class DatabaseError(SupabaseError):
    """Raised when a database operation fails."""
    pass


class CrossSchemaValidationError(SupabaseError):
    """Raised when cross-schema reference validation fails."""

    def __init__(self, source_schema: str, target_schema: str, message: str):
        self.source_schema = source_schema
        self.target_schema = target_schema
        super().__init__(
            f"Cross-schema validation failed ({source_schema} → {target_schema}): {message}"
        )


def handle_supabase_error(error: Exception) -> SupabaseError:
    """
    Convert Supabase errors to custom exceptions.

    Args:
        error: Exception from Supabase client

    Returns:
        Custom SupabaseError subclass
    """
    error_msg = str(error).lower()

    if "authentication" in error_msg or "jwt" in error_msg:
        return AuthenticationError(str(error))

    if "authorization" in error_msg or "rls" in error_msg or "policy" in error_msg:
        return AuthorizationError(str(error))

    if "not found" in error_msg or "no rows" in error_msg:
        return ResourceNotFoundError("Resource", "unknown")

    if "violates" in error_msg or "constraint" in error_msg:
        return ValidationError(str(error))

    return DatabaseError(str(error))
