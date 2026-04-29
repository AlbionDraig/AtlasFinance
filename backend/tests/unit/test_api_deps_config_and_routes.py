from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from fastapi import HTTPException, Response, status
from jose import ExpiredSignatureError, JWTError

from app.api import deps as deps_module
from app.api.v1.routes import (
    accounts as accounts_routes,
)
from app.api.v1.routes import (
    auth as auth_routes,
)
from app.api.v1.routes import (
    banks as banks_routes,
)
from app.api.v1.routes import (
    categories as categories_routes,
)
from app.api.v1.routes import (
    countries as countries_routes,
)
from app.api.v1.routes import (
    investment_entities as investment_entities_routes,
)
from app.api.v1.routes import (
    investments as investments_routes,
)
from app.api.v1.routes import (
    pockets as pockets_routes,
)
from app.api.v1.routes import (
    transactions as transactions_routes,
)
from app.core import config as config_module


def test_backend_cors_origins_list_supports_csv_and_json_and_cache_clear():
    csv_settings = config_module.Settings(backend_cors_origins="http://a.test, http://b.test")
    json_settings = config_module.Settings(backend_cors_origins='["http://a.test", "http://b.test"]')
    invalid_json_settings = config_module.Settings(backend_cors_origins="[not-json")

    assert csv_settings.backend_cors_origins_list == ["http://a.test", "http://b.test"]
    assert json_settings.backend_cors_origins_list == ["http://a.test", "http://b.test"]
    assert invalid_json_settings.backend_cors_origins_list == ["[not-json"]

    config_module.get_settings.cache_clear()
    first = config_module.get_settings()
    second = config_module.get_settings()
    assert first is second
    config_module.get_settings.cache_clear()


def test_get_token_from_bearer_or_cookie_prefers_bearer_and_requires_one():
    assert deps_module.get_token_from_bearer_or_cookie("bearer-token", "cookie-token") == "bearer-token"
    assert deps_module.get_token_from_bearer_or_cookie(None, "cookie-token") == "cookie-token"

    with pytest.raises(HTTPException) as exc_info:
        deps_module.get_token_from_bearer_or_cookie(None, None)

    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED


def test_get_current_user_rejects_missing_claims_revoked_and_missing_user(monkeypatch):
    monkeypatch.setattr(deps_module, "settings", SimpleNamespace(secret_key="secret", algorithm="HS256"))

    class DummyDb:
        def __init__(self, user=None):
            self._user = user

        def get(self, _model, _user_id):
            return self._user

    monkeypatch.setattr(deps_module, "is_access_token_revoked", lambda _db, _token: False)

    monkeypatch.setattr(deps_module.jwt, "decode", lambda *_args, **_kwargs: {"exp": 9999999999})
    with pytest.raises(HTTPException) as exc_info:
        deps_module.get_current_user("token", DummyDb())
    assert exc_info.value.status_code == 401

    monkeypatch.setattr(deps_module.jwt, "decode", lambda *_args, **_kwargs: {"sub": "1"})
    with pytest.raises(HTTPException) as exc_info:
        deps_module.get_current_user("token", DummyDb())
    assert exc_info.value.status_code == 401

    monkeypatch.setattr(
        deps_module.jwt,
        "decode",
        lambda *_args, **_kwargs: {"sub": "1", "exp": int((datetime.now(timezone.utc) + timedelta(minutes=5)).timestamp())},
    )
    monkeypatch.setattr(deps_module, "is_access_token_revoked", lambda _db, _token: True)
    with pytest.raises(HTTPException) as exc_info:
        deps_module.get_current_user("token", DummyDb())
    assert exc_info.value.status_code == 401

    monkeypatch.setattr(deps_module, "is_access_token_revoked", lambda _db, _token: False)
    with pytest.raises(HTTPException) as exc_info:
        deps_module.get_current_user("token", DummyDb())
    assert exc_info.value.status_code == 401


