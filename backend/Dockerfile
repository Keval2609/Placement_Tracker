# syntax=docker/dockerfile:1

# ---- Stage 1: build wheels for dependencies ----
FROM python:3.12-slim AS builder

WORKDIR /build

# Copy only project metadata first for better layer caching.
COPY pyproject.toml ./

# Resolve dependencies and build wheels into /wheels.
RUN pip install --upgrade pip build && \
    pip wheel --wheel-dir /wheels \
        fastapi \
        "uvicorn[standard]" \
        pydantic-settings \
        supabase

# ---- Stage 2: runtime ----
FROM python:3.12-slim AS runtime

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Install prebuilt wheels (no build toolchain in the final image).
COPY --from=builder /wheels /wheels
RUN pip install --no-cache-dir --no-index --find-links=/wheels \
        fastapi \
        "uvicorn[standard]" \
        pydantic-settings \
        supabase && \
    rm -rf /wheels

# Application code.
COPY app ./app

# Run as a non-root user.
RUN useradd --create-home --uid 1000 appuser
USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
