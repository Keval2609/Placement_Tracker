# syntax=docker/dockerfile:1

# ---- Stage 1: build wheels for dependencies ----
FROM python:3.12-slim AS builder

WORKDIR /build

ENV PIP_DEFAULT_TIMEOUT=100 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

# Copy project metadata and app code to build wheels.
COPY pyproject.toml ./
COPY app ./app

# Resolve dependencies and build wheels into /wheels.
RUN pip wheel --wheel-dir /wheels --default-timeout=100 --retries 5 .

# ---- Stage 2: runtime ----
FROM python:3.12-slim AS runtime

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Install prebuilt wheels (no build toolchain in the final image).
COPY --from=builder /wheels /wheels
RUN pip install --no-cache-dir /wheels/* && \
    rm -rf /wheels

# Application code.
COPY app ./app

# Run as a non-root user.
RUN useradd --create-home --uid 1000 appuser
USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
