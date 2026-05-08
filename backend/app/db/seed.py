"""
Seed de datos para Atlas Finance.

seed_base()  — Siempre se ejecuta al arrancar. Crea catálogos globales
               (países y categorías) que deben existir en cualquier ambiente.
               Es idempotente: no duplica registros.

seed_demo()  — Solo se ejecuta cuando:
                 • ENVIRONMENT != "production"   (development / test)
                 • SEED_DEMO_DATA=true           (flag explícito para producción)
               Crea el usuario de prueba jane.doe@sgb.co con datos completos
               para validar el funcionamiento de todas las funcionalidades.
               Es idempotente: si el usuario ya existe, no hace nada.
"""
import logging
import random
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.db.base import SessionLocal
from app.models.account import Account
from app.models.bank import Bank
from app.models.category import Category
from app.models.country import Country
from app.models.enums import AccountType, Currency, InvestmentEntityType, TransactionType
from app.models.investment import Investment
from app.models.investment_entity import InvestmentEntity
from app.models.pocket import Pocket
from app.models.transaction import Transaction
from app.models.user import User

logger = logging.getLogger(__name__)

# ── Credenciales del usuario demo ────────────────────────────────────────────
DEMO_EMAIL = "jane.doe@sgb.co"
DEMO_PASSWORD = "Strong/Pass|123"
DEMO_FULL_NAME = "Jane Doe"

# ── Catálogos globales (siempre presentes) ───────────────────────────────────
_COUNTRY_CATALOG = [
    ("CO", "Colombia"),
    ("US", "United States"),
    ("MX", "Mexico"),
    ("ES", "Spain"),
    ("AR", "Argentina"),
    ("CL", "Chile"),
    ("PE", "Peru"),
    ("BR", "Brazil"),
]

_CATEGORY_CATALOG = [
    # (name, description, is_fixed)
    ("Arriendo",               "Pago mensual de arrendamiento o hipoteca de vivienda.",                True),
    ("Servicios públicos",     "Agua, luz, gas, internet y teléfono del hogar.",                       True),
    ("Suscripciones digitales","Netflix, Spotify, YouTube, Adobe, apps y plataformas de streaming.",   True),
    ("Salario",                "Ingreso mensual por nómina, honorarios o pago de empleador.",          False),
    ("Freelance",              "Ingresos por trabajos independientes, proyectos o consultoría.",        False),
    ("Alimentación",           "Compras de alimentos, mercado y comida del día a día.",                False),
    ("Transporte",             "TransMilenio, bus, taxi, Uber, Cabify y transporte público.",          False),
    ("Salud",                  "Médicos, medicamentos, laboratorios, odontología y bienestar.",        False),
    ("Entretenimiento",        "Cine, conciertos, videojuegos, salidas y ocio.",                       False),
    ("Restaurantes",           "Comidas en restaurantes, cafeterías y pedidos a domicilio.",           False),
    ("Supermercado",           "Compras en grandes superficies: Éxito, Carulla, D1, Ara.",             False),
    ("Ropa y calzado",         "Prendas de vestir, zapatos y accesorios personales.",                  False),
    ("Salud y bienestar",      "Gym, spa, vitaminas y cuidado personal.",                              False),
    ("Movilidad",              "Gasolina, SOAT, mantenimiento vehicular y parqueadero.",               False),
    ("Casa",                   "Gastos del hogar: muebles, electrodomésticos, reparaciones.",          False),
    ("Educación",              "Matrículas, cursos, libros, colegiaturas y capacitaciones.",           False),
    ("Inversiones",            "Aportes a fondos, acciones, criptomonedas o activos financieros.",     False),
    ("Transferencias",         "Movimientos entre cuentas propias o envíos a terceros.",               False),
]


def _rand_dt(year: int, month: int, day: int) -> datetime:
    return datetime(year, month, day, random.randint(7, 21), random.randint(0, 59))


# ─────────────────────────────────────────────────────────────────────────────
# SEED BASE — catálogos globales, todos los ambientes
# ─────────────────────────────────────────────────────────────────────────────

