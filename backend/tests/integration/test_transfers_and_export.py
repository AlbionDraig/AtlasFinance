"""Integration tests for transfer, pocket move-funds and CSV export endpoints.

These flows have non-trivial side effects (multiple balances mutated atomically,
streaming response, filter forwarding) so they live in their own module to keep
`test_api_flow.py` focused on the main happy path.
"""
from uuid import uuid4

TEST_PASSWORD = f"AtlasFinanceTestPwd-{uuid4().hex}"


def _auth_headers(client, email: str):
    register_resp = client.post(
        "/api/v1/auth/register",
        json={"email": email, "full_name": "Tester", "password": TEST_PASSWORD},
    )
    assert register_resp.status_code == 201
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": TEST_PASSWORD},
    )
    assert login_resp.status_code == 200
    return {"Authorization": f"Bearer {login_resp.json()['access_token']}"}


def _create_bank_and_account(client, headers, *, name: str, currency: str = "COP", balance: int = 1000):
    bank_resp = client.post(
        "/api/v1/banks/",
        json={"name": f"Bank-{name}-{uuid4().hex[:6]}", "country_code": "CO"},
        headers=headers,
    )
    assert bank_resp.status_code == 201
    bank_id = bank_resp.json()["id"]

    account_resp = client.post(
        "/api/v1/accounts/",
        json={
            "name": name,
            "account_type": "savings",
            "currency": currency,
            "current_balance": balance,
            "bank_id": bank_id,
        },
        headers=headers,
    )
    assert account_resp.status_code == 201
    account_id = account_resp.json()["id"]

    # Fund the account with an explicit initial-balance transaction so the
    # service-layer balance matches what the user declared at creation.
    if balance > 0:
        funding_resp = client.post(
            "/api/v1/transactions/",
            json={
                "description": "Saldo inicial",
                "amount": balance,
                "currency": currency,
                "transaction_type": "income",
                "occurred_at": "2026-04-01T00:00:00Z",
                "account_id": account_id,
                "is_initial_balance": True,
            },
            headers=headers,
        )
        assert funding_resp.status_code == 201

    return account_id


# ---------------------------------------------------------------------------
# /api/v1/transactions/transfer
# ---------------------------------------------------------------------------


def test_transfer_creates_two_legs_and_updates_balances(client):
    headers = _auth_headers(client, email=f"xfer-ok-{uuid4().hex}@test.com")
    src_id = _create_bank_and_account(client, headers, name="Origen", balance=1000)
    dst_id = _create_bank_and_account(client, headers, name="Destino", balance=0)

    resp = client.post(
        "/api/v1/transactions/transfer",
        json={
            "from_account_id": src_id,
            "to_account_id": dst_id,
            "amount": 250,
            "occurred_at": "2026-04-15T10:00:00Z",
        },
        headers=headers,
    )
    assert resp.status_code == 201, resp.json()
    legs = resp.json()
    assert len(legs) == 2
    debit, credit = legs
    assert debit["transaction_type"] == "expense"
    assert debit["account_id"] == src_id
    assert credit["transaction_type"] == "income"
    assert credit["account_id"] == dst_id
    assert float(debit["amount"]) == 250
    assert float(credit["amount"]) == 250

    # Both legs are persisted (visible in the listing) on top of the funding tx.
    list_resp = client.get("/api/v1/transactions/", headers=headers)
    assert list_resp.status_code == 200
    assert list_resp.json()["total"] == 3


def test_transfer_rejects_same_account(client):
    headers = _auth_headers(client, email=f"xfer-same-{uuid4().hex}@test.com")
    account_id = _create_bank_and_account(client, headers, name="Solo", balance=500)

    resp = client.post(
        "/api/v1/transactions/transfer",
        json={
            "from_account_id": account_id,
            "to_account_id": account_id,
            "amount": 100,
            "occurred_at": "2026-04-15T10:00:00Z",
        },
        headers=headers,
    )
    assert resp.status_code == 400


def test_transfer_rejects_insufficient_funds_and_rolls_back(client):
    headers = _auth_headers(client, email=f"xfer-funds-{uuid4().hex}@test.com")
    src_id = _create_bank_and_account(client, headers, name="Pobre", balance=50)
    dst_id = _create_bank_and_account(client, headers, name="Rico", balance=0)

    resp = client.post(
        "/api/v1/transactions/transfer",
        json={
            "from_account_id": src_id,
            "to_account_id": dst_id,
            "amount": 500,
            "occurred_at": "2026-04-15T10:00:00Z",
        },
        headers=headers,
    )
    assert resp.status_code == 400

    # Solo la transacción de saldo inicial debe quedar (los legs hicieron rollback).
    list_resp = client.get("/api/v1/transactions/", headers=headers)
    assert list_resp.status_code == 200
    assert list_resp.json()["total"] == 1


