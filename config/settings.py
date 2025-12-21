"""
Application settings and feature flags.

Centralizes configuration management from environment variables.
"""
import os
from typing import Optional
from pathlib import Path


class Settings:
    """Application settings loaded from environment variables."""

    def __init__(self):
        # API Keys
        self.ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")

        # Supabase Configuration
        self.SUPABASE_URL: Optional[str] = os.getenv("SUPABASE_URL")
        self.SUPABASE_ANON_KEY: Optional[str] = os.getenv("SUPABASE_ANON_KEY")
        self.SUPABASE_SERVICE_ROLE_KEY: Optional[str] = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        # Connection Pool
        self.SUPABASE_POOL_SIZE: int = int(os.getenv("SUPABASE_POOL_SIZE", "10"))
        self.SUPABASE_MAX_OVERFLOW: int = int(os.getenv("SUPABASE_MAX_OVERFLOW", "5"))
        self.SUPABASE_POOL_TIMEOUT: int = int(os.getenv("SUPABASE_POOL_TIMEOUT", "30"))

        # Retry Configuration
        self.SUPABASE_MAX_RETRIES: int = int(os.getenv("SUPABASE_MAX_RETRIES", "3"))
        self.SUPABASE_RETRY_DELAY: float = float(os.getenv("SUPABASE_RETRY_DELAY", "1.0"))

        # Application
        self.ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
        self.LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

        # Legacy Database Paths
        self.DATABASE_PATH: Path = Path(os.getenv("DATABASE_PATH", "apex_assistant.db"))
        self.OPERATIONS_DATABASE_PATH: Path = Path(
            os.getenv("OPERATIONS_DATABASE_PATH", "apex_operations.db")
        )

        # Observability
        self.SENTRY_DSN: Optional[str] = os.getenv("SENTRY_DSN")

    @property
    def is_production(self) -> bool:
        """Check if running in production."""
        return self.ENVIRONMENT == "production"

    @property
    def is_development(self) -> bool:
        """Check if running in development."""
        return self.ENVIRONMENT == "development"


class FeatureFlags:
    """
    Feature flags for gradual migration to Supabase.

    Each flag controls whether a specific feature uses Supabase
    or the legacy SQLite database.
    """

    USE_SUPABASE_CHAT: bool = os.getenv("USE_SUPABASE_CHAT", "false").lower() == "true"
    USE_SUPABASE_BUSINESS: bool = os.getenv("USE_SUPABASE_BUSINESS", "false").lower() == "true"
    USE_SUPABASE_DASHBOARD: bool = os.getenv("USE_SUPABASE_DASHBOARD", "false").lower() == "true"

    @classmethod
    def is_supabase_enabled(cls) -> bool:
        """
        Check if any Supabase feature is enabled.

        Returns:
            True if at least one Supabase feature flag is enabled
        """
        return (
            cls.USE_SUPABASE_CHAT or
            cls.USE_SUPABASE_BUSINESS or
            cls.USE_SUPABASE_DASHBOARD
        )

    @classmethod
    def get_enabled_features(cls) -> list[str]:
        """
        Get list of enabled Supabase features.

        Returns:
            List of feature names that are enabled
        """
        features = []
        if cls.USE_SUPABASE_CHAT:
            features.append("chat")
        if cls.USE_SUPABASE_BUSINESS:
            features.append("business")
        if cls.USE_SUPABASE_DASHBOARD:
            features.append("dashboard")
        return features

    @classmethod
    def validate_configuration(cls) -> None:
        """
        Validate that required configuration is present when features are enabled.

        Raises:
            ValueError if Supabase is enabled but configuration is missing
        """
        if cls.is_supabase_enabled():
            if not os.getenv("SUPABASE_URL") or not os.getenv("SUPABASE_ANON_KEY"):
                raise ValueError(
                    "SUPABASE_URL and SUPABASE_ANON_KEY must be set when Supabase features are enabled"
                )


# Global settings instance
settings = Settings()

# Validate configuration on import
FeatureFlags.validate_configuration()


def get_settings() -> Settings:
    """
    Get settings instance.

    Returns:
        Settings singleton
    """
    return settings


def get_feature_flags() -> type[FeatureFlags]:
    """
    Get feature flags class.

    Returns:
        FeatureFlags class
    """
    return FeatureFlags
