def _auth_headers(client):
    register_resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": "api@test.com",
            "full_name": "API User",
            "password": "StrongPass123",
        },
    )
    assert register_resp.status_code == 201

    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "api@test.com", "password": "StrongPass123"},
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_api_main_flow(client, monkeypatch):
    monkeypatch.setattr("app.services.finance_service.convert_currency", lambda amount, _f, _t: amount)

    headers = _auth_headers(client)

    bank_resp = client.post("/api/v1/banks/", json={"name": "Nequi", "country_code": "CO"}, headers=headers)
    assert bank_resp.status_code == 201
    bank_id = bank_resp.json()["id"]

    account_resp = client.post(
        "/api/v1/accounts/",
        json={
            "name": "Ahorros",
            "account_type": "savings",
            "currency": "COP",
            "current_balance": 1000,
            "bank_id": bank_id,
        },
        headers=headers,
    )
    assert account_resp.status_code == 201
    account_id = account_resp.json()["id"]

    pocket_resp = client.post(
        "/api/v1/pockets/",
        json={"name": "Viajes", "balance": 100, "currency": "COP", "account_id": account_id},
        headers=headers,
    )
    assert pocket_resp.status_code == 201

    category_resp = client.post("/api/v1/categories/", json={"name": "transport"}, headers=headers)
    assert category_resp.status_code == 201
    category_id = category_resp.json()["id"]

    txn_resp = client.post(
        "/api/v1/transactions/",
        json={
            "description": "Taxi",
            "amount": 50,
            "currency": "COP",
            "transaction_type": "expense",
            "occurred_at": "2026-04-01T08:00:00Z",
            "account_id": account_id,
            "category_id": category_id,
        },
        headers=headers,
    )
    assert txn_resp.status_code == 201

    list_resp = client.get("/api/v1/transactions/", headers=headers)
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 1

    metrics_resp = client.get("/api/v1/metrics/dashboard?currency=COP", headers=headers)
    assert metrics_resp.status_code == 200
    body = metrics_resp.json()
    assert body["total_expenses"] == 50


def test_ingestion_upload(client):
    headers = _auth_headers(client)

    bank_resp = client.post("/api/v1/banks/", json={"name": "Bancolombia", "country_code": "CO"}, headers=headers)
    bank_id = bank_resp.json()["id"]

    account_resp = client.post(
        "/api/v1/accounts/",
        json={
            "name": "Ahorros",
            "account_type": "savings",
            "currency": "COP",
            "current_balance": 0,
            "bank_id": bank_id,
        },
        headers=headers,
    )
    account_id = account_resp.json()["id"]

    csv_data = "Fecha,Descripcion,Valor,Tipo,Moneda\n2026-03-01,NOMINA,1000,credito,COP\n"
    upload_resp = client.post(
        "/api/v1/ingestion/upload",
        headers=headers,
        data={"source": "bancolombia", "account_id": str(account_id)},
        files={"file": ("data.csv", csv_data, "text/csv")},
    )

    assert upload_resp.status_code == 200
    assert upload_resp.json()["imported_rows"] == 1