def test_transfer_rejects_missing_destination(client):
    headers = _auth_headers(client, email=f"xfer-miss-{uuid4().hex}@test.com")
    src_id = _create_bank_and_account(client, headers, name="Origen", balance=1000)

    resp = client.post(
        "/api/v1/transactions/transfer",
        json={
            "from_account_id": src_id,
            "to_account_id": 999_999,
            "amount": 100,
            "occurred_at": "2026-04-15T10:00:00Z",
        },
        headers=headers,
    )
    assert resp.status_code == 400


# ---------------------------------------------------------------------------
# /api/v1/pockets/move-funds
# ---------------------------------------------------------------------------


def test_move_funds_to_pocket_updates_balances(client):
    headers = _auth_headers(client, email=f"move-ok-{uuid4().hex}@test.com")
    account_id = _create_bank_and_account(client, headers, name="Cuenta", balance=1000)

    pocket_resp = client.post(
        "/api/v1/pockets/",
        json={"name": "Vacaciones", "balance": 0, "currency": "COP", "account_id": account_id},
        headers=headers,
    )
    assert pocket_resp.status_code == 201
    pocket_id = pocket_resp.json()["id"]

    move_resp = client.post(
        "/api/v1/pockets/move-funds",
        json={
            "amount": 200,
            "account_id": account_id,
            "pocket_id": pocket_id,
            "occurred_at": "2026-04-15T10:00:00Z",
        },
        headers=headers,
    )
    assert move_resp.status_code == 201
    body = move_resp.json()
    assert body["transaction_type"] == "expense"
    assert body["pocket_id"] == pocket_id
    assert body["account_id"] == account_id

    # Pocket balance increased.
    pocket_after = client.get(f"/api/v1/pockets/{pocket_id}", headers=headers).json()
    assert float(pocket_after["balance"]) == 200


def test_move_funds_rejects_insufficient_funds(client):
    headers = _auth_headers(client, email=f"move-funds-{uuid4().hex}@test.com")
    account_id = _create_bank_and_account(client, headers, name="Cuenta", balance=10)

    pocket_resp = client.post(
        "/api/v1/pockets/",
        json={"name": "Meta", "balance": 0, "currency": "COP", "account_id": account_id},
        headers=headers,
    )
    pocket_id = pocket_resp.json()["id"]

    resp = client.post(
        "/api/v1/pockets/move-funds",
        json={
            "amount": 999,
            "account_id": account_id,
            "pocket_id": pocket_id,
            "occurred_at": "2026-04-15T10:00:00Z",
        },
        headers=headers,
    )
    assert resp.status_code == 400


def test_move_funds_rejects_pocket_from_other_account(client):
    headers = _auth_headers(client, email=f"move-cross-{uuid4().hex}@test.com")
    account_a = _create_bank_and_account(client, headers, name="Cuenta-A", balance=500)
    account_b = _create_bank_and_account(client, headers, name="Cuenta-B", balance=500)

    pocket_resp = client.post(
        "/api/v1/pockets/",
        json={"name": "Solo en A", "balance": 0, "currency": "COP", "account_id": account_a},
        headers=headers,
    )
    pocket_id = pocket_resp.json()["id"]

    resp = client.post(
        "/api/v1/pockets/move-funds",
        json={
            "amount": 50,
            "account_id": account_b,
            "pocket_id": pocket_id,
            "occurred_at": "2026-04-15T10:00:00Z",
        },
        headers=headers,
    )
    assert resp.status_code == 400


