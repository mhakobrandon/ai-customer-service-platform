"""
Ticket resolution scheduler
Automatically closes tickets that have remained in RESOLVED state beyond the reopen window.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta

from sqlalchemy import select

from app.database.session import async_session_maker
from app.models.ticket import Ticket, TicketStatus

logger = logging.getLogger(__name__)

RESOLVED_AUTO_CLOSE_HOURS = 48
SCHEDULER_POLL_SECONDS = 300


async def auto_close_resolved_tickets_once() -> int:
    """
    Close resolved tickets older than RESOLVED_AUTO_CLOSE_HOURS.

    Returns:
        Number of tickets closed in this pass.
    """
    closed_count = 0
    threshold = datetime.utcnow() - timedelta(hours=RESOLVED_AUTO_CLOSE_HOURS)

    async with async_session_maker() as db:
        result = await db.execute(
            select(Ticket).filter(
                Ticket.status == TicketStatus.RESOLVED,
                Ticket.resolved_at.is_not(None),
                Ticket.resolved_at <= threshold,
            )
        )
        stale_resolved = result.scalars().all()

        now = datetime.utcnow()
        for ticket in stale_resolved:
            ticket.status = TicketStatus.CLOSED
            ticket.closed_at = now
            existing_notes = ticket.resolution_notes or ""
            separator = "\n" if existing_notes else ""
            ticket.resolution_notes = (
                f"{existing_notes}{separator}[auto_close] "
                f"Auto-closed after {RESOLVED_AUTO_CLOSE_HOURS}h reopen window"
            ).strip()
            closed_count += 1

        if closed_count > 0:
            await db.commit()
            logger.info("Auto-closed %s resolved tickets", closed_count)
        else:
            await db.rollback()

    return closed_count


async def ticket_resolution_scheduler(stop_event: asyncio.Event) -> None:
    """
    Background loop to auto-close stale resolved tickets.

    Args:
        stop_event: Event used during application shutdown to stop scheduler.
    """
    logger.info(
        "Ticket resolution scheduler started (window=%sh, poll=%ss)",
        RESOLVED_AUTO_CLOSE_HOURS,
        SCHEDULER_POLL_SECONDS,
    )

    try:
        while not stop_event.is_set():
            try:
                await auto_close_resolved_tickets_once()
            except Exception:
                logger.exception("Ticket resolution scheduler pass failed")

            try:
                await asyncio.wait_for(stop_event.wait(), timeout=SCHEDULER_POLL_SECONDS)
            except asyncio.TimeoutError:
                continue
    finally:
        logger.info("Ticket resolution scheduler stopped")
