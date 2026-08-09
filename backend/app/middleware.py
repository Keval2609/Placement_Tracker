"""ASGI Request Logging Middleware emitting structured JSON log records."""

import logging
import time
from collections.abc import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("app.request")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log request method, path, status_code, latency_ms, and user_id."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.perf_counter()

        # Extract user_id from headers if available
        user_id = request.headers.get("x-user-id")
        if not user_id and "authorization" in request.headers:
            auth = request.headers.get("authorization", "")
            if auth.startswith("Bearer ") and len(auth) > 10:
                user_id = "authenticated_user"

        try:
            response = await call_next(request)
            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

            log_data = {
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "latency_ms": latency_ms,
                "user_id": user_id or "anonymous",
            }

            if response.status_code >= 500:
                logger.error("HTTP Request Failed", extra=log_data)
            elif response.status_code >= 400:
                logger.warning("HTTP Request Client Error", extra=log_data)
            else:
                logger.info("HTTP Request Handled", extra=log_data)

            return response
        except Exception as exc:
            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
            log_data = {
                "method": request.method,
                "path": request.url.path,
                "status_code": 500,
                "latency_ms": latency_ms,
                "user_id": user_id or "anonymous",
            }
            logger.exception("HTTP Request Unhandled Exception", extra=log_data)
            raise exc
