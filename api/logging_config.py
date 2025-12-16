"""
Apex Assistant - Centralized Logging Configuration

Provides structured logging for API requests, WebSocket events, model switches,
MCP connections, tool execution, and errors.
"""

import logging
import logging.handlers
import json
import sys
from pathlib import Path
from datetime import datetime
from typing import Optional, Any
from functools import wraps
import time

# Log directory setup
LOG_DIR = Path(__file__).parent.parent / "logs"
LOG_DIR.mkdir(exist_ok=True)

# Log format for file handlers
FILE_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
CONSOLE_FORMAT = "%(asctime)s | %(levelname)-8s | %(message)s"

# JSON formatter for structured logging
class JSONFormatter(logging.Formatter):
    """Format log records as JSON for easy parsing."""

    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Add extra fields if present
        if hasattr(record, "session_id"):
            log_entry["session_id"] = record.session_id
        if hasattr(record, "conversation_id"):
            log_entry["conversation_id"] = record.conversation_id
        if hasattr(record, "data"):
            log_entry["data"] = record.data
        if hasattr(record, "duration_ms"):
            log_entry["duration_ms"] = record.duration_ms

        # Add exception info if present
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_entry)


def setup_logger(
    name: str,
    log_file: Optional[str] = None,
    level: int = logging.INFO,
    use_json: bool = False,
) -> logging.Logger:
    """
    Set up a logger with console and optional file handler.

    Args:
        name: Logger name
        log_file: Optional log file path (relative to LOG_DIR)
        level: Logging level
        use_json: Whether to use JSON formatting for file output

    Returns:
        Configured logger
    """
    logger = logging.getLogger(name)
    logger.setLevel(level)

    # Prevent duplicate handlers
    if logger.handlers:
        return logger

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    console_handler.setFormatter(logging.Formatter(CONSOLE_FORMAT))
    logger.addHandler(console_handler)

    # File handler (if specified)
    if log_file:
        file_path = LOG_DIR / log_file
        file_handler = logging.handlers.RotatingFileHandler(
            file_path,
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=5,
        )
        file_handler.setLevel(level)

        if use_json:
            file_handler.setFormatter(JSONFormatter())
        else:
            file_handler.setFormatter(logging.Formatter(FILE_FORMAT))

        logger.addHandler(file_handler)

    return logger


# Pre-configured loggers for different concerns
api_logger = setup_logger("apex.api", "api.log", use_json=True)
websocket_logger = setup_logger("apex.websocket", "websocket.log", use_json=True)
model_logger = setup_logger("apex.model", "models.log", use_json=True)
mcp_logger = setup_logger("apex.mcp", "mcp.log", use_json=True)
claude_logger = setup_logger("apex.claude", "claude.log", use_json=True)
tool_logger = setup_logger("apex.tool", "tools.log", use_json=True)
error_logger = setup_logger("apex.error", "errors.log", level=logging.WARNING, use_json=True)


class LogContext:
    """Context manager for adding extra fields to log records."""

    def __init__(
        self,
        logger: logging.Logger,
        session_id: Optional[str] = None,
        conversation_id: Optional[int] = None,
        **extra: Any,
    ):
        self.logger = logger
        self.extra = {
            "session_id": session_id,
            "conversation_id": conversation_id,
            **extra,
        }

    def info(self, msg: str, **kwargs: Any) -> None:
        extra = {**self.extra, **kwargs}
        self.logger.info(msg, extra={"data": extra})

    def warning(self, msg: str, **kwargs: Any) -> None:
        extra = {**self.extra, **kwargs}
        self.logger.warning(msg, extra={"data": extra})

    def error(self, msg: str, exc_info: bool = False, **kwargs: Any) -> None:
        extra = {**self.extra, **kwargs}
        self.logger.error(msg, exc_info=exc_info, extra={"data": extra})

    def debug(self, msg: str, **kwargs: Any) -> None:
        extra = {**self.extra, **kwargs}
        self.logger.debug(msg, extra={"data": extra})


def log_api_request(func):
    """Decorator to log API request timing and status."""

    @wraps(func)
    async def wrapper(*args, **kwargs):
        start_time = time.time()
        try:
            result = await func(*args, **kwargs)
            duration_ms = (time.time() - start_time) * 1000
            api_logger.info(
                f"{func.__name__} completed",
                extra={
                    "data": {
                        "function": func.__name__,
                        "duration_ms": round(duration_ms, 2),
                        "status": "success",
                    }
                },
            )
            return result
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            api_logger.error(
                f"{func.__name__} failed: {str(e)}",
                exc_info=True,
                extra={
                    "data": {
                        "function": func.__name__,
                        "duration_ms": round(duration_ms, 2),
                        "status": "error",
                        "error": str(e),
                    }
                },
            )
            raise

    return wrapper


# Convenience functions for common log patterns
def log_websocket_event(
    event_type: str,
    session_id: str,
    conversation_id: Optional[int] = None,
    **data: Any,
) -> None:
    """Log a WebSocket event."""
    websocket_logger.info(
        f"WebSocket {event_type}",
        extra={
            "session_id": session_id,
            "conversation_id": conversation_id,
            "data": {"event_type": event_type, **data},
        },
    )


def log_model_switch(
    session_id: str,
    conversation_id: Optional[int],
    from_model: str,
    to_model: str,
) -> None:
    """Log a model switch event."""
    model_logger.info(
        f"Model switch: {from_model} -> {to_model}",
        extra={
            "session_id": session_id,
            "conversation_id": conversation_id,
            "data": {
                "from_model": from_model,
                "to_model": to_model,
            },
        },
    )


def log_mcp_event(
    event_type: str,
    server_name: str,
    **data: Any,
) -> None:
    """Log an MCP server event."""
    mcp_logger.info(
        f"MCP {event_type}: {server_name}",
        extra={
            "data": {
                "event_type": event_type,
                "server_name": server_name,
                **data,
            },
        },
    )


def log_tool_execution(
    tool_name: str,
    session_id: Optional[str] = None,
    conversation_id: Optional[int] = None,
    duration_ms: Optional[float] = None,
    status: str = "completed",
    **data: Any,
) -> None:
    """Log a tool execution event."""
    tool_logger.info(
        f"Tool {tool_name}: {status}",
        extra={
            "session_id": session_id,
            "conversation_id": conversation_id,
            "data": {
                "tool_name": tool_name,
                "status": status,
                "duration_ms": duration_ms,
                **data,
            },
        },
    )


def log_claude_call(
    model: str,
    session_id: Optional[str] = None,
    conversation_id: Optional[int] = None,
    tokens_in: Optional[int] = None,
    tokens_out: Optional[int] = None,
    duration_ms: Optional[float] = None,
    **data: Any,
) -> None:
    """Log a Claude API call."""
    claude_logger.info(
        f"Claude call: {model}",
        extra={
            "session_id": session_id,
            "conversation_id": conversation_id,
            "data": {
                "model": model,
                "tokens_in": tokens_in,
                "tokens_out": tokens_out,
                "duration_ms": duration_ms,
                **data,
            },
        },
    )
