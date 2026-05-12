#!/usr/bin/env python3
"""
Final seed for LOW severity alerts (fixed_payment_due_soon) for jane.doe@sgb.co.

Uses a fixed category (Servicios públicos) with recurring transactions to trigger
fixed_payment_due_soon alerts when the next payment is due in 3-7 days.
"""
from datetime import datetime, timedelta

import httpx

BASE = "http://localhost:8000/api/v1"
EMAIL = "jane.doe@sgb.co"
PASSWORD = "Strong/Pass|123"


def api(client: httpx.Client, method: str, path: str, token: str, **kwargs):
    """Helper to make API calls with auth."""
    headers = {"Authorization": f"Bearer {token}"}
    url = f"{BASE}{path}"
    r = client.request(method, url, headers=headers, **kwargs)
    if not r.is_success:
        print(f"  ERROR {method} {path}: {r.status_code}")
        return None
    return r.json()


def main():
    """Main seed routine."""
    with httpx.Client(timeout=20) as client:
        # === LOGIN ===
        login_res = client.post(
            f"{BASE}/auth/login",
            json={"email": EMAIL, "password": PASSWORD},
        )
        login_res.raise_for_status()
        token = login_res.json()["access_token"]
        print(f"✓ Login as {EMAIL}")

        # === GET ACCOUNTS ===
        accounts_res = api(client, "GET", "/accounts/", token)
        if not accounts_res:
            print("✗ No accounts found")
            return
        main_acc = accounts_res[0]["id"]
        print(f"✓ Using account {main_acc}")

        # === GET CATEGORIES ===
        cats_res = api(client, "GET", "/categories/", token)
        if not cats_res:
            print("✗ No categories found")
            return

        cats = {c.get("name"): c for c in cats_res if c.get("id")}

        # Find a fixed category
        fixed_cat = cats.get("Servicios públicos")
        if not fixed_cat:
            print("✗ 'Servicios públicos' category not found")
            return

        print(f"✓ Using fixed category: Servicios públicos (id={fixed_cat['id']})")

        now = datetime.now()

        # === CREATE RECURRING PAYMENTS FOR LOW ALERTS ===
        print("\n⏰ Creating LOW severity alerts (fixed_payment_due_soon)...")

        # Pattern 1: Payment due in ~5 days
        # Transaction 30 days ago on day 12
        txn1_date = now - timedelta(days=30)
        txn1_date = txn1_date.replace(day=12)
        api(
            client,
            "POST",
            "/transactions/",
            token,
            json={
                "description": "Servicios públicos - agua y luz",
                "amount": 85_000,
                "currency": "COP",
                "transaction_type": "expense",
                "occurred_at": txn1_date.isoformat(),
                "account_id": main_acc,
                "category_id": fixed_cat["id"],
            },
        )
        print(f"  ✓ Payment 30 days ago (day 12)")

        # Transaction 5 days ago (same day of month to establish pattern)
        txn2_date = now - timedelta(days=5)
        txn2_date = txn2_date.replace(day=min(12, 31))
        api(
            client,
            "POST",
            "/transactions/",
            token,
            json={
                "description": "Servicios públicos - agua y luz",
                "amount": 85_000,
                "currency": "COP",
                "transaction_type": "expense",
                "occurred_at": txn2_date.isoformat(),
                "account_id": main_acc,
                "category_id": fixed_cat["id"],
            },
        )
        print(f"  ✓ Payment 5 days ago (establishes monthly pattern, due ~7 days from now)")

        # Pattern 2: Payment due in ~3 days
        # Transaction 28 days ago on day 10
        txn3_date = now - timedelta(days=28)
        txn3_date = txn3_date.replace(day=10)
        api(
            client,
            "POST",
            "/transactions/",
            token,
            json={
                "description": "Internet y teléfono",
                "amount": 65_000,
                "currency": "COP",
                "transaction_type": "expense",
                "occurred_at": txn3_date.isoformat(),
                "account_id": main_acc,
                "category_id": fixed_cat["id"],
            },
        )
        print(f"  ✓ Payment 28 days ago (day 10)")

        # Transaction 3 days ago
        txn4_date = now - timedelta(days=3)
        api(
            client,
            "POST",
            "/transactions/",
            token,
            json={
                "description": "Internet y teléfono",
                "amount": 65_000,
                "currency": "COP",
                "transaction_type": "expense",
                "occurred_at": txn4_date.isoformat(),
                "account_id": main_acc,
                "category_id": fixed_cat["id"],
            },
        )
        print(f"  ✓ Payment 3 days ago (establishes monthly pattern, due ~5 days from now)")

        print("\n✅ Seed completed!")
        print("\nExpected: 2 LOW alerts (fixed_payment_due_soon) in 3-7 days")


if __name__ == "__main__":
    main()
