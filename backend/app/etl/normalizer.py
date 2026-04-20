from datetime import datetime, timezone

import pandas as pd

from app.etl.classifier import classify_transaction
from app.models.enums import Currency, TransactionType
from app.schemas.etl import NormalizedTransaction

BANK_COLUMN_MAPS = {
    "bancolombia": {
        "date": "Fecha",
        "description": "Descripcion",
        "amount": "Valor",
        "type": "Tipo",
        "currency": "Moneda",
    },
    "nequi": {
        "date": "date",
        "description": "detail",
        "amount": "amount",
        "type": "direction",
        "currency": "currency",
    },
}


def normalize_dataframe(df: pd.DataFrame, source: str) -> list[NormalizedTransaction]:
    source_key = source.lower()
    if source_key not in BANK_COLUMN_MAPS:
        raise ValueError(f"Unsupported source format: {source}")

    column_map = BANK_COLUMN_MAPS[source_key]

    normalized = []
    for _, row in df.iterrows():
        txn_type_raw = str(row[column_map["type"]]).lower().strip()
        txn_type = TransactionType.INCOME if txn_type_raw in {"in", "income", "credito"} else TransactionType.EXPENSE

        description = str(row[column_map["description"]]).strip()
        category = classify_transaction(description, txn_type)

        occurred_at = pd.to_datetime(row[column_map["date"]], errors="coerce")
        if pd.isna(occurred_at):
            occurred_at = datetime.now(timezone.utc)

        raw_currency = str(row[column_map["currency"]]).upper().strip()
        currency = Currency.USD if raw_currency == "USD" else Currency.COP

        normalized.append(
            NormalizedTransaction(
                description=description,
                amount=abs(float(row[column_map["amount"]])),
                transaction_type=txn_type,
                occurred_at=occurred_at.to_pydatetime() if hasattr(occurred_at, "to_pydatetime") else occurred_at,
                currency=currency,
                category=category,
            )
        )

    return normalized