def seed_base() -> None:
    """Crea países y categorías globales. Idempotente, se ejecuta siempre."""
    db: Session = SessionLocal()
    try:
        # Países
        existing_codes = {
            row.code
            for row in db.scalars(
                select(Country).where(Country.code.in_([c for c, _ in _COUNTRY_CATALOG]))
            ).all()
        }
        added_countries = 0
        for code, name in _COUNTRY_CATALOG:
            if code not in existing_codes:
                db.add(Country(code=code, name=name))
                added_countries += 1

        # Categorías
        existing_names = {
            row.name
            for row in db.scalars(
                select(Category).where(Category.name.in_([n for n, _, _ in _CATEGORY_CATALOG]))
            ).all()
        }
        added_categories = 0
        for name, description, is_fixed in _CATEGORY_CATALOG:
            if name not in existing_names:
                db.add(Category(name=name, description=description, is_fixed=is_fixed))
                added_categories += 1

        db.commit()
        if added_countries or added_categories:
            logger.info(
                "seed_base: +%d países, +%d categorías.",
                added_countries,
                added_categories,
            )
        else:
            logger.info("seed_base: catálogos ya al día, nada que insertar.")

    except Exception:
        db.rollback()
        logger.exception("seed_base falló, se revirtió la transacción.")
        raise
    finally:
        db.close()


# ─────────────────────────────────────────────────────────────────────────────
# SEED DEMO — usuario jane.doe@sgb.co con datos completos
# ─────────────────────────────────────────────────────────────────────────────

