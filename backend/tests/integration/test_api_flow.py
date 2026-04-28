from uuid import uuid4

TEST_PASSWORD = f"AtlasFinanceTestPwd-{uuid4().hex}"


def _auth_headers(client, email: str = "api@test.com"):
    register_resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "full_name": "API User",
            "password": TEST_PASSWORD,
        },
    )
    assert register_resp.status_code == 201

    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": TEST_PASSWORD},
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

    funding_resp = client.post(
        "/api/v1/transactions/",
        json={
            "description": "Saldo inicial",
            "amount": 1000,
            "currency": "COP",
            "transaction_type": "income",
            "occurred_at": "2026-04-01T07:00:00Z",
            "account_id": account_id,
            "is_initial_balance": True,
        },
        headers=headers,
    )
    assert funding_resp.status_code == 201
    funding_txn_id = funding_resp.json()["id"]

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
    assert len(list_resp.json()) == 2
    assert any(item["amount"] == 75 for item in list_resp.json())

    delete_txn_resp = client.delete(f"/api/v1/transactions/{txn_id}", headers=headers)
    assert delete_txn_resp.status_code == 204

    delete_funding_resp = client.delete(f"/api/v1/transactions/{funding_txn_id}", headers=headers)
    assert delete_funding_resp.status_code == 204

    list_after_delete_resp = client.get("/api/v1/transactions/", headers=headers)
    assert list_after_delete_resp.status_code == 200
    assert len(list_after_delete_resp.json()) == 0

    delete_missing_resp = client.delete(f"/api/v1/transactions/{txn_id}", headers=headers)
    assert delete_missing_resp.status_code == 404

    metrics_resp = client.get("/api/v1/metrics/dashboard?currency=COP", headers=headers)
    assert metrics_resp.status_code == 200
    body = metrics_resp.json()
    assert body["total_expenses"] == 0


def test_management_endpoints_cover_update_and_delete_paths(client):
    headers = _auth_headers(client, email="api-manage@test.com")

    bank_resp = client.post(
        "/api/v1/banks/",
        json={"name": "Banco Uno", "country_code": "CO"},
        headers=headers,
    )
    assert bank_resp.status_code == 201
    bank_id = bank_resp.json()["id"]

    second_bank_resp = client.post(
        "/api/v1/banks/",
        json={"name": "Banco Dos", "country_code": "US"},
        headers=headers,
    )
    assert second_bank_resp.status_code == 201
    second_bank_id = second_bank_resp.json()["id"]

    update_bank_resp = client.put(
        f"/api/v1/banks/{second_bank_id}",
        json={"name": "Banco Dos Editado", "country_code": "MX"},
        headers=headers,
    )
    assert update_bank_resp.status_code == 200
    assert update_bank_resp.json()["country_code"] == "MX"

    account_resp = client.post(
        "/api/v1/accounts/",
        json={
            "name": "Cuenta Uno",
            "account_type": "savings",
            "currency": "COP",
            "current_balance": 0,
            "bank_id": bank_id,
        },
        headers=headers,
    )
    assert account_resp.status_code == 201
    account_id = account_resp.json()["id"]

    removable_account_resp = client.post(
        "/api/v1/accounts/",
        json={
            "name": "Cuenta Borrar",
            "account_type": "checking",
            "currency": "USD",
            "current_balance": 0,
            "bank_id": second_bank_id,
        },
        headers=headers,
    )
    assert removable_account_resp.status_code == 201
    removable_account_id = removable_account_resp.json()["id"]

    update_account_resp = client.put(
        f"/api/v1/accounts/{account_id}",
        json={
            "name": "Cuenta Uno Editada",
            "account_type": "checking",
            "currency": "USD",
            "bank_id": second_bank_id,
        },
        headers=headers,
    )
    assert update_account_resp.status_code == 200
    assert update_account_resp.json()["name"] == "Cuenta Uno Editada"

    delete_account_resp = client.delete(f"/api/v1/accounts/{removable_account_id}", headers=headers)
    assert delete_account_resp.status_code == 204

    category_resp = client.post(
        "/api/v1/categories/",
        json={"name": "editar-categoria", "description": "original"},
        headers=headers,
    )
    assert category_resp.status_code == 201
    category_id = category_resp.json()["id"]

    update_category_resp = client.put(
        f"/api/v1/categories/{category_id}",
        json={"name": "categoria-editada", "description": "actualizada", "is_fixed": True},
        headers=headers,
    )
    assert update_category_resp.status_code == 200
    assert update_category_resp.json()["is_fixed"] is True

    delete_category_resp = client.delete(f"/api/v1/categories/{category_id}", headers=headers)
    assert delete_category_resp.status_code == 204

    delete_bank_resp = client.delete(f"/api/v1/banks/{bank_id}", headers=headers)
    assert delete_bank_resp.status_code == 204


def test_logout_revokes_access_token(client):
    headers = _auth_headers(client)

    me_before = client.get("/api/v1/auth/me", headers=headers)
    assert me_before.status_code == 200

    logout_resp = client.post("/api/v1/auth/logout", headers=headers)
    assert logout_resp.status_code == 204

    # A copied token must no longer grant access after logout.
    me_after = client.get("/api/v1/auth/me", headers=headers)
    assert me_after.status_code == 401


def test_categories_are_global_across_authenticated_users(client):
    first_headers = _auth_headers(client, email="api-global-1@test.com")
    create_resp = client.post("/api/v1/categories/", json={"name": "shared-api-category"}, headers=first_headers)
    assert create_resp.status_code == 201
    created_id = create_resp.json()["id"]

    second_headers = _auth_headers(client, email="api-global-2@test.com")
    list_resp = client.get("/api/v1/categories/", headers=second_headers)
    assert list_resp.status_code == 200
    assert any(category["id"] == created_id for category in list_resp.json())


def test_countries_crud_endpoints(client):
    headers = _auth_headers(client, email="api-countries@test.com")

    create_resp = client.post(
        "/api/v1/countries/",
        json={"code": "AR", "name": "Argentina"},
        headers=headers,
    )
    assert create_resp.status_code == 201
    created_country_id = create_resp.json()["id"]

    duplicate_code_resp = client.post(
        "/api/v1/countries/",
        json={"code": "ar", "name": "Canadá"},
        headers=headers,
    )
    assert duplicate_code_resp.status_code == 400

    list_resp = client.get("/api/v1/countries/", headers=headers)
    assert list_resp.status_code == 200
    assert any(item["code"] == "AR" for item in list_resp.json())

    update_resp = client.put(
        f"/api/v1/countries/{created_country_id}",
        json={"name": "México", "code": "MX"},
        headers=headers,
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["name"] == "México"
    assert update_resp.json()["code"] == "MX"

    delete_resp = client.delete(f"/api/v1/countries/{created_country_id}", headers=headers)
    assert delete_resp.status_code == 204

    delete_missing_resp = client.delete(f"/api/v1/countries/{created_country_id}", headers=headers)
    assert delete_missing_resp.status_code == 404
