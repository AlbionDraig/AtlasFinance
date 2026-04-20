from uuid import uuid4

TEST_PASSWORD = f"AtlasFinanceTestPwd-{uuid4().hex}"


def _auth_headers(client):
    register_resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": "api@test.com",
            "full_name": "API User",
            "password": TEST_PASSWORD,
        },
    )
    assert register_resp.status_code == 201

    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "api@test.com", "password": TEST_PASSWORD},
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

    bank_list_resp = client.get("/api/v1/banks/", headers=headers)
    assert bank_list_resp.status_code == 200
    assert len(bank_list_resp.json()) == 1

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

    account_list_resp = client.get("/api/v1/accounts/", headers=headers)
    assert account_list_resp.status_code == 200
    assert len(account_list_resp.json()) == 1

    pocket_resp = client.post(
        "/api/v1/pockets/",
        json={"name": "Viajes", "balance": 100, "currency": "COP", "account_id": account_id},
        headers=headers,
    )
    assert pocket_resp.status_code == 201

    category_resp = client.post("/api/v1/categories/", json={"name": "transport"}, headers=headers)
    assert category_resp.status_code == 201
    category_id = category_resp.json()["id"]

    category_list_resp = client.get("/api/v1/categories/", headers=headers)
    assert category_list_resp.status_code == 200
    assert len(category_list_resp.json()) == 1

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
    txn_id = txn_resp.json()["id"]

    update_txn_resp = client.put(
        f"/api/v1/transactions/{txn_id}",
        json={
            "description": "Taxi nocturno",
            "amount": 75,
            "currency": "COP",
            "transaction_type": "expense",
            "occurred_at": "2026-04-02T08:00:00Z",
            "account_id": account_id,
            "category_id": category_id,
        },
        headers=headers,
    )
    assert update_txn_resp.status_code == 200
    assert update_txn_resp.json()["description"] == "Taxi nocturno"

    list_resp = client.get("/api/v1/transactions/", headers=headers)
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 1
    assert list_resp.json()[0]["amount"] == 75

    delete_txn_resp = client.delete(f"/api/v1/transactions/{txn_id}", headers=headers)
    assert delete_txn_resp.status_code == 204

    list_after_delete_resp = client.get("/api/v1/transactions/", headers=headers)
    assert list_after_delete_resp.status_code == 200
    assert len(list_after_delete_resp.json()) == 0

    delete_missing_resp = client.delete(f"/api/v1/transactions/{txn_id}", headers=headers)
    assert delete_missing_resp.status_code == 404

    metrics_resp = client.get("/api/v1/metrics/dashboard?currency=COP", headers=headers)
    assert metrics_resp.status_code == 200
    body = metrics_resp.json()
    assert body["total_expenses"] == 0


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