@pytest.mark.parametrize(
    ("module", "attr_name", "callable_under_test", "args", "message", "expected_status"),
    [
        (accounts_routes, "create_account", accounts_routes.create_account_endpoint, (object(), object(), SimpleNamespace(id=1)), "invalid", 400),
        (accounts_routes, "update_account", accounts_routes.update_account_endpoint, (1, object(), object(), SimpleNamespace(id=1)), "invalid", 400),
        (accounts_routes, "delete_account", accounts_routes.delete_account_endpoint, (1, object(), SimpleNamespace(id=1)), "invalid", 400),
        (banks_routes, "create_bank", banks_routes.create_bank_endpoint, (object(), object(), SimpleNamespace(id=1)), "invalid", 400),
        (banks_routes, "update_bank", banks_routes.update_bank_endpoint, (1, object(), object(), SimpleNamespace(id=1)), "invalid", 400),
        (banks_routes, "delete_bank", banks_routes.delete_bank_endpoint, (1, object(), SimpleNamespace(id=1)), "invalid", 400),
        (categories_routes, "create_category", categories_routes.create_category_endpoint, (object(), object(), SimpleNamespace(id=1)), "invalid", 400),
        (categories_routes, "update_category", categories_routes.update_category_endpoint, (1, object(), object(), SimpleNamespace(id=1)), "Category missing", 404),
        (categories_routes, "delete_category", categories_routes.delete_category_endpoint, (1, object(), SimpleNamespace(id=1)), "Category missing", 404),
        (investment_entities_routes, "create_investment_entity", investment_entities_routes.create_investment_entity_endpoint, (object(), object(), SimpleNamespace(id=1)), "invalid", 400),
        (investment_entities_routes, "delete_investment_entity", investment_entities_routes.delete_investment_entity_endpoint, (1, object(), SimpleNamespace(id=1)), "invalid", 400),
        (investments_routes, "create_investment", investments_routes.create_investment_endpoint, (object(), object(), SimpleNamespace(id=1)), "invalid", 400),
        (investments_routes, "update_investment", investments_routes.update_investment_endpoint, (1, object(), object(), SimpleNamespace(id=1)), "Investment not found", 404),
        (investments_routes, "delete_investment", investments_routes.delete_investment_endpoint, (1, object(), SimpleNamespace(id=1)), "Investment not found", 404),
        (pockets_routes, "move_amount_to_pocket", pockets_routes.move_funds_to_pocket_endpoint, (object(), object(), SimpleNamespace(id=1)), "Pocket not found", 404),
        (pockets_routes, "get_pocket", pockets_routes.get_pocket_endpoint, (1, object(), SimpleNamespace(id=1)), "Pocket not found", 404),
        (pockets_routes, "update_pocket", pockets_routes.update_pocket_endpoint, (1, object(), object(), SimpleNamespace(id=1)), "Pocket not found", 404),
        (pockets_routes, "delete_pocket", pockets_routes.delete_pocket_endpoint, (1, object(), SimpleNamespace(id=1)), "Pocket not found", 404),
        (transactions_routes, "register_transaction", transactions_routes.create_transaction_endpoint, (object(), object(), SimpleNamespace(id=1)), "invalid", 400),
        (transactions_routes, "create_transfer", transactions_routes.create_transfer_endpoint, (object(), object(), SimpleNamespace(id=1)), "invalid", 400),
        (transactions_routes, "update_transaction", transactions_routes.update_transaction_endpoint, (1, object(), object(), SimpleNamespace(id=1)), "Transaction not found", 404),
        (transactions_routes, "delete_transaction", transactions_routes.delete_transaction_endpoint, (1, object(), SimpleNamespace(id=1)), "Transaction not found", 404),
    ],
)
def test_route_error_branches_raise_expected_http_status(
    monkeypatch,
    module,
    attr_name,
    callable_under_test,
    args,
    message,
    expected_status,
):
    def _raiser(*_args, **_kwargs):
        raise ValueError(message)

    monkeypatch.setattr(module, attr_name, _raiser)

    with pytest.raises(HTTPException) as exc_info:
        callable_under_test(*args)

    assert exc_info.value.status_code == expected_status
    assert exc_info.value.detail == message


def test_update_country_endpoint_maps_not_found_and_bad_request(monkeypatch):
    monkeypatch.setattr(countries_routes, "update_country", lambda *_args, **_kwargs: (_ for _ in ()).throw(ValueError("Country not found")))
    with pytest.raises(HTTPException) as exc_info:
        countries_routes.update_country_endpoint(1, object(), object(), SimpleNamespace(id=1))
    assert exc_info.value.status_code == 404

    monkeypatch.setattr(countries_routes, "update_country", lambda *_args, **_kwargs: (_ for _ in ()).throw(ValueError("invalid country")))
    with pytest.raises(HTTPException) as exc_info:
        countries_routes.update_country_endpoint(1, object(), object(), SimpleNamespace(id=1))
    assert exc_info.value.status_code == 400


