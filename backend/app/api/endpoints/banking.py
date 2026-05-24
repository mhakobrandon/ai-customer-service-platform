"""
Banking Mock API — /api/v1/banking
===================================
Endpoints that simulate querying a banking provider's backend.
All data comes from banking_mock.db (isolated from the main app DB).

Available endpoints
-------------------
GET  /balance         – account balance(s) for a phone number
GET  /transactions    – transaction history for a phone number
GET  /providers       – list all active providers
GET  /accounts        – all accounts linked to a phone number
POST /accounts        – create a new mock account (admin / testing)
POST /transactions    – post a mock transaction (admin / testing)
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from datetime import datetime
from pydantic import BaseModel

from app.database.banking_session import get_banking_db
from app.models.banking import (
    BankingProvider, BankingAccount, BankingTransaction,
    ProviderType, Currency, TransactionType, TransactionStatus,
)
import uuid

router = APIRouter()


# ─────────────────────────────────────────────────────────
# Response Schemas
# ─────────────────────────────────────────────────────────

class ProviderOut(BaseModel):
    id: str
    name: str
    code: str
    provider_type: str
    currency: str
    is_active: bool

    class Config:
        from_attributes = True


class AccountOut(BaseModel):
    id: str
    provider_id: str
    provider_name: str
    provider_code: str
    phone_number: str
    account_number: str
    account_name: str
    balance: float
    currency: str
    is_active: bool
    is_primary: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TransactionOut(BaseModel):
    id: str
    transaction_ref: str
    transaction_type: str
    amount: float
    currency: str
    balance_after: float
    description: Optional[str]
    merchant: Optional[str]
    status: str
    timestamp: datetime

    class Config:
        from_attributes = True


class BalanceResponse(BaseModel):
    phone_number: str
    accounts: list[AccountOut]
    total_accounts: int


class TransactionsResponse(BaseModel):
    phone_number: str
    account_number: Optional[str]
    provider_code: Optional[str]
    transactions: list[TransactionOut]
    total: int
    page: int
    page_size: int


# ─── Request bodies ──────────────────────────────────────

class CreateAccountRequest(BaseModel):
    phone_number: str
    account_name: str
    provider_code: str          # e.g. "ECOCASH"
    opening_balance: float = 0.0
    currency: str = "ZIG"


class PostTransactionRequest(BaseModel):
    account_number: str
    transaction_type: str       # "credit" | "debit"
    amount: float
    description: Optional[str] = None
    merchant: Optional[str] = None


# ─────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────

def _uuid() -> str:
    return str(uuid.uuid4())


def _ref() -> str:
    return f"TXN{uuid.uuid4().hex[:12].upper()}"


async def _get_accounts_for_phone(phone: str, db: AsyncSession) -> list:
    result = await db.execute(
        select(BankingAccount, BankingProvider)
        .join(BankingProvider, BankingAccount.provider_id == BankingProvider.id)
        .where(BankingAccount.phone_number == phone)
        .where(BankingAccount.is_active == True)
    )
    return result.all()


# ─────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────

@router.get("/providers", response_model=list[ProviderOut],
            summary="List all banking providers")
async def list_providers(db: AsyncSession = Depends(get_banking_db)):
    """Return all active banking providers (EcoCash, ZIG Bank, USD Account, ...)."""
    result = await db.execute(
        select(BankingProvider).where(BankingProvider.is_active == True)
    )
    return [
        ProviderOut(
            id=p.id,
            name=p.name,
            code=p.code,
            provider_type=p.provider_type.value,
            currency=p.currency.value,
            is_active=p.is_active,
        )
        for p in result.scalars().all()
    ]


@router.get("/balance", response_model=BalanceResponse,
            summary="Get account balance(s) for a phone number")
async def get_balance(
    phone: str = Query(..., description="Customer phone number, e.g. +263784514529"),
    provider_code: Optional[str] = Query(None, description="Filter by provider code, e.g. ECOCASH"),
    db: AsyncSession = Depends(get_banking_db),
):
    """
    Returns the balance of all accounts linked to the given phone number.
    Optionally filter by provider_code.
    """
    rows = await _get_accounts_for_phone(phone, db)

    if not rows:
        raise HTTPException(
            status_code=404,
            detail=f"No accounts found for phone number {phone}. "
                   "Ensure the number is registered with a provider."
        )

    accounts = []
    for acc, prov in rows:
        if provider_code and prov.code.upper() != provider_code.upper():
            continue
        accounts.append(AccountOut(
            id=acc.id,
            provider_id=prov.id,
            provider_name=prov.name,
            provider_code=prov.code,
            phone_number=acc.phone_number,
            account_number=acc.account_number,
            account_name=acc.account_name,
            balance=acc.balance,
            currency=acc.currency.value,
            is_active=acc.is_active,
            is_primary=acc.is_primary,
            created_at=acc.created_at,
        ))

    if not accounts:
        raise HTTPException(
            status_code=404,
            detail=f"No accounts found for provider '{provider_code}' on phone {phone}."
        )

    return BalanceResponse(
        phone_number=phone,
        accounts=accounts,
        total_accounts=len(accounts),
    )


@router.get("/accounts", response_model=list[AccountOut],
            summary="List all accounts for a phone number")
async def list_accounts(
    phone: str = Query(..., description="Customer phone number"),
    db: AsyncSession = Depends(get_banking_db),
):
    """Return every account linked to this phone number across all providers."""
    rows = await _get_accounts_for_phone(phone, db)
    if not rows:
        raise HTTPException(status_code=404, detail=f"No accounts found for {phone}")

    return [
        AccountOut(
            id=acc.id,
            provider_id=prov.id,
            provider_name=prov.name,
            provider_code=prov.code,
            phone_number=acc.phone_number,
            account_number=acc.account_number,
            account_name=acc.account_name,
            balance=acc.balance,
            currency=acc.currency.value,
            is_active=acc.is_active,
            is_primary=acc.is_primary,
            created_at=acc.created_at,
        )
        for acc, prov in rows
    ]


@router.get("/transactions", response_model=TransactionsResponse,
            summary="Get transaction history for a phone number")
async def get_transactions(
    phone: str = Query(..., description="Customer phone number"),
    provider_code: Optional[str] = Query(None, description="Filter by provider, e.g. ECOCASH"),
    account_number: Optional[str] = Query(None, description="Filter by exact account number"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Results per page"),
    db: AsyncSession = Depends(get_banking_db),
):
    """
    Returns paginated transaction history for the customer.
    Filter by provider_code (e.g. ECOCASH) or exact account_number.
    """
    # Find matching accounts
    rows = await _get_accounts_for_phone(phone, db)
    if not rows:
        raise HTTPException(status_code=404, detail=f"No accounts found for {phone}")

    # Filter accounts
    account_ids = []
    for acc, prov in rows:
        if provider_code and prov.code.upper() != provider_code.upper():
            continue
        if account_number and acc.account_number != account_number:
            continue
        account_ids.append(acc.id)

    if not account_ids:
        raise HTTPException(
            status_code=404,
            detail="No matching account found for the given filters."
        )

    # Fetch transactions
    offset = (page - 1) * page_size
    result = await db.execute(
        select(BankingTransaction)
        .where(BankingTransaction.account_id.in_(account_ids))
        .order_by(BankingTransaction.timestamp.desc())
        .offset(offset)
        .limit(page_size)
    )
    txns = result.scalars().all()

    # Count total
    from sqlalchemy import func
    count_result = await db.execute(
        select(func.count(BankingTransaction.id))
        .where(BankingTransaction.account_id.in_(account_ids))
    )
    total = count_result.scalar() or 0

    return TransactionsResponse(
        phone_number=phone,
        account_number=account_number,
        provider_code=provider_code,
        transactions=[
            TransactionOut(
                id=t.id,
                transaction_ref=t.transaction_ref,
                transaction_type=t.transaction_type.value,
                amount=t.amount,
                currency=t.currency.value,
                balance_after=t.balance_after,
                description=t.description,
                merchant=t.merchant,
                status=t.status.value,
                timestamp=t.timestamp,
            )
            for t in txns
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/accounts", response_model=AccountOut, status_code=201,
             summary="Create a new mock account (for testing)")
async def create_account(
    body: CreateAccountRequest,
    db: AsyncSession = Depends(get_banking_db),
):
    """Create a new account in the mock banking DB for a given phone number."""
    # Find provider
    result = await db.execute(
        select(BankingProvider).where(BankingProvider.code == body.provider_code.upper())
    )
    provider = result.scalar_one_or_none()
    if not provider:
        raise HTTPException(
            status_code=404,
            detail=f"Provider '{body.provider_code}' not found. "
                   "Use GET /providers to see available codes."
        )

    # Build currency enum
    try:
        currency = Currency(body.currency.upper())
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid currency '{body.currency}'. Use ZIG, USD or ZWL.")

    acc_num = f"{provider.code[:3]}{uuid.uuid4().hex[:8].upper()}"
    account = BankingAccount(
        id=_uuid(),
        provider_id=provider.id,
        phone_number=body.phone_number,
        account_number=acc_num,
        account_name=body.account_name,
        balance=body.opening_balance,
        currency=currency,
        is_active=True,
        is_primary=False,
    )
    db.add(account)
    await db.flush()

    return AccountOut(
        id=account.id,
        provider_id=provider.id,
        provider_name=provider.name,
        provider_code=provider.code,
        phone_number=account.phone_number,
        account_number=account.account_number,
        account_name=account.account_name,
        balance=account.balance,
        currency=account.currency.value,
        is_active=account.is_active,
        is_primary=account.is_primary,
        created_at=account.created_at or datetime.utcnow(),
    )


@router.post("/transactions", response_model=TransactionOut, status_code=201,
             summary="Post a mock transaction (for testing)")
async def post_transaction(
    body: PostTransactionRequest,
    db: AsyncSession = Depends(get_banking_db),
):
    """Credit or debit a mock account and record the transaction."""
    result = await db.execute(
        select(BankingAccount).where(BankingAccount.account_number == body.account_number)
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail=f"Account '{body.account_number}' not found.")

    try:
        t_type = TransactionType(body.transaction_type.lower())
    except ValueError:
        raise HTTPException(status_code=400, detail="transaction_type must be 'credit' or 'debit'")

    if t_type == TransactionType.debit:
        if account.balance < body.amount:
            raise HTTPException(status_code=400, detail="Insufficient balance for this debit.")
        account.balance = round(account.balance - body.amount, 2)
    else:
        account.balance = round(account.balance + body.amount, 2)

    txn = BankingTransaction(
        id=_uuid(),
        account_id=account.id,
        transaction_ref=_ref(),
        transaction_type=t_type,
        amount=body.amount,
        currency=account.currency,
        balance_after=account.balance,
        description=body.description,
        merchant=body.merchant,
        status=TransactionStatus.completed,
        timestamp=datetime.utcnow(),
    )
    db.add(txn)
    await db.flush()

    return TransactionOut(
        id=txn.id,
        transaction_ref=txn.transaction_ref,
        transaction_type=txn.transaction_type.value,
        amount=txn.amount,
        currency=txn.currency.value,
        balance_after=txn.balance_after,
        description=txn.description,
        merchant=txn.merchant,
        status=txn.status.value,
        timestamp=txn.timestamp,
    )
