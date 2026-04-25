from io import BytesIO

import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.etl.normalizer import normalize_dataframe
from app.models.account import Account
from app.models.category import Category
from app.models.transaction import Transaction
from app.schemas.etl import IngestionResult


def parse_tabular_file(filename: str, content: bytes) -> pd.DataFrame:
    """Parse CSV/XLS/XLSX bytes into a pandas DataFrame."""
    lower = filename.lower()
    if lower.endswith(".csv"):
        return pd.read_csv(BytesIO(content))
    if lower.endswith(".xlsx") or lower.endswith(".xls"):
        return pd.read_excel(BytesIO(content))
    raise ValueError("Unsupported file type. Use CSV or Excel")


def ingest_transactions(
    db: Session,
    user_id: int,
    account_id: int,
    source: str,
    filename: str,
    content: bytes,
) -> IngestionResult:
    """Normalize and persist imported transactions for a user account."""
    account = db.get(Account, account_id)
    if not account or account.bank.user_id != user_id:
        raise ValueError("Invalid account for user")

    user_categories = db.scalars(
        select(Category).where(Category.user_id == user_id)
    ).all()
    category_map = {c.name: c for c in user_categories}
    category_tuples = [(c.name, c.keywords) for c in user_categories]

    dataframe = parse_tabular_file(filename, content)
    records = normalize_dataframe(dataframe, source, category_tuples)

    imported = 0
    skipped = 0

    for record in records:
        category_obj = category_map.get(record.category) if record.category else None

        transaction = Transaction(
            description=record.description,
            amount=record.amount,
            currency=record.currency,
            transaction_type=record.transaction_type,
            occurred_at=record.occurred_at,
            user_id=user_id,
            account_id=account_id,
            category_id=category_obj.id if category_obj else None,
        )
        db.add(transaction)
        imported += 1

    db.commit()

    return IngestionResult(total_rows=len(records), imported_rows=imported, skipped_rows=skipped)