def test_auth_route_error_and_success_paths(monkeypatch):
    monkeypatch.setattr(auth_routes, "create_user", lambda *_args, **_kwargs: (_ for _ in ()).throw(ValueError("duplicate")))
    with pytest.raises(HTTPException) as exc_info:
        auth_routes.register(object(), object())
    assert exc_info.value.status_code == 400

    monkeypatch.setattr(auth_routes, "authenticate_user", lambda *_args, **_kwargs: None)
    with pytest.raises(HTTPException) as exc_info:
        auth_routes.login(SimpleNamespace(email="e", password="p"), object(), Response())
    assert exc_info.value.status_code == 401

    monkeypatch.setattr(auth_routes, "update_user", lambda *_args, **_kwargs: (_ for _ in ()).throw(ValueError("invalid")))
    with pytest.raises(HTTPException) as exc_info:
        auth_routes.update_current_user(object(), SimpleNamespace(id=1), object())
    assert exc_info.value.status_code == 400

    class QueryWithUser:
        def __init__(self, user):
            self.user = user

        def filter(self, *_args, **_kwargs):
            return self

        def first(self):
            return self.user

    class DummyDb:
        def __init__(self, user):
            self.user = user

        def query(self, *_args, **_kwargs):
            return QueryWithUser(self.user)

    monkeypatch.setattr(auth_routes.jwt, "decode", lambda *_args, **_kwargs: {"sub": None})
    with pytest.raises(HTTPException) as exc_info:
        auth_routes.refresh_token(Response(), DummyDb(SimpleNamespace(id=1)), "refresh-token")
    assert exc_info.value.status_code == 401

    monkeypatch.setattr(auth_routes.jwt, "decode", lambda *_args, **_kwargs: {"sub": "1"})
    with pytest.raises(HTTPException) as exc_info:
        auth_routes.refresh_token(Response(), DummyDb(None), "refresh-token")
    assert exc_info.value.status_code == 401

    monkeypatch.setattr(auth_routes.jwt, "decode", lambda *_args, **_kwargs: (_ for _ in ()).throw(ExpiredSignatureError("expired")))
    with pytest.raises(HTTPException) as exc_info:
        auth_routes.refresh_token(Response(), DummyDb(SimpleNamespace(id=1)), "refresh-token")
    assert exc_info.value.detail == "Refresh token expired"

    monkeypatch.setattr(auth_routes.jwt, "decode", lambda *_args, **_kwargs: (_ for _ in ()).throw(JWTError("bad token")))
    with pytest.raises(HTTPException) as exc_info:
        auth_routes.refresh_token(Response(), DummyDb(SimpleNamespace(id=1)), "refresh-token")
    assert exc_info.value.detail == "Invalid refresh token"

    monkeypatch.setattr(auth_routes.jwt, "decode", lambda *_args, **_kwargs: {})
    with pytest.raises(HTTPException) as exc_info:
        auth_routes.logout(Response(), object(), "access-token", SimpleNamespace(id=1))
    assert exc_info.value.detail == "Invalid token"

    monkeypatch.setattr(auth_routes.jwt, "decode", lambda *_args, **_kwargs: (_ for _ in ()).throw(ExpiredSignatureError("expired")))
    with pytest.raises(HTTPException) as exc_info:
        auth_routes.logout(Response(), object(), "access-token", SimpleNamespace(id=1))
    assert exc_info.value.detail == "Token expired"

    monkeypatch.setattr(auth_routes.jwt, "decode", lambda *_args, **_kwargs: (_ for _ in ()).throw(JWTError("bad token")))
    with pytest.raises(HTTPException) as exc_info:
        auth_routes.logout(Response(), object(), "access-token", SimpleNamespace(id=1))
    assert exc_info.value.detail == "Invalid token"

    captured = {}
    monkeypatch.setattr(
        auth_routes.jwt,
        "decode",
        lambda *_args, **_kwargs: {"exp": int((datetime.now(timezone.utc) + timedelta(minutes=5)).timestamp())},
    )
    monkeypatch.setattr(
        auth_routes,
        "revoke_access_token",
        lambda _db, token, expires_at: captured.update({"token": token, "expires_at": expires_at}),
    )
    response = Response()
    result = auth_routes.logout(response, object(), "access-token", SimpleNamespace(id=1))
    assert captured["token"] == "access-token"
    assert result.status_code == 204