"""
Add missing phone numbers to an already-seeded banking_mock.db.
Run: python -m scripts.add_missing_phones
"""
import asyncio
import uuid
import random
from datetime import datetime, timedelta

from app.database.banking_session import banking_engine, banking_session_maker, BankingBase
from app.models.banking import (
    BankingProvider, BankingAccount, BankingTransaction,
    Currency, TransactionType, TransactionStatus,
)
from sqlalchemy import select

MISSING_PHONES = [
    {"phone": "+263781900173", "name": "Brandon Mhako"},
    {"phone": "+263713980073", "name": "Brandon Mhako"},
]

MERCHANTS = [
    "NetOne Airtime", "OK Supermarket", "Chicken Inn", "ZESA Prepaid",
    "Edgars Zimbabwe", "TelOne", "Pick n Pay", "Cashback Reward",
    "Transfer In", "Salary Credit", "ATM Withdrawal", "Colcom Foods",
]


def _uuid(): return str(uuid.uuid4())
def _ref():  return f"TXN{uuid.uuid4().hex[:12].upper()}"


def make_transactions(account_id, currency, starting_balance, count=12):
    txns, balance = [], starting_balance
    now = datetime.utcnow()
    for i in range(count, 0, -1):
        t_type = TransactionType.credit if i % 3 == 0 else TransactionType.debit
        amount = round(random.uniform(5, 350), 2)
        balance = round(max(0.0, balance - amount) if t_type == TransactionType.debit else balance + amount, 2)
        txns.append(BankingTransaction(
            id=_uuid(), account_id=account_id, transaction_ref=_ref(),
            transaction_type=t_type, amount=amount, currency=currency,
            balance_after=balance,
            description=f"{'Payment to' if t_type == TransactionType.debit else 'Received from'} {random.choice(MERCHANTS)}",
            merchant=random.choice(MERCHANTS), status=TransactionStatus.completed,
            timestamp=now - timedelta(days=i, hours=random.randint(0, 23)),
        ))
    return txns, balance


async def run():
    async with banking_engine.begin() as conn:
        await conn.run_sync(BankingBase.metadata.create_all)

    async with banking_session_maker() as db:
        providers_res = await db.execute(select(BankingProvider))
        providers = providers_res.scalars().all()

        for customer in MISSING_PHONES:
            # Skip if already exists
            existing = await db.execute(
                select(BankingAccount).where(BankingAccount.phone_number == customer["phone"])
            )
            if existing.scalars().first():
                print(f"[SKIP] {customer['phone']} already has accounts.")
                continue

            for idx, provider in enumerate(providers):
                starting = round(random.uniform(100, 3000), 2)
                acc_id = _uuid()
                acc_num = f"{provider.code[:3]}{abs(hash(customer['phone'] + provider.code)) % 999999:06d}"
                txns, final_bal = make_transactions(acc_id, provider.currency, starting)

                account = BankingAccount(
                    id=acc_id, provider_id=provider.id,
                    phone_number=customer["phone"],
                    account_number=acc_num,
                    account_name=customer["name"],
                    balance=final_bal,
                    currency=provider.currency,
                    is_active=True, is_primary=(idx == 0),
                )
                db.add(account)
                for t in txns:
                    db.add(t)
                print(f"[ADD] {customer['phone']} -> {provider.name}  bal={final_bal} {provider.currency.value}")

        await db.commit()
        print("[OK] Done.")

if __name__ == "__main__":
    asyncio.run(run())
