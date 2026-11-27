import json

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException
from starlette.requests import Request

from app import dependencies
from app.config import Settings
from app.dependencies import StaticJWKClient, get_current_user_id


def _dummy_request() -> Request:
    return Request({"type": "http", "headers": []})


@pytest.fixture(autouse=True)
def token_settings(monkeypatch):
    monkeypatch.setattr(dependencies, "get_settings", lambda: Settings(
        _env_file=None, clerk_issuer="clerk",
        clerk_authorized_parties="http://localhost:5173",
    ))


@pytest.fixture
def rsa_key_pair():
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    jwk = json.loads(jwt.algorithms.RSAAlgorithm.to_jwk(private_key.public_key()))
    jwk["kid"] = "test-kid-1"
    return private_key, jwk


def test_static_jwk_client_resolution(rsa_key_pair):
    private_key, jwk = rsa_key_pair
    client = StaticJWKClient({"keys": [jwk]})

    token = jwt.encode(
        {"sub": "user_123"},
        private_key,
        algorithm="RS256",
        headers={"kid": "test-kid-1"},
    )
    key = client.get_signing_key_from_jwt(token)
    assert key.key_id == "test-kid-1"

    token_bad = jwt.encode(
        {"sub": "user_123"},
        private_key,
        algorithm="RS256",
        headers={"kid": "unknown-kid"},
    )
    with pytest.raises(jwt.PyJWKClientError):
        client.get_signing_key_from_jwt(token_bad)


def test_get_current_user_id_success(rsa_key_pair):
    private_key, jwk = rsa_key_pair
    dependencies._jwk_client = StaticJWKClient({"keys": [jwk]})

    token = jwt.encode(
        {"sub": "user_abc_456", "iss": "clerk"},
        private_key,
        algorithm="RS256",
        headers={"kid": "test-kid-1"},
    )
    req = _dummy_request()
    user_id = get_current_user_id(request=req, authorization=f"Bearer {token}")
    assert user_id == "user_abc_456"
    assert req.state.user_id == "user_abc_456"


def test_get_current_user_id_missing_auth():
    with pytest.raises(HTTPException) as exc:
        get_current_user_id(request=_dummy_request(), authorization=None)
    assert exc.value.status_code == 401
    assert "Missing Authorization Bearer token" in exc.value.detail


def test_get_current_user_id_missing_sub_claim(rsa_key_pair):
    private_key, jwk = rsa_key_pair
    dependencies._jwk_client = StaticJWKClient({"keys": [jwk]})

    token = jwt.encode(
        {"iss": "clerk"},
        private_key,
        algorithm="RS256",
        headers={"kid": "test-kid-1"},
    )
    with pytest.raises(HTTPException) as exc:
        get_current_user_id(request=_dummy_request(), authorization=f"Bearer {token}")
    assert exc.value.status_code == 401
    assert "sub" in exc.value.detail


@pytest.mark.parametrize("claims,accepted", [
    ({"iss": "clerk", "azp": "http://localhost:5173"}, True),
    ({"iss": "clerk", "azp": "https://evil.example"}, False),
    ({"iss": "other"}, False),
    ({}, False),
    ({"iss": "clerk", "azp": None}, False),
])
def test_token_binding(rsa_key_pair, claims, accepted):
    private_key, jwk = rsa_key_pair
    dependencies._jwk_client = StaticJWKClient({"keys": [jwk]})
    token = jwt.encode({"sub": "user_123", **claims}, private_key,
                       algorithm="RS256", headers={"kid": "test-kid-1"})
    if accepted:
        assert get_current_user_id(_dummy_request(), f"Bearer {token}") == "user_123"
    else:
        with pytest.raises(HTTPException) as exc:
            get_current_user_id(_dummy_request(), f"Bearer {token}")
        assert exc.value.status_code == 401


@pytest.mark.parametrize("provider,key,valid", [
    ("groq", "", False), ("groq", "dummy", True), ("ollama", "", True),
])
def test_provider_startup_guard(monkeypatch, provider, key, valid):
    monkeypatch.delenv("TESTING", raising=False)
    monkeypatch.setattr(dependencies, "get_settings", lambda: Settings(
        _env_file=None, supabase_url="https://example.test", supabase_service_role_key="dummy",
        vapid_public_key="dummy", vapid_private_key="dummy", clerk_issuer="clerk",
        clerk_authorized_parties="http://localhost:5173", llm_provider=provider, groq_api_key=key,
    ))
    if valid:
        dependencies.validate_startup_config()
    else:
        with pytest.raises(RuntimeError, match="GROQ_API_KEY"):
            dependencies.validate_startup_config()
