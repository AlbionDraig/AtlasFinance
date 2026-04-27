from decimal import Decimal
from time import monotonic

import httpx

from app.core.config import get_settings

settings = get_settings()

# In-process TTL cache: {pair -> (rate, expires_at)}
# TTL is intentionally short (1 h) to avoid serving stale FX rates.
# NOTE: each worker process has its own cache; this is acceptable for a
# single-worker deployment. For multi-worker production, replace with a
# shared store (Redis, DB table with expiry column, etc.).
_RATE_CACHE: dict[tuple[str, str], tuple[Decimal, float]] = {}
_CACHE_TTL_SECONDS: float = 3600.0  # 1 hour


def _clear_rate_cache() -> None:
    """Clear in-process FX cache (used by tests and maintenance tasks)."""
    _RATE_CACHE.clear()


def _get_rate(from_currency: str, to_currency: str) -> Decimal | None:
    """Fetch and cache (with TTL) the conversion rate for a currency pair."""
    key = (from_currency, to_currency)
    entry = _RATE_CACHE.get(key)
    if entry is not None and monotonic() < entry[1]:
        return entry[0]

    try:
        response = httpx.get(
            f"{settings.exchange_rate_api_url}convert",
            params={"from": from_currency, "to": to_currency, "amount": 1},
            timeout=2.5,
        )
        response.raise_for_status()
        result = response.json().get("result")
        if result is None:
            return None
        rate = Decimal(str(result))
        _RATE_CACHE[key] = (rate, monotonic() + _CACHE_TTL_SECONDS)
        return rate
    except (httpx.HTTPError, ValueError, ArithmeticError, RuntimeError):
        # On failure, return the stale value if available rather than breaking.
        return entry[0] if entry is not None else None


# Compatibility shim for tests that previously relied on functools.lru_cache.
_get_rate.cache_clear = _clear_rate_cache


def convert_currency(amount: Decimal, from_currency: str, to_currency: str) -> Decimal:
    """Convert an amount using external FX API, with safe fallback to original value."""
    if from_currency == to_currency:
        return amount

    rate = _get_rate(from_currency, to_currency)
    if rate is None:
        return amount

    return (amount * rate).quantize(Decimal("0.01"))
