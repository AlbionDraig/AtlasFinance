from collections.abc import Collection

from fastapi import HTTPException, status


def raise_bad_request_from_value_error(exc: ValueError) -> None:
    """Translate a domain ValueError into a 400 HTTPException."""
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


def raise_domain_value_error(
    exc: ValueError,
    *,
    not_found_messages: Collection[str] | None = None,
) -> None:
    """Translate domain ValueError to HTTP 400/404 based on known messages."""
    detail = str(exc)
    if not_found_messages and detail in not_found_messages:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail) from exc
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail) from exc


def raise_not_found_from_value_error(exc: ValueError) -> None:
    """Translate a domain ValueError into a 404 HTTPException."""
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
