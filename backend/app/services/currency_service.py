from decimal import Decimal

import httpx

from app.core.config import get_settings

settings = get_settings()


def convert_currency(amount: Decimal, from_currency: str, to_currency: str) -> Decimal:
    """Convert an amount using external FX API, with safe fallback to original value."""
    if from_currency == to_currency:
        return amount

    try:
        response = httpx.get(
            f"{settings.exchange_rate_api_url}convert",
            params={"from": from_currency, "to": to_currency, "amount": float(amount)},
            timeout=8.0,
        )
        response.raise_for_status()
        result = response.json().get("result")
        if result is None:
            return amount
        return Decimal(str(round(float(result), 2)))
    except Exception:
        return amount
