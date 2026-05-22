import datetime

import requests

BASE = "http://localhost:8000/api/v1"
EMAIL = "jane.doe@sgb.co"
PASSWORD = "Strong/Pass|123"


def main() -> None:
    session = requests.Session()

    login = session.post(
        f"{BASE}/auth/login",
        json={"email": EMAIL, "password": PASSWORD},
        timeout=20,
    )
    login.raise_for_status()
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    categories_resp = session.get(f"{BASE}/categories/", headers=headers, timeout=20)
    categories_resp.raise_for_status()
    categories = categories_resp.json()

    category = next((c for c in categories if c.get("name") == "Supermercado"), None)
    if category is None:
        category = next((c for c in categories if c.get("category_type") != "income"), None)
    if category is None:
        raise RuntimeError("No expense category found")

    accounts_resp = session.get(f"{BASE}/accounts/", headers=headers, timeout=20)
    accounts_resp.raise_for_status()
    accounts = accounts_resp.json()
    if not accounts:
        raise RuntimeError("No accounts found")

    account = accounts[0]
    now = datetime.datetime.now(datetime.timezone.utc)

    budget_payload = {
        "category_id": category["id"],
        "year": now.year,
        "month": now.month,
        "amount_limit": 50000,
    }
    budget_resp = session.post(f"{BASE}/budgets/", headers=headers, json=budget_payload, timeout=20)
    if budget_resp.status_code == 400:
        month_resp = session.get(f"{BASE}/budgets/{now.year}/{now.month}", headers=headers, timeout=20)
        month_resp.raise_for_status()
        budgets = month_resp.json().get("budgets", [])
        existing = next((b for b in budgets if b.get("category_id") == category["id"]), None)
        if existing:
            update_resp = session.put(
                f"{BASE}/budgets/{existing['id']}",
                headers=headers,
                json={"amount_limit": 50000},
                timeout=20,
            )
            update_resp.raise_for_status()
    else:
        budget_resp.raise_for_status()

    transaction_payload = {
        "description": "Gasto demo smart alerts",
        "amount": 180000,
        "currency": account["currency"],
        "transaction_type": "expense",
        "occurred_at": now.isoformat().replace("+00:00", "Z"),
        "account_id": account["id"],
        "category_id": category["id"],
    }
    tx_resp = session.post(f"{BASE}/transactions/", headers=headers, json=transaction_payload, timeout=20)
    tx_resp.raise_for_status()

    alerts_resp = session.get(f"{BASE}/metrics/smart-alerts", headers=headers, timeout=20)
    alerts_resp.raise_for_status()
    summary = alerts_resp.json()

    print(
        {
            "user": EMAIL,
            "account_id": account["id"],
            "category_id": category["id"],
            "alerts_count": len(summary.get("alerts", [])),
            "alert_codes": [item.get("code") for item in summary.get("alerts", [])],
        }
    )


if __name__ == "__main__":
    main()
