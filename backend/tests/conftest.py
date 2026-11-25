import os

os.environ["SENTRY_DSN"] = ""
os.environ["TESTING"] = "1"
os.environ["SUPABASE_URL"] = ""
os.environ["SUPABASE_SERVICE_ROLE_KEY"] = ""
os.environ["SUPABASE_ANON_KEY"] = ""
os.environ["GROQ_API_KEY"] = ""

from app.config import get_settings

get_settings.cache_clear()

import pytest  # noqa: E402

from app.dependencies import DEFAULT_MOCK_USER_ID, get_current_user_id  # noqa: E402
from app.main import app  # noqa: E402


async def mock_get_current_user_id() -> str:
    return DEFAULT_MOCK_USER_ID

@pytest.fixture(autouse=True)
def override_auth():
    """Automatically mock the Clerk JWT authentication for all endpoints during tests."""
    app.dependency_overrides[get_current_user_id] = mock_get_current_user_id
    yield
    app.dependency_overrides.clear()
