from decimal import Decimal
from functools import lru_cache

import httpx

from app.core.config import get_settings

settings = get_settings()


@lru_cache(maxsize=32)
def _get_rate(from_currency: str, to_currency: str) -> Decimal | None:
    """Fetch and cache conversion rate for a currency pair."""
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
        return Decimal(str(result))
    except Exception:
        return None


def convert_currency(amount: Decimal, from_currency: str, to_currency: str) -> Decimal:
    """Convert an amount using external FX API, with safe fallback to original value."""
    if from_currency == to_currency:
        return amount

    rate = _get_rate(from_currency, to_currency)
    if rate is None:
        return amount

    return (amount * rate).quantize(Decimal("0.01"))
