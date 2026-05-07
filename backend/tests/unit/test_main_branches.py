"""Unit tests for uncovered branches in app/main.py."""

from __future__ import annotations

import sys
import types
from types import SimpleNamespace


def test_should_call_sentry_init_when_dsn_is_configured(monkeypatch) -> None:
    """_init_sentry calls sentry_sdk.init when sentry_dsn is set."""
    import app.main as main_module

    init_calls: list[dict] = []

    # Construir un módulo fake de sentry_sdk
    fake_sentry = types.ModuleType("sentry_sdk")
    fake_sentry.init = lambda **kwargs: init_calls.append(kwargs)  # type: ignore[attr-defined]

    fake_fastapi_integration = types.ModuleType("sentry_sdk.integrations.fastapi")
    fake_fastapi_integration.FastApiIntegration = lambda: "fastapi_integration"  # type: ignore[attr-defined]
    fake_starlette_integration = types.ModuleType("sentry_sdk.integrations.starlette")
    fake_starlette_integration.StarletteIntegration = lambda: "starlette_integration"  # type: ignore[attr-defined]

    monkeypatch.setitem(sys.modules, "sentry_sdk", fake_sentry)
    monkeypatch.setitem(sys.modules, "sentry_sdk.integrations.fastapi", fake_fastapi_integration)
    monkeypatch.setitem(sys.modules, "sentry_sdk.integrations.starlette", fake_starlette_integration)

    fake_settings = SimpleNamespace(
        sentry_dsn="https://key@sentry.io/123",
        environment="production",
        sentry_traces_sample_rate=0.1,
        sentry_profiles_sample_rate=0.0,
    )
    monkeypatch.setattr(main_module, "settings", fake_settings)

    main_module._init_sentry()

    assert len(init_calls) == 1
    assert init_calls[0]["dsn"] == "https://key@sentry.io/123"
    assert init_calls[0]["send_default_pii"] is False


def test_should_return_early_when_sentry_dsn_is_empty(monkeypatch) -> None:
    """_init_sentry returns without calling sentry when sentry_dsn is empty."""
    import app.main as main_module

    init_called: list[bool] = []

    fake_sentry = types.ModuleType("sentry_sdk")
    fake_sentry.init = lambda **kwargs: init_called.append(True)  # type: ignore[attr-defined]
    monkeypatch.setitem(sys.modules, "sentry_sdk", fake_sentry)

    fake_settings = SimpleNamespace(sentry_dsn="")
    monkeypatch.setattr(main_module, "settings", fake_settings)

    main_module._init_sentry()

    assert not init_called
