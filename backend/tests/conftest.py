import pytest
from app.main import app
from app.dependencies import get_current_user_id, DEFAULT_MOCK_USER_ID

async def mock_get_current_user_id() -> str:
    return DEFAULT_MOCK_USER_ID

@pytest.fixture(autouse=True)
def override_auth():
    """Automatically mock the Clerk JWT authentication for all endpoints during tests."""
    app.dependency_overrides[get_current_user_id] = mock_get_current_user_id
    yield
    app.dependency_overrides.clear()
