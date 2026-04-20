from app.models.enums import TransactionType

CATEGORY_RULES = {
    "food": ["restaurante", "almuerzo", "cafe", "mercado", "supermercado"],
    "transport": ["uber", "taxi", "metro", "peaje", "gasolina"],
    "housing": ["arriendo", "hipoteca", "servicios", "energia", "agua"],
    "salary": ["nomina", "salario", "payroll"],
}


def classify_transaction(description: str, transaction_type: TransactionType) -> str:
    text = description.lower().strip()

    if transaction_type == TransactionType.INCOME:
        return "income"

    for category, keywords in CATEGORY_RULES.items():
        if any(keyword in text for keyword in keywords):
            return category

    return "other"
