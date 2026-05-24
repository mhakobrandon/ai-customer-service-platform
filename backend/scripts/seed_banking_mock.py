"""
Banking Mock Database — Seed Script
====================================
Run once to create banking_mock.db and populate it with:
  - 3 providers  (EcoCash / ZIG Bank / USD Account)
  - 1 account per provider for each test phone number
  - ~10 realistic transactions per account

Usage:
    cd backend
    python -m scripts.seed_banking_mock
"""

import asyncio
import uuid
import random
from datetime import datetime, timedelta

from app.database.banking_session import banking_engine, banking_session_maker, BankingBase
from app.models.banking import (
    BankingProvider, BankingAccount, BankingTransaction,
    ProviderType, Currency, TransactionType, TransactionStatus,
)

# ── Test phone numbers ─────────────────────────────────────────────────────
# Add / change these to match the phone_number values in your users table.
TEST_PHONES = [
    # Real users from ai_customer_service.db
    {"phone": "+263781900173", "name": "Brandon Mhako"},       # mhakobrandon@gmail.com
    {"phone": "+263713980073", "name": "Brandon Mhako"},       # mhakobrandon2 / thyprogrammer
    {"phone": "+263771234567", "name": "WhatsApp User 4567"},  # WhatsApp customer
    {"phone": "+263784514529", "name": "WhatsApp User 4529"},  # WhatsApp customer
    # Extra test accounts
    {"phone": "+263712000001", "name": "Test Customer A"},
    {"phone": "+263712000002", "name": "Test Customer B"},
]

PROVIDERS = [
    {
        "name": "EcoCash",
        "code": "ECOCASH",
        "provider_type": ProviderType.mobile_money,
        "currency": Currency.ZIG,
    },
    {
        "name": "ZIG Bank",
        "code": "ZIGBANK",
        "provider_type": ProviderType.bank,
        "currency": Currency.ZIG,
    },
    {
        "name": "USD Account",
        "code": "USD",
        "provider_type": ProviderType.wallet,
        "currency": Currency.USD,
    },
]

MERCHANTS = [
    "NetOne Airtime", "OK Supermarket", "Chicken Inn", "ZESA Prepaid",
    "Edgars Zimbabwe", "Simbisa Brands", "TelOne", "Pick n Pay",
    "Dangote Cement", "Colcom Foods", "ZimPost", "Innscor Africa",
    "Cashback Reward", "Transfer In", "Salary Credit", "ATM Withdrawal",
]


def _uuid() -> str:
    return str(uuid.uuid4())


def _ref() -> str:
    return f"TXN{uuid.uuid4().hex[:12].upper()}"


def _acc_num(prefix: str, idx: int) -> str:
    return f"{prefix}{idx:06d}"


def _make_transactions(account_id: str, currency: Currency,
                        starting_balance: float, count: int = 12):
    txns = []
    balance = starting_balance
    now = datetime.utcnow()

    for i in range(count, 0, -1):
        # alternate credits and debits, slightly weighted toward debits
        t_type = TransactionType.credit if (i % 3 == 0) else TransactionType.debit
        amount = round(random.uniform(5, 350), 2)

        if t_type == TransactionType.debit:
            balance = max(0.0, balance - amount)
        else:
            balance += amount

        balance = round(balance, 2)

        txns.append(BankingTransaction(
            id=_uuid(),
            account_id=account_id,
            transaction_ref=_ref(),
            transaction_type=t_type,
            amount=amount,
            currency=currency,
            balance_after=balance,
            description=f"{'Payment to' if t_type == TransactionType.debit else 'Received from'} {random.choice(MERCHANTS)}",
            merchant=random.choice(MERCHANTS),
            status=TransactionStatus.completed,
            timestamp=now - timedelta(days=i, hours=random.randint(0, 23),
                                      minutes=random.randint(0, 59)),
        ))

    return txns, balance   # return final balance for account record


async def seed():
    print("[*] Creating banking_mock.db tables ...")
    async with banking_engine.begin() as conn:
        await conn.run_sync(BankingBase.metadata.create_all)
    print("    Tables created.")

    async with banking_session_maker() as db:
        # Check if already seeded
        from sqlalchemy import select
        result = await db.execute(select(BankingProvider))
        if result.scalars().first():
            print("[!] Database already seeded -- skipping.")
            return

        # ── Create providers ──────────────────────────────────────────────
        provider_records = []
        for i, p in enumerate(PROVIDERS):
            rec = BankingProvider(id=_uuid(), **p, is_active=True)
            db.add(rec)
            provider_records.append(rec)
            print(f"    Provider: {p['name']}")

        await db.flush()   # get IDs

        # ── Create accounts + transactions ────────────────────────────────
        for customer in TEST_PHONES:
            for idx, provider in enumerate(provider_records):
                starting_balance = round(random.uniform(50, 2500), 2)
                acc_id = _uuid()
                acc_num = _acc_num(provider.code[:3], hash(customer["phone"] + provider.code) % 999999)

                txns, final_balance = _make_transactions(
                    acc_id, provider.currency, starting_balance
                )

                account = BankingAccount(
                    id=acc_id,
                    provider_id=provider.id,
                    phone_number=customer["phone"],
                    account_number=acc_num,
                    account_name=customer["name"],
                    balance=final_balance,
                    currency=provider.currency,
                    is_active=True,
                    is_primary=(idx == 0),   # first provider is primary
                )
                db.add(account)

                for t in txns:
                    db.add(t)

                print(f"    Account: {customer['phone']} -> {provider.name}  "
                      f"bal={final_balance} {provider.currency.value}  "
                      f"({len(txns)} txns)")

        await db.commit()
        print("[OK] Seed complete!  banking_mock.db is ready.")
        print("     Run the FastAPI server and test via:")
        print("     GET /api/v1/banking/balance?phone=+263784514529")
        print("     GET /api/v1/banking/transactions?phone=+263784514529")


if __name__ == "__main__":
    asyncio.run(seed())
