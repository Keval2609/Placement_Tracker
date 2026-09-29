import pytest

from app.dependencies import DEFAULT_MOCK_USER_ID, get_current_user_id
from app.main import app


async def mock_get_current_user_id() -> str:
    return DEFAULT_MOCK_USER_ID

@pytest.fixture(autouse=True)
def override_auth():
    """Automatically mock the Clerk JWT authentication for all endpoints during tests."""
    app.dependency_overrides[get_current_user_id] = mock_get_current_user_id
    yield
    app.dependency_overrides.clear()
