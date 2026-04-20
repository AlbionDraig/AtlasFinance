from app.etl.classifier import classify_transaction
from app.models.enums import TransactionType


def test_classifier_income():
    assert classify_transaction("NOMINA ABRIL", TransactionType.INCOME) == "income"


def test_classifier_food():
    assert classify_transaction("Pago restaurante", TransactionType.EXPENSE) == "food"


def test_classifier_other():
    assert classify_transaction("Compra random", TransactionType.EXPENSE) == "other"