def test_move_funds_returns_404_for_missing_pocket(client):
    headers = _auth_headers(client, email=f"move-404-{uuid4().hex}@test.com")
    account_id = _create_bank_and_account(client, headers, name="Cuenta", balance=500)

    resp = client.post(
        "/api/v1/pockets/move-funds",
        json={
            "amount": 50,
            "account_id": account_id,
            "pocket_id": 999_999,
            "occurred_at": "2026-04-15T10:00:00Z",
        },
        headers=headers,
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# /api/v1/pockets/withdraw
# ---------------------------------------------------------------------------


def test_withdraw_from_pocket_updates_balances(client):
    headers = _auth_headers(client, email=f"withdraw-ok-{uuid4().hex}@test.com")
    account_id = _create_bank_and_account(client, headers, name="Cuenta", balance=1000)

    pocket_resp = client.post(
        "/api/v1/pockets/",
        json={"name": "Retiro Test", "balance": 0, "currency": "COP", "account_id": account_id},
        headers=headers,
    )
    assert pocket_resp.status_code == 201
    pocket_id = pocket_resp.json()["id"]

    # First move funds into the pocket.
    client.post(
        "/api/v1/pockets/move-funds",
        json={
            "amount": 300,
            "account_id": account_id,
            "pocket_id": pocket_id,
            "occurred_at": "2026-04-15T10:00:00Z",
        },
        headers=headers,
    )

    # Then withdraw part of it back.
    withdraw_resp = client.post(
        "/api/v1/pockets/withdraw",
        json={
            "amount": 100,
            "pocket_id": pocket_id,
            "occurred_at": "2026-04-15T11:00:00Z",
        },
        headers=headers,
    )
    assert withdraw_resp.status_code == 201
    body = withdraw_resp.json()
    assert body["transaction_type"] == "income"
    assert body["pocket_id"] == pocket_id
    assert body["account_id"] == account_id

    pocket_after = client.get(f"/api/v1/pockets/{pocket_id}", headers=headers).json()
    assert float(pocket_after["balance"]) == 200


def test_withdraw_rejects_insufficient_pocket_balance(client):
    headers = _auth_headers(client, email=f"withdraw-insuf-{uuid4().hex}@test.com")
    account_id = _create_bank_and_account(client, headers, name="Cuenta", balance=500)

    pocket_resp = client.post(
        "/api/v1/pockets/",
        json={"name": "Vacio", "balance": 0, "currency": "COP", "account_id": account_id},
        headers=headers,
    )
    pocket_id = pocket_resp.json()["id"]

    resp = client.post(
        "/api/v1/pockets/withdraw",
        json={
            "amount": 1,
            "pocket_id": pocket_id,
            "occurred_at": "2026-04-15T10:00:00Z",
        },
        headers=headers,
    )
    assert resp.status_code == 400


def test_withdraw_returns_404_for_missing_pocket(client):
    headers = _auth_headers(client, email=f"withdraw-404-{uuid4().hex}@test.com")

    resp = client.post(
        "/api/v1/pockets/withdraw",
        json={
            "amount": 50,
            "pocket_id": 999_999,
            "occurred_at": "2026-04-15T10:00:00Z",
        },
        headers=headers,
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# /api/v1/transactions/export
# ---------------------------------------------------------------------------


def _seed_transactions(client, headers, account_id, category_id):
    seed = [
        ("Salario", 1000, "income", "2026-04-01T08:00:00Z"),
        ("Taxi", 25, "expense", "2026-04-02T08:00:00Z"),
        ("Cena", 75, "expense", "2026-04-03T20:00:00Z"),
    ]
    for description, amount, ttype, occurred_at in seed:
        resp = client.post(
            "/api/v1/transactions/",
            json={
                "description": description,
                "amount": amount,
                "currency": "COP",
                "transaction_type": ttype,
                "occurred_at": occurred_at,
                "account_id": account_id,
                "category_id": category_id if ttype == "expense" else None,
                "is_initial_balance": ttype == "income",
            },
            headers=headers,
        )
        assert resp.status_code == 201


def test_export_csv_returns_all_transactions_with_headers(client):
    headers = _auth_headers(client, email=f"csv-all-{uuid4().hex}@test.com")
    account_id = _create_bank_and_account(client, headers, name="Cuenta", balance=0)
    cat_resp = client.post("/api/v1/categories/", json={"name": "transport"}, headers=headers)
    category_id = cat_resp.json()["id"]
    _seed_transactions(client, headers, account_id, category_id)

    resp = client.get("/api/v1/transactions/export", headers=headers)
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/csv")
    assert "attachment" in resp.headers.get("content-disposition", "")
    assert "transactions.csv" in resp.headers.get("content-disposition", "")

    body = resp.text.strip().splitlines()
    # Header row + 3 data rows.
    assert len(body) == 4
    assert body[0].split(",") == [
        "id",
        "occurred_at",
        "description",
        "amount",
        "currency",
        "transaction_type",
        "account_id",
        "category_id",
    ]
    assert "Salario" in resp.text
    assert "Taxi" in resp.text


def test_export_csv_applies_filters(client):
    headers = _auth_headers(client, email=f"csv-filter-{uuid4().hex}@test.com")
    account_id = _create_bank_and_account(client, headers, name="Cuenta", balance=0)
    cat_resp = client.post("/api/v1/categories/", json={"name": "transport"}, headers=headers)
    category_id = cat_resp.json()["id"]
    _seed_transactions(client, headers, account_id, category_id)

    resp = client.get(
        "/api/v1/transactions/export?transaction_type=expense",
        headers=headers,
    )
    assert resp.status_code == 200
    body = resp.text
    assert "Salario" not in body  # income filtered out
    assert "Taxi" in body
    assert "Cena" in body


def test_export_csv_with_search_filter(client):
    headers = _auth_headers(client, email=f"csv-search-{uuid4().hex}@test.com")
    account_id = _create_bank_and_account(client, headers, name="Cuenta", balance=0)
    cat_resp = client.post("/api/v1/categories/", json={"name": "transport"}, headers=headers)
    category_id = cat_resp.json()["id"]
    _seed_transactions(client, headers, account_id, category_id)

    resp = client.get("/api/v1/transactions/export?search=Taxi", headers=headers)
    assert resp.status_code == 200
    rows = resp.text.strip().splitlines()
    # Header + only the Taxi row.
    assert len(rows) == 2
    assert "Taxi" in rows[1]


def test_export_csv_requires_authentication(client):
    resp = client.get("/api/v1/transactions/export")
    assert resp.status_code == 401
