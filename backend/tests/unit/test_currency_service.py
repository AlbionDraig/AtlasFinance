from decimal import Decimal

import pytest

from app.services import currency_service


@pytest.fixture(autouse=True)
def clear_rate_cache():
    currency_service._get_rate.cache_clear()
    yield
    currency_service._get_rate.cache_clear()


class _ResponseOK:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


def test_get_rate_returns_decimal_on_success(monkeypatch):
    monkeypatch.setattr(
        "app.services.currency_service.httpx.get",
        lambda *_args, **_kwargs: _ResponseOK({"result": 3.9876}),
    )

    rate = currency_service._get_rate("USD", "COP")

    assert rate == Decimal("3.9876")


def test_get_rate_returns_none_when_result_missing(monkeypatch):
    monkeypatch.setattr(
        "app.services.currency_service.httpx.get",
        lambda *_args, **_kwargs: _ResponseOK({}),
    )

    rate = currency_service._get_rate("USD", "COP")

    assert rate is None


def test_get_rate_returns_none_on_http_exception(monkeypatch):
    def _raise(*_args, **_kwargs):
        raise RuntimeError("network error")

    monkeypatch.setattr("app.services.currency_service.httpx.get", _raise)

    rate = currency_service._get_rate("USD", "COP")

    assert rate is None


def test_convert_currency_returns_same_amount_for_same_currency():
    amount = Decimal("100.00")

    converted = currency_service.convert_currency(amount, "COP", "COP")

    assert converted == amount


def test_convert_currency_falls_back_when_rate_unavailable(monkeypatch):
    monkeypatch.setattr("app.services.currency_service._get_rate", lambda *_args, **_kwargs: None)

    amount = Decimal("50.25")
    converted = currency_service.convert_currency(amount, "USD", "COP")

    assert converted == amount


def test_convert_currency_applies_rate_and_quantizes(monkeypatch):
    monkeypatch.setattr(
        "app.services.currency_service._get_rate",
        lambda *_args, **_kwargs: Decimal("3.14159"),
    )

    converted = currency_service.convert_currency(Decimal("10"), "USD", "COP")

    assert converted == Decimal("31.42")
