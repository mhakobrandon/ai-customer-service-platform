"""
Banking Mock Database Session
Separate SQLite database simulating a banking provider (EcoCash / ZIG / USD)
so we can test balance-check and transaction-history APIs without touching
the production customer-service database.
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from typing import AsyncGenerator

BANKING_DB_URL = "sqlite+aiosqlite:///./banking_mock.db"

banking_engine = create_async_engine(
    BANKING_DB_URL,
    echo=False,
    connect_args={"check_same_thread": False},
)

banking_session_maker = async_sessionmaker(
    banking_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

BankingBase = declarative_base()


async def get_banking_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for getting the banking mock database session."""
    async with banking_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
