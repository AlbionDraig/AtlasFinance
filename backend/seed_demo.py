"""
Seed script for Jane Doe demo data.
Run from inside the atlas-backend container:
  docker exec atlas-backend python seed_demo.py
"""
import random
from datetime import datetime

import httpx

BASE = "http://localhost:8000/api/v1"
EMAIL = "demo_20260420152605@gmail.com"
PASSWORD = "Strong/Pass|123"

# ── helpers ─────────────────────────────────────────────────────────────────

def login():
    r = httpx.post(f"{BASE}/auth/login", json={"email": EMAIL, "password": PASSWORD})
    r.raise_for_status()
    return r.json()["access_token"]

def api(method, path, token, **kwargs):
    headers = {"Authorization": f"Bearer {token}"}
    r = httpx.request(method, f"{BASE}{path}", headers=headers, **kwargs)
    if not r.is_success:
        print(f"  ERROR {method} {path}: {r.status_code} {r.text}")
        return None
    return r.json()

def dt(year, month, day):
    return datetime(year, month, day, random.randint(7, 21), random.randint(0, 59)).isoformat()

# ── main ────────────────────────────────────────────────────────────────────

token = login()
print("✓ Login OK")

# Banks
banks = {}
for b in [
    ("Bancolombia", "CO"),
    ("Nequi",       "CO"),
    ("Davivienda",  "CO"),
]:
    res = api("POST", "/banks/", token, json={"name": b[0], "country_code": b[1]})
    if res:
        banks[b[0]] = res["id"]
        print(f"  ✓ Banco: {b[0]} (id={res['id']})")

# Accounts
accounts = {}
account_defs = [
    ("Cuenta Ahorros Principal", "savings",  "COP", 4_800_000, "Bancolombia"),
    ("Cuenta Corriente",         "checking", "COP", 1_250_000, "Bancolombia"),
    ("Nequi Personal",           "savings",  "COP",   320_000, "Nequi"),
    ("Cuenta USD",               "savings",  "USD",     1_800, "Davivienda"),
]
for name, atype, currency, balance, bank in account_defs:
    res = api("POST", "/accounts/", token, json={
        "name": name, "account_type": atype,
        "currency": currency, "current_balance": balance,
        "bank_id": banks[bank]
    })
    if res:
        accounts[name] = res["id"]
        print(f"  ✓ Cuenta: {name} (id={res['id']})")

main_acc = accounts["Cuenta Ahorros Principal"]
checking = accounts["Cuenta Corriente"]
nequi    = accounts["Nequi Personal"]
usd_acc  = accounts["Cuenta USD"]

# Pockets
pocket_defs = [
    ("Fondo de emergencia", 1_500_000, "COP", main_acc),
    ("Vacaciones 2026",       600_000, "COP", main_acc),
    ("Gadgets / tecnología",  250_000, "COP", checking),
    ("Ahorro USD",              500,   "USD", usd_acc),
]
pockets = {}
for name, balance, currency, acc_id in pocket_defs:
    res = api("POST", "/pockets/", token, json={
        "name": name, "balance": balance,
        "currency": currency, "account_id": acc_id
    })
    if res:
        pockets[name] = res["id"]
        print(f"  ✓ Pocket: {name} (id={res['id']})")

# Categories
cat_defs = [
    ("Arriendo",               True,  "Pago mensual de arrendamiento o hipoteca de vivienda."),
    ("Servicios públicos",     True,  "Agua, luz, gas, internet y teléfono del hogar."),
    ("Suscripciones digitales",True,  "Netflix, Spotify, YouTube, Adobe, apps y plataformas de streaming."),
    ("Salario",                False, "Ingreso mensual por nómina, honorarios o pago de empleador."),
    ("Freelance",              False, "Ingresos por trabajos independientes, proyectos o consultoría."),
    ("Alimentación",           False, "Compras de alimentos, mercado y comida del día a día."),
    ("Transporte",             False, "TransMilenio, bus, taxi, Uber, Cabify y transporte público."),
    ("Salud",                  False, "Médicos, medicamentos, laboratorios, odontología y bienestar."),
    ("Entretenimiento",        False, "Cine, conciertos, videojuegos, salidas y ocio."),
    ("Restaurantes",           False, "Comidas en restaurantes, cafeterías y pedidos a domicilio."),
    ("Supermercado",           False, "Compras en grandes superficies: Éxito, Carulla, D1, Ara."),
    ("Ropa y calzado",         False, "Prendas de vestir, zapatos y accesorios personales."),
    ("Educación",              False, "Matrículas, cursos, libros, colegiaturas y capacitaciones."),
    ("Inversiones",            False, "Aportes a fondos, acciones, criptomonedas o activos financieros."),
    ("Transferencias",         False, "Movimientos entre cuentas propias o envíos a terceros."),
    ("Movilidad",              False, "Gasolina, SOAT, mantenimiento vehicular y parqueadero."),
    ("Casa",                   False, "Gastos del hogar: muebles, electrodomésticos, reparaciones."),
]
cats = {}
for name, is_fixed, description in cat_defs:
    res = api("POST", "/categories/", token, json={"name": name, "is_fixed": is_fixed, "description": description})
    if res:
        cats[name] = res["id"]