def seed_demo() -> None:
    """Crea el usuario demo con datos completos si aún no existe."""
    db: Session = SessionLocal()
    try:
        if db.query(User).filter(User.email == DEMO_EMAIL).first():
            logger.info("seed_demo: usuario '%s' ya existe, omitiendo.", DEMO_EMAIL)
            return

        logger.info("seed_demo: creando usuario '%s' ...", DEMO_EMAIL)

        # ── Usuario ────────────────────────────────────────────────────────
        user = User(
            email=DEMO_EMAIL,
            full_name=DEMO_FULL_NAME,
            hashed_password=get_password_hash(DEMO_PASSWORD),
        )
        db.add(user)
        db.flush()

        # ── Bancos ─────────────────────────────────────────────────────────
        bank_data = [
            ("Bancolombia", "CO"),
            ("Nequi",       "CO"),
            ("Davivienda",  "CO"),
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
        checking  = accounts["Cuenta Corriente"]
        nequi_acc = accounts["Nequi Personal"]
        usd_acc   = accounts["Cuenta USD"]

        # ── Pockets ────────────────────────────────────────────────────────
        pocket_data = [
            ("Fondo de emergencia", 1_500_000, Currency.COP, main_acc),
            ("Vacaciones 2026",       600_000, Currency.COP, main_acc),
            ("Gadgets / tecnología",  250_000, Currency.COP, checking),
            ("Ahorro USD",                500, Currency.USD, usd_acc),
        ]
        for name, balance, currency, acc in pocket_data:
            db.add(Pocket(name=name, balance=balance, currency=currency, account_id=acc.id))

        # ── Recuperar categorías del catálogo global ───────────────────────
        categories: dict[str, Category] = {
            row.name: row
            for row in db.scalars(
                select(Category).where(Category.name.in_([n for n, _, _ in _CATEGORY_CATALOG]))
            ).all()
        }

        # ── Transacciones (3 meses de historia) ───────────────────────────
        today = datetime.now()
        transactions_data = [
            # (account, currency, type, amount, description, category, days_ago)
            # — Enero —
            (main_acc,  Currency.COP, TransactionType.INCOME,   4_800_000, "Salario enero",            "Salario",                 85),
            (main_acc,  Currency.COP, TransactionType.EXPENSE,  1_200_000, "Arriendo enero",           "Arriendo",                83),
            (main_acc,  Currency.COP, TransactionType.EXPENSE,     85_000, "Supermercado Éxito",       "Supermercado",            80),
            (main_acc,  Currency.COP, TransactionType.EXPENSE,     42_000, "Recarga SITP",             "Transporte",              78),
            (checking,  Currency.COP, TransactionType.EXPENSE,    140_000, "Agua, luz, gas enero",     "Servicios públicos",      76),
            (nequi_acc, Currency.COP, TransactionType.EXPENSE,     32_000, "Domicilio Rappi",          "Restaurantes",            74),
            (checking,  Currency.COP, TransactionType.EXPENSE,     55_000, "Netflix + Spotify",        "Suscripciones digitales", 72),
            # — Febrero —
            (main_acc,  Currency.COP, TransactionType.INCOME,   4_800_000, "Salario febrero",          "Salario",                 55),
            (main_acc,  Currency.COP, TransactionType.EXPENSE,  1_200_000, "Arriendo febrero",         "Arriendo",                53),
            (main_acc,  Currency.COP, TransactionType.EXPENSE,     97_500, "Supermercado",             "Supermercado",            50),
            (checking,  Currency.COP, TransactionType.EXPENSE,    138_000, "Agua, luz, gas febrero",   "Servicios públicos",      48),
            (nequi_acc, Currency.COP, TransactionType.EXPENSE,     35_000, "Cine + cena San Valentín", "Entretenimiento",         44),
            (checking,  Currency.COP, TransactionType.INCOME,     500_000, "Proyecto freelance",       "Freelance",               40),
            (nequi_acc, Currency.COP, TransactionType.EXPENSE,     68_000, "Zapatos",                  "Ropa y calzado",          38),
            (main_acc,  Currency.COP, TransactionType.EXPENSE,     45_000, "Médico general",           "Salud",                   36),
            # — Marzo —
            (main_acc,  Currency.COP, TransactionType.INCOME,   4_800_000, "Salario marzo",            "Salario",                 25),
            (main_acc,  Currency.COP, TransactionType.EXPENSE,  1_200_000, "Arriendo marzo",           "Arriendo",                23),
            (main_acc,  Currency.COP, TransactionType.EXPENSE,    112_000, "Supermercado",             "Alimentación",            20),
            (checking,  Currency.COP, TransactionType.EXPENSE,    135_000, "Agua, luz, gas marzo",     "Servicios públicos",      18),
            (nequi_acc, Currency.COP, TransactionType.EXPENSE,     65_000, "Concierto",                "Entretenimiento",         15),
            (checking,  Currency.COP, TransactionType.EXPENSE,     55_000, "Suscripciones",            "Suscripciones digitales", 12),
            (checking,  Currency.COP, TransactionType.EXPENSE,     28_000, "Libro técnico",            "Educación",               10),
            (main_acc,  Currency.COP, TransactionType.EXPENSE,     55_000, "Médico control",           "Salud",                    5),
            (nequi_acc, Currency.COP, TransactionType.EXPENSE,     18_000, "Café y snacks",            "Alimentación",             2),
            (usd_acc,   Currency.USD, TransactionType.INCOME,        200,  "Pago cliente USA",         "Freelance",                1),
        ]
        for acc, currency, ttype, amount, desc, cat_name, days_ago in transactions_data:
            db.add(Transaction(
                amount=amount,
                currency=currency,
                transaction_type=ttype,
                description=desc,
                occurred_at=today - timedelta(days=days_ago),
                account_id=acc.id,
                user_id=user.id,
                category_id=categories[cat_name].id,
            ))

        # ── Entidades de inversión ─────────────────────────────────────────
        entity_data = [
            ("Bancolombia Fondos",  InvestmentEntityType.BANK,         "CO"),
            ("Davivienda Bolsa",    InvestmentEntityType.BROKER,       "CO"),
            ("Binance",             InvestmentEntityType.EXCHANGE,     "US"),
        ]
        entities: dict[str, InvestmentEntity] = {}
        for name, etype, country_code in entity_data:
            e = InvestmentEntity(name=name, entity_type=etype, country_code=country_code, user_id=user.id)
            db.add(e)
            db.flush()
            entities[name] = e

        # ── Inversiones ────────────────────────────────────────────────────
        investment_data = [
            # (name, instrument_type, amount_invested, current_value, currency, entity, days_ago)
            ("Fondo Voluntario Pensión",  "Fondo de pensiones",   2_000_000, 2_148_000, Currency.COP, "Bancolombia Fondos", 180),
            ("CDT 180 días",              "CDT",                  5_000_000, 5_212_500, Currency.COP, "Davivienda Bolsa",   120),
            ("Acciones Ecopetrol",        "Acción",               1_200_000, 1_080_000, Currency.COP, "Davivienda Bolsa",    90),
            ("Bitcoin",                   "Criptomoneda",               500,       612, Currency.USD, "Binance",             60),
            ("ETF S&P 500",               "ETF",                        800,       874, Currency.USD, "Binance",             45),
        ]
        for name, itype, invested, current, currency, entity_name, days_ago in investment_data:
            db.add(Investment(
                name=name,
                instrument_type=itype,
                amount_invested=invested,
                current_value=current,
                currency=currency,
                started_at=today - timedelta(days=days_ago),
                user_id=user.id,
                investment_entity_id=entities[entity_name].id,
            ))

        db.commit()
        logger.info(
            "seed_demo completado. Usuario: %s  |  Contraseña: %s",
            DEMO_EMAIL,
            DEMO_PASSWORD,
        )

    except Exception:
        db.rollback()
        logger.exception("seed_demo falló, se revirtió la transacción.")
        raise
    finally:
        db.close()


# Alias de compatibilidad — usado en versiones anteriores de main.py
def run_seed() -> None:  # pragma: no cover
    seed_base()
    seed_demo()
