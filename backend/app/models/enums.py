from enum import Enum


class Currency(str, Enum):
    """Supported currency codes in the current MVP."""
    COP = "COP"
    USD = "USD"


class AccountType(str, Enum):
    """Supported bank account types."""
    SAVINGS = "savings"
    CHECKING = "checking"


class TransactionType(str, Enum):
    """Transaction direction that impacts account balance."""
    INCOME = "income"
    EXPENSE = "expense"
