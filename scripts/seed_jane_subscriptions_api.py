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

    category = next((c for c in categories if c.get("name") == "Suscripciones digitales"), None)
    if category is None:
        category = next(
            (
                c
                for c in categories
                if c.get("is_fixed") is True and c.get("category_type") != "income"
            ),
            None,
        )

    if category is None:
        create_category = session.post(
            f"{BASE}/categories/",
            headers=headers,
            json={
                "name": "Suscripciones digitales",
                "description": "Recurring digital services",
                "is_fixed": True,
                "category_type": "expense",
            },
            timeout=20,
        )
        create_category.raise_for_status()
        category = create_category.json()

    accounts_resp = session.get(f"{BASE}/accounts/", headers=headers, timeout=20)
    accounts_resp.raise_for_status()
    accounts = accounts_resp.json()
    if not accounts:
        raise RuntimeError("No accounts found")
    account = accounts[0]

    now = datetime.datetime.now(datetime.timezone.utc)
    previous_month_date = now - datetime.timedelta(days=35)

    recurring_charges = [
        {
            "description": "Plan streaming premium",
            "amount": 39000,
            "occurred_at": previous_month_date,
        },
        {
            "description": "Plan streaming premium",
            "amount": 39000,
            "occurred_at": now,
        },
        {
            "description": "Cloud storage pro",
            "amount": 25000,
            "occurred_at": previous_month_date - datetime.timedelta(days=2),
        },
        {
            "description": "Cloud storage pro",
            "amount": 25000,
            "occurred_at": now - datetime.timedelta(days=1),
        },
    ]

    for charge in recurring_charges:
        payload = {
            "description": charge["description"],
            "amount": charge["amount"],
            "currency": account["currency"],
            "transaction_type": "expense",
            "occurred_at": charge["occurred_at"].isoformat().replace("+00:00", "Z"),
            "account_id": account["id"],
            "category_id": category["id"],
        }
        tx_resp = session.post(f"{BASE}/transactions/", headers=headers, json=payload, timeout=20)
        tx_resp.raise_for_status()

    alerts_resp = session.get(f"{BASE}/metrics/smart-alerts", headers=headers, timeout=20)
    alerts_resp.raise_for_status()
    summary = alerts_resp.json()

    print(
        {
            "user": EMAIL,
            "subscription_items": len(summary.get("subscriptions", [])),
            "subscriptions_annual_total": summary.get("subscriptions_annual_total"),
            "subscription_names": [item.get("name") for item in summary.get("subscriptions", [])],
            "alerts_count": len(summary.get("alerts", [])),
        }
    )


if __name__ == "__main__":
    main()
