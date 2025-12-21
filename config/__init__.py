"""
Apex Assistant - Configuration Module
"""

from .system_prompt import APEX_SYSTEM_PROMPT
from .settings import settings, FeatureFlags, get_settings, get_feature_flags

__all__ = [
    "APEX_SYSTEM_PROMPT",
    "settings",
    "FeatureFlags",
    "get_settings",
    "get_feature_flags",
]
