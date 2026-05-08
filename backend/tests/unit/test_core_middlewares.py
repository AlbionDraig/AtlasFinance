"""Unit tests for middleware and rate limit edge branches."""

from __future__ import annotations

import asyncio

import pytest
from starlette.requests import Request
from starlette.responses import Response

from app.core import correlation as correlation_module
from app.core import rate_limit as rate_limit_module


def _build_request(headers: list[tuple[bytes, bytes]] | None = None) -> Request:
    """Build a Starlette request object with optional raw headers."""
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/health",
        "headers": headers or [],
        "query_string": b"",
    }
    return Request(scope)


def test_should_use_remote_address_when_forwarded_header_is_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    """_key_func falls back to get_remote_address without forwarded header."""
    request = _build_request()
    monkeypatch.setattr(rate_limit_module, "get_remote_address", lambda _request: "198.51.100.7")

    key = rate_limit_module._key_func(request)

    assert key == "198.51.100.7"


def test_should_include_specific_limit_detail_when_exception_matches_rate_limit(monkeypatch: pytest.MonkeyPatch) -> None:
    """Handler uses the exception message for RateLimitExceeded errors."""
    request = _build_request()

    class FakeRateLimitExceeded(Exception):
        pass

    monkeypatch.setattr(rate_limit_module, "RateLimitExceeded", FakeRateLimitExceeded)
    exc = FakeRateLimitExceeded("5 per minute")

    response = asyncio.run(rate_limit_module.rate_limit_exceeded_handler(request, exc))

    assert response.status_code == 429
    assert b"5 per minute" in response.body


def test_should_set_request_id_and_log_completion_when_dispatch_succeeds(monkeypatch: pytest.MonkeyPatch) -> None:
    """Middleware binds request context, logs completion and returns request id header."""
    request = _build_request()
    middleware = correlation_module.CorrelationIdMiddleware(app=lambda _scope, _receive, _send: None)

    captured: dict[str, object] = {}

    class DummyLogger:
        def info(self, event: str, **kwargs: object) -> None:
            captured["info_event"] = event
            captured["info_kwargs"] = kwargs

        def exception(self, event: str, **kwargs: object) -> None:
            captured["exception_event"] = event
            captured["exception_kwargs"] = kwargs

    monkeypatch.setattr(correlation_module, "get_logger", lambda _name: DummyLogger())

    async def _call_next(_request: Request) -> Response:
        return Response(status_code=204)

    response = asyncio.run(middleware.dispatch(request, _call_next))

    assert response.status_code == 204
    assert response.headers.get("X-Request-ID")
    assert request.state.correlation_id == response.headers["X-Request-ID"]
    assert captured.get("info_event") == "request.completed"
    assert "status_code" in captured.get("info_kwargs", {})
    assert "duration_ms" in captured.get("info_kwargs", {})
    assert "exception_event" not in captured


def test_should_log_exception_and_reraise_when_dispatch_fails(monkeypatch: pytest.MonkeyPatch) -> None:
    """Middleware logs request.error and re-raises upstream exceptions."""
    request = _build_request(headers=[(b"x-request-id", b"custom-req-id")])
    middleware = correlation_module.CorrelationIdMiddleware(app=lambda _scope, _receive, _send: None)

    captured: dict[str, object] = {}

    class DummyLogger:
        def info(self, event: str, **kwargs: object) -> None:
            captured["info_event"] = event
            captured["info_kwargs"] = kwargs

        def exception(self, event: str, **kwargs: object) -> None:
            captured["exception_event"] = event
            captured["exception_kwargs"] = kwargs

    monkeypatch.setattr(correlation_module, "get_logger", lambda _name: DummyLogger())

    async def _call_next(_request: Request) -> Response:
        raise RuntimeError("boom")

    with pytest.raises(RuntimeError, match="boom"):
        asyncio.run(middleware.dispatch(request, _call_next))

    assert request.state.correlation_id == "custom-req-id"
    assert captured.get("exception_event") == "request.error"
    assert "duration_ms" in captured.get("exception_kwargs", {})
    assert "info_event" not in captured
