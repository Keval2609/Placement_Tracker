"""ASGI Request Logging Middleware emitting structured JSON log records."""

import logging
import time
from typing import Any

logger = logging.getLogger("app.request")


class RequestLoggingMiddleware:
    """Pure ASGI Middleware to log request method, path, status_code, latency_ms, and user_id.

    Avoids BaseHTTPMiddleware issues with event loops and streaming transports.
    """

    def __init__(self, app: Any) -> None:
        self.app = app

    async def __call__(self, scope: dict[str, Any], receive: Any, send: Any) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        start_time = time.perf_counter()

        # Extract user_id from headers
        headers_list = scope.get("headers", [])
        user_id = ""
        for raw_k, raw_v in headers_list:
            if raw_k.lower() == b"x-user-id":
                user_id = raw_v.decode("latin1", errors="replace")
                break
            elif raw_k.lower() == b"authorization":
                auth_str = raw_v.decode("latin1", errors="replace")
                if auth_str.startswith("Bearer ") and len(auth_str) > 10:
                    user_id = "authenticated_user"

        status_code = 200

        async def send_wrapper(message: dict[str, Any]) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message.get("status", 200)
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
            log_data = {
                "method": scope.get("method"),
                "path": scope.get("path"),
                "status_code": status_code,
                "latency_ms": latency_ms,
                "user_id": user_id or "anonymous",
            }
            if status_code >= 500:
                logger.error("HTTP Request Failed", extra=log_data)
            elif status_code >= 400:
                logger.warning("HTTP Request Client Error", extra=log_data)
            else:
                logger.info("HTTP Request Handled", extra=log_data)
        except Exception:
            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
            log_data = {
                "method": scope.get("method"),
                "path": scope.get("path"),
                "status_code": 500,
                "latency_ms": latency_ms,
                "user_id": user_id or "anonymous",
            }
            logger.exception("HTTP Request Unhandled Exception", extra=log_data)
            raise
