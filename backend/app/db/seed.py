"""
Seed de datos demo para entornos de desarrollo y pruebas.

Se ejecuta automáticamente al arrancar cuando:
  ENVIRONMENT=development  o  ENVIRONMENT=test
  o cuando SEED_ON_STARTUP=true

Es idempotente: si el usuario demo ya existe, no hace nada.
"""
import logging
import random
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.db.base import SessionLocal
from app.models.account import Account
from app.models.bank import Bank
from app.models.category import Category
from app.models.enums import AccountType, Currency, TransactionType
from app.models.pocket import Pocket
from app.models.transaction import Transaction
from app.models.user import User

logger = logging.getLogger(__name__)

DEMO_EMAIL = "demo@atlasfinance.dev"
DEMO_PASSWORD = "Demo/Atlas|2026"
DEMO_FULL_NAME = "Jane Doe (Demo)"


def _rand_dt(year: int, month: int, day: int) -> datetime:
    return datetime(year, month, day, random.randint(7, 21), random.randint(0, 59))


def run_seed() -> None:
    """Inserta usuario demo con datos iniciales si aún no existe."""
    db: Session = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == DEMO_EMAIL).first()
        if existing:
            logger.info("Seed: usuario demo ya existe, omitiendo.")
            return

        logger.info("Seed: creando usuario demo '%s' ...", DEMO_EMAIL)

        # ── Usuario ────────────────────────────────────────────────────────
        user = User(
            email=DEMO_EMAIL,
            full_name=DEMO_FULL_NAME,
            hashed_password=get_password_hash(DEMO_PASSWORD),
        )
        db.add(user)
        db.flush()  # obtiene user.id sin commit

        # ── Bancos ─────────────────────────────────────────────────────────
        bank_data = [
            ("Bancolombia", "CO"),
            ("Nequi", "CO"),
            ("Davivienda", "CO"),
        ]
        banks: dict[str, Bank] = {}
        for name, code in bank_data:
            b = Bank(name=name, country_code=code, user_id=user.id)
            db.add(b)
            db.flush()
            banks[name] = b

        # ── Cuentas ────────────────────────────────────────────────────────
        account_data = [
            ("Cuenta Ahorros Principal", AccountType.SAVINGS,  Currency.COP, 4_800_000, "Bancolombia"),
            ("Cuenta Corriente",         AccountType.CHECKING, Currency.COP, 1_250_000, "Bancolombia"),
            ("Nequi Personal",           AccountType.SAVINGS,  Currency.COP,   320_000, "Nequi"),
            ("Cuenta USD",               AccountType.SAVINGS,  Currency.USD,     1_800, "Davivienda"),
        ]
        accounts: dict[str, Account] = {}
        for name, atype, currency, balance, bank_name in account_data:
            acc = Account(
                name=name,
                account_type=atype,
                currency=currency,
                current_balance=balance,
                bank_id=banks[bank_name].id,
            )
            db.add(acc)
            db.flush()
            accounts[name] = acc

        main_acc = accounts["Cuenta Ahorros Principal"]
        checking = accounts["Cuenta Corriente"]
        nequi_acc = accounts["Nequi Personal"]
        usd_acc = accounts["Cuenta USD"]

        # ── Pockets ────────────────────────────────────────────────────────
        pocket_data = [
            ("Fondo de emergencia", 1_500_000, Currency.COP, main_acc),
            ("Vacaciones 2026",       600_000, Currency.COP, main_acc),
            ("Gadgets / tecnología",  250_000, Currency.COP, checking),
            ("Ahorro USD",                500, Currency.USD, usd_acc),
        ]
        pockets: dict[str, Pocket] = {}
        for name, balance, currency, acc in pocket_data:
            p = Pocket(name=name, balance=balance, currency=currency, account_id=acc.id)
            db.add(p)
            db.flush()
            pockets[name] = p

        # ── Categorías ─────────────────────────────────────────────────────
        category_data = [
            ("Alimentación",    False),
            ("Transporte",      False),
            ("Salud",           False),
            ("Entretenimiento", False),
            ("Servicios",       True),
            ("Educación",       True),
            ("Salario",         False),
            ("Freelance",       False),
        ]
        categories: dict[str, Category] = {}
        for name, is_fixed in category_data:
            c = Category(name=name, is_fixed=is_fixed, user_id=user.id)
            db.add(c)
            db.flush()
            categories[name] = c

        # ── Transacciones ──────────────────────────────────────────────────
        today = datetime.now()
        transactions_data = [
            # (account, currency, type, amount, description, category, days_ago)
            (main_acc,  Currency.COP, TransactionType.INCOME,   4_800_000, "Salario enero",       "Salario",         85),
            (main_acc,  Currency.COP, TransactionType.EXPENSE,    320_000, "Arriendo",            "Servicios",       83),
            (main_acc,  Currency.COP, TransactionType.EXPENSE,     85_000, "Supermercado",        "Alimentación",    80),
            (main_acc,  Currency.COP, TransactionType.EXPENSE,     42_000, "Transporte mensual",  "Transporte",      78),
            (main_acc,  Currency.COP, TransactionType.INCOME,   4_800_000, "Salario febrero",     "Salario",         55),
            (main_acc,  Currency.COP, TransactionType.EXPENSE,    320_000, "Arriendo",            "Servicios",       53),
            (main_acc,  Currency.COP, TransactionType.EXPENSE,     97_500, "Supermercado",        "Alimentación",    50),
            (checking,  Currency.COP, TransactionType.EXPENSE,    210_000, "Plan de datos",       "Servicios",       48),
            (nequi_acc, Currency.COP, TransactionType.EXPENSE,     35_000, "Domicilio",           "Alimentación",    45),
            (checking,  Currency.COP, TransactionType.INCOME,     500_000, "Proyecto freelance",  "Freelance",       40),
            (main_acc,  Currency.COP, TransactionType.INCOME,   4_800_000, "Salario marzo",       "Salario",         25),
            (main_acc,  Currency.COP, TransactionType.EXPENSE,    320_000, "Arriendo",            "Servicios",       23),
            (main_acc,  Currency.COP, TransactionType.EXPENSE,    112_000, "Supermercado",        "Alimentación",    20),
            (nequi_acc, Currency.COP, TransactionType.EXPENSE,     65_000, "Cine + cena",         "Entretenimiento", 15),
            (checking,  Currency.COP, TransactionType.EXPENSE,     28_000, "Libro técnico",       "Educación",       10),
            (main_acc,  Currency.COP, TransactionType.EXPENSE,     55_000, "Médico general",      "Salud",            5),
            (nequi_acc, Currency.COP, TransactionType.EXPENSE,     18_000, "Café y snacks",       "Alimentación",     2),
        ]
        for acc, currency, ttype, amount, desc, cat_name, days_ago in transactions_data:
            t = Transaction(
                amount=amount,
                currency=currency,
                transaction_type=ttype,
                description=desc,
                occurred_at=today - timedelta(days=days_ago),
                account_id=acc.id,
                user_id=user.id,
                category_id=categories[cat_name].id,
            )
            db.add(t)

        db.commit()
        logger.info(
            "Seed completado. Usuario demo: %s / contraseña: %s",
            DEMO_EMAIL,
            DEMO_PASSWORD,
        )

    except Exception:
        db.rollback()
        logger.exception("Seed falló, se revirtió la transacción.")
        raise
    finally:
        db.close()
