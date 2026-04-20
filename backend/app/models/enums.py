from enum import Enum


class Currency(str, Enum):
    COP = "COP"
    USD = "USD"


class AccountType(str, Enum):
    SAVINGS = "savings"
    CHECKING = "checking"


class TransactionType(str, Enum):
    INCOME = "income"
    EXPENSE = "expense"
