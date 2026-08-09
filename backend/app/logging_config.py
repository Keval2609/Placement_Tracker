"""Centralized structured JSON logging configuration."""

import json
import logging
import sys
from datetime import UTC, datetime
from typing import Any


class JsonFormatter(logging.Formatter):
    """Custom logging formatter that outputs log records as JSON lines."""

    def format(self, record: logging.LogRecord) -> str:
        log_object: dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(record.created, tz=UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        if record.exc_info:
            log_object["exception"] = self.formatException(record.exc_info)

        # Include any extra attributes attached to the log record
        standard_attrs = {
            "name", "msg", "args", "levelname", "levelno", "pathname", "filename",
            "module", "exc_info", "exc_text", "stack_info", "lineno", "funcName",
            "created", "msecs", "relativeCreated", "thread", "threadName",
            "processName", "process", "taskName",
        }
        extra_attrs = {
            k: v for k, v in record.__dict__.items()
            if k not in standard_attrs and not k.startswith("_")
        }
        if extra_attrs:
            log_object.update(extra_attrs)

        return json.dumps(log_object)


def setup_logging(level: int = logging.INFO) -> None:
    """Configure root logger and standard library loggers to output JSON."""
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())

    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    # Clear existing handlers to prevent duplicate outputs
    root_logger.handlers.clear()
    root_logger.addHandler(handler)

    # Set specific third-party logger levels to avoid noise
    logging.getLogger("uvicorn.access").handlers.clear()
    logging.getLogger("uvicorn.access").addHandler(handler)
    logging.getLogger("uvicorn.error").handlers.clear()
    logging.getLogger("uvicorn.error").addHandler(handler)