print(f"  ✓ {len(cats)} categorías creadas")

# Transactions – 6 months of realistic data (Nov 2025 → Apr 2026)
txs = [
    # ── NOV 2025 ──
    ("Salario noviembre",          4_800_000, "COP", "income",  dt(2025,11, 1), main_acc, "Salario",              None),
    ("Arriendo nov",               1_200_000, "COP", "expense", dt(2025,11, 2), checking, "Arriendo",             None),
    ("Supermercado Éxito",           185_000, "COP", "expense", dt(2025,11, 5), nequi,    "Supermercado",         None),
    ("Recarga TransMilenio",          80_000, "COP", "expense", dt(2025,11, 7), nequi,    "Transporte",           None),
    ("Netflix / Spotify / YouTube",   55_000, "COP", "expense", dt(2025,11,10), nequi,    "Suscripciones digitales", None),
    ("Cena cumpleaños",               95_000, "COP", "expense", dt(2025,11,14), checking, "Restaurantes",         None),
    ("Gym mensualidad",               80_000, "COP", "expense", dt(2025,11,15), checking, "Salud",                None),
    ("Agua, luz, gas",               140_000, "COP", "expense", dt(2025,11,18), checking, "Servicios públicos",   None),
    ("Freelance diseño logo",        350_000, "COP", "income",  dt(2025,11,20), main_acc, "Freelance",            None),
    ("Zapatos nuevos",               210_000, "COP", "expense", dt(2025,11,25), checking, "Ropa y calzado",       None),
    ("Mercado semanal",              130_000, "COP", "expense", dt(2025,11,28), nequi,    "Alimentación",         None),

    # ── DIC 2025 ──
    ("Salario diciembre",          4_800_000, "COP", "income",  dt(2025,12, 1), main_acc, "Salario",              None),
    ("Prima de servicios",         2_400_000, "COP", "income",  dt(2025,12, 2), main_acc, "Salario",              None),
    ("Arriendo dic",               1_200_000, "COP", "expense", dt(2025,12, 2), checking, "Arriendo",             None),
    ("Regalos navideños",            450_000, "COP", "expense", dt(2025,12, 8), checking, "Entretenimiento",      None),
    ("Supermercado diciembre",       220_000, "COP", "expense", dt(2025,12,10), nequi,    "Supermercado",         None),
    ("Servicios dic",                145_000, "COP", "expense", dt(2025,12,12), checking, "Servicios públicos",   None),
    ("Cena fin de año",              180_000, "COP", "expense", dt(2025,12,28), checking, "Restaurantes",         None),
    ("Suscripciones dic",             55_000, "COP", "expense", dt(2025,12,10), nequi,    "Suscripciones digitales", None),
    ("Compra ropa navidad",          320_000, "COP", "expense", dt(2025,12,20), checking, "Ropa y calzado",       None),
    ("Transferencia fondo emerg.",   500_000, "COP", "expense", dt(2025,12,30), main_acc, "Transferencias",       pockets.get("Fondo de emergencia")),

    # ── ENE 2026 ──
    ("Salario enero",              4_800_000, "COP", "income",  dt(2026, 1, 1), main_acc, "Salario",              None),
    ("Arriendo ene",               1_200_000, "COP", "expense", dt(2026, 1, 2), checking, "Arriendo",             None),
    ("Matrícula curso Python",       280_000, "COP", "expense", dt(2026, 1, 5), checking, "Educación",            None),
    ("Supermercado ene",             195_000, "COP", "expense", dt(2026, 1, 8), nequi,    "Supermercado",         None),
    ("Recarga TransMilenio",          80_000, "COP", "expense", dt(2026, 1,10), nequi,    "Transporte",           None),
    ("Servicios ene",                138_000, "COP", "expense", dt(2026, 1,14), checking, "Servicios públicos",   None),
    ("Suscripciones ene",             55_000, "COP", "expense", dt(2026, 1,10), nequi,    "Suscripciones digitales", None),
    ("Freelance app móvil",          600_000, "COP", "income",  dt(2026, 1,15), main_acc, "Freelance",            None),
    ("Gym ene",                       80_000, "COP", "expense", dt(2026, 1,16), checking, "Salud",                None),
    ("Almuerzo semana",               95_000, "COP", "expense", dt(2026, 1,22), nequi,    "Restaurantes",         None),
    ("Ahorro vacaciones",            200_000, "COP", "expense", dt(2026, 1,31), main_acc, "Transferencias",       pockets.get("Vacaciones 2026")),

    # ── FEB 2026 ──
    ("Salario febrero",            4_800_000, "COP", "income",  dt(2026, 2, 1), main_acc, "Salario",              None),
    ("Arriendo feb",               1_200_000, "COP", "expense", dt(2026, 2, 2), checking, "Arriendo",             None),
    ("San Valentín cena",            130_000, "COP", "expense", dt(2026, 2,14), checking, "Restaurantes",         None),
    ("Supermercado feb",             210_000, "COP", "expense", dt(2026, 2, 7), nequi,    "Supermercado",         None),
    ("Servicios feb",                142_000, "COP", "expense", dt(2026, 2,12), checking, "Servicios públicos",   None),
    ("Suscripciones feb",             55_000, "COP", "expense", dt(2026, 2,10), nequi,    "Suscripciones digitales", None),
    ("Recarga transporte",            80_000, "COP", "expense", dt(2026, 2,11), nequi,    "Transporte",           None),
    ("Consulta médica",               65_000, "COP", "expense", dt(2026, 2,18), checking, "Salud",                None),
    ("Gym feb",                       80_000, "COP", "expense", dt(2026, 2,16), checking, "Salud",                None),
    ("Ahorro vacaciones feb",        200_000, "COP", "expense", dt(2026, 2,28), main_acc, "Transferencias",       pockets.get("Vacaciones 2026")),

    # ── MAR 2026 ──
    ("Salario marzo",              4_800_000, "COP", "income",  dt(2026, 3, 1), main_acc, "Salario",              None),
    ("Arriendo mar",               1_200_000, "COP", "expense", dt(2026, 3, 2), checking, "Arriendo",             None),
    ("Supermercado mar",             198_000, "COP", "expense", dt(2026, 3, 6), nequi,    "Supermercado",         None),
    ("Servicios mar",                150_000, "COP", "expense", dt(2026, 3,13), checking, "Servicios públicos",   None),
    ("Suscripciones mar",             55_000, "COP", "expense", dt(2026, 3,10), nequi,    "Suscripciones digitales", None),
    ("Freelance web dashboard",      800_000, "COP", "income",  dt(2026, 3,10), main_acc, "Freelance",            None),
    ("Recarga transporte",            80_000, "COP", "expense", dt(2026, 3,11), nequi,    "Transporte",           None),
    ("Ropa temporada",               275_000, "COP", "expense", dt(2026, 3,20), checking, "Ropa y calzado",       None),
    ("Gym mar",                       80_000, "COP", "expense", dt(2026, 3,16), checking, "Salud",                None),
    ("Almuerzo negocios",             85_000, "COP", "expense", dt(2026, 3,25), nequi,    "Restaurantes",         None),
    ("Ahorro vacaciones mar",        200_000, "COP", "expense", dt(2026, 3,31), main_acc, "Transferencias",       pockets.get("Vacaciones 2026")),

    # ── ABR 2026 ──
    ("Salario abril",              4_800_000, "COP", "income",  dt(2026, 4, 1), main_acc, "Salario",              None),
    ("Arriendo abr",               1_200_000, "COP", "expense", dt(2026, 4, 2), checking, "Arriendo",             None),
    ("Supermercado abr",             205_000, "COP", "expense", dt(2026, 4, 5), nequi,    "Supermercado",         None),
    ("Servicios abr",                145_000, "COP", "expense", dt(2026, 4,10), checking, "Servicios públicos",   None),
    ("Suscripciones abr",             55_000, "COP", "expense", dt(2026, 4,10), nequi,    "Suscripciones digitales", None),
    ("Recarga transporte",            80_000, "COP", "expense", dt(2026, 4,11), nequi,    "Transporte",           None),
    ("Gym abr",                       80_000, "COP", "expense", dt(2026, 4,15), checking, "Salud",                None),
    ("Entrada cine + restaurante",   120_000, "COP", "expense", dt(2026, 4,18), nequi,    "Entretenimiento",      None),
    ("Freelance consultoría BI",     950_000, "COP", "income",  dt(2026, 4,20), main_acc, "Freelance",            None),
    ("Medicamentos",                  48_000, "COP", "expense", dt(2026, 4,21), nequi,    "Salud",                None),
]

ok = 0
for desc, amount, currency, ttype, occurred_at, acc_id, cat_name, pocket_id in txs:
    payload = {
        "description": desc,
        "amount": amount,
        "currency": currency,
        "transaction_type": ttype,
        "occurred_at": occurred_at,
        "account_id": acc_id,
        "category_id": cats.get(cat_name),
        "pocket_id": pocket_id,
    }
    res = api("POST", "/transactions/", token, json=payload)
    if res:
        ok += 1

print(f"\n✅ Seed completo: {ok}/{len(txs)} transacciones creadas")
print(f"   Bancos: {len(banks)} | Cuentas: {len(accounts)} | Pockets: {len(pockets)} | Categorías: {len(cats)}")
