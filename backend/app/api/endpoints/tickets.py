"""
Ticket API Endpoints
Handles ticket management and operations
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, or_, func
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import uuid

from app.database.session import get_db
from app.core.security import get_current_active_user, require_role
from app.models.user import User, UserRole, AgentStatus
from app.models.ticket import Ticket, TicketStatus, TicketPriority, TicketCategory
from app.models.escalation import Escalation
from app.models.chat_handoff import ChatHandoff
from app.models.message import Message
from app.models.chat_session import ChatSession

router = APIRouter()


# Schemas
class TicketCreate(BaseModel):
    """Create ticket schema"""
    subject: str
    description: str
    category: TicketCategory
    priority: TicketPriority = TicketPriority.MEDIUM
    session_id: Optional[str] = None


class TicketUpdate(BaseModel):
    """Update ticket schema"""
    status: Optional[TicketStatus] = None
    resolution: Optional[str] = None
    resolution_notes: Optional[str] = None
    customer_satisfaction: Optional[int] = None


class TicketResponse(BaseModel):
    """Ticket response schema"""
    id: str
    ticket_id: str
    subject: str
    description: str
    category: str
    priority: str
    status: str
    created_at: datetime
    customer_name: Optional[str] = None
    agent_name: Optional[str] = None


class TicketResolutionConfirm(BaseModel):
    """Customer confirms the issue has been resolved."""
    customer_satisfaction: Optional[int] = None


class TicketCloseRequest(BaseModel):
    """Close request payload."""
    reason: Optional[str] = "manual_close"


REOPEN_WINDOW_HOURS = 48


def _is_ticket_staff_owner_or_manager(ticket: Ticket, user: User) -> bool:
    if user.role in (UserRole.ADMIN, UserRole.SUPERVISOR):
        return True
    return user.is_agent and ticket.assigned_agent_id == user.id


def _can_customer_reopen(ticket: Ticket) -> bool:
    if ticket.closed_at is None:
        return True
    return (datetime.utcnow() - ticket.closed_at) <= timedelta(hours=REOPEN_WINDOW_HOURS)


def _apply_resolved_state(ticket: Ticket):
    now = datetime.utcnow()
    ticket.status = TicketStatus.RESOLVED
    ticket.resolved_at = now
    ticket.updated_at = now


def _apply_closed_state(ticket: Ticket):
    now = datetime.utcnow()
    ticket.status = TicketStatus.CLOSED
    ticket.closed_at = now
    ticket.updated_at = now


async def _find_least_loaded_agent(db: AsyncSession, category: Optional[TicketCategory] = None) -> Optional[User]:
    """
    Load-balancer: find the available agent with the fewest active (non-closed/resolved) tickets.
    Prefers agents whose specialization matches the ticket category when possible.
    """
    active_statuses = [
        TicketStatus.NEW,
        TicketStatus.ASSIGNED,
        TicketStatus.IN_PROGRESS,
        TicketStatus.PENDING_CUSTOMER,
        TicketStatus.ESCALATED,
        TicketStatus.REOPENED,
    ]

    # Sub-query: count active tickets per agent
    ticket_count_sq = (
        select(
            Ticket.assigned_agent_id.label("agent_id"),
            func.count(Ticket.id).label("active_count"),
        )
        .where(
            Ticket.assigned_agent_id.isnot(None),
            Ticket.status.in_(active_statuses),
        )
        .group_by(Ticket.assigned_agent_id)
        .subquery()
    )

    # Get all active agents (available or busy – exclude offline/on_break)
    query = (
        select(User, func.coalesce(ticket_count_sq.c.active_count, 0).label("load"))
        .outerjoin(ticket_count_sq, User.id == ticket_count_sq.c.agent_id)
        .where(
            User.role == UserRole.AGENT,
            User.is_active == True,
            or_(
                User.status == AgentStatus.AVAILABLE,
                User.status == AgentStatus.BUSY,
                User.status.is_(None),
            ),
        )
        .order_by(func.coalesce(ticket_count_sq.c.active_count, 0).asc())
    )

    result = await db.execute(query)
    rows = result.all()

    if not rows:
        return None

    # Map category to specialization keyword
    spec_keyword = None
    if category:
        spec_map = {
            TicketCategory.TECHNICAL_SUPPORT: "technical",
            TicketCategory.SECURITY_ISSUE: "security",
            TicketCategory.TRANSACTION_DISPUTE: "billing",
            TicketCategory.BALANCE_INQUIRY: "billing",
            TicketCategory.COMPLAINT: "general",
        }
        spec_keyword = spec_map.get(category)

    # If there's a specialization match among the least-loaded agents, prefer them
    if spec_keyword:
        for agent, load in rows:
            if agent.specialization and spec_keyword in agent.specialization.lower():
                return agent

    # Otherwise return the agent with the fewest tickets
    return rows[0][0]


@router.post("/", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    ticket_data: TicketCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new support ticket
    
    Args:
        ticket_data: Ticket creation data
        current_user: Authenticated user
        db: Database session
    
    Returns:
        Created ticket
    """
    # Generate unique ticket ID
    ticket_id = f"TICKET{uuid.uuid4().hex[:8].upper()}"
    
    # Calculate SLA times based on priority
    response_due = datetime.utcnow() + timedelta(hours=1 if ticket_data.priority == TicketPriority.CRITICAL else 4)
    resolution_due = datetime.utcnow() + timedelta(hours=4 if ticket_data.priority == TicketPriority.CRITICAL else 24)
    
    # Load-balancer: auto-assign to the agent with the fewest active tickets
    assigned_agent = await _find_least_loaded_agent(db, category=ticket_data.category)
    initial_status = TicketStatus.ASSIGNED if assigned_agent else TicketStatus.NEW

    # Create ticket
    ticket = Ticket(
        ticket_id=ticket_id,
        customer_id=current_user.id,
        assigned_agent_id=assigned_agent.id if assigned_agent else None,
        subject=ticket_data.subject,
        description=ticket_data.description,
        category=ticket_data.category,
        priority=ticket_data.priority,
        status=initial_status,
        response_due=response_due,
        resolution_due=resolution_due
    )
    
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)
    
    return TicketResponse(
        id=ticket.id,
        ticket_id=ticket.ticket_id,
        subject=ticket.subject,
        description=ticket.description,
        category=ticket.category.value,
        priority=ticket.priority.value,
        status=ticket.status.value,
        created_at=ticket.created_at,
        customer_name=current_user.name,
        agent_name=assigned_agent.name if assigned_agent else None
    )


@router.get("/", response_model=List[TicketResponse])
async def get_tickets(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    status_filter: Optional[TicketStatus] = None,
    limit: int = 20
):
    """
    Get tickets for current user
    Customers see their tickets, agents see assigned tickets
    
    Args:
        current_user: Authenticated user
        db: Database session
        status_filter: Optional status filter
        limit: Maximum number of tickets
    
    Returns:
        List of tickets
    """
    query = select(Ticket)
    
    # Filter based on user role
    if current_user.is_customer:
        query = query.filter(Ticket.customer_id == current_user.id)
    elif current_user.is_agent:
        query = query.filter(Ticket.assigned_agent_id == current_user.id)
    
    # Apply status filter if provided
    if status_filter:
        query = query.filter(Ticket.status == status_filter)
    
    query = query.order_by(desc(Ticket.created_at)).limit(limit)
    
    result = await db.execute(query)
    tickets = result.scalars().all()
    
    return [
        TicketResponse(
            id=ticket.id,
            ticket_id=ticket.ticket_id,
            subject=ticket.subject,
            description=ticket.description,
            category=ticket.category.value,
            priority=ticket.priority.value,
            status=ticket.status.value,
            created_at=ticket.created_at
        )
        for ticket in tickets
    ]


@router.get("/admin/all", response_model=list)
async def admin_get_all_tickets(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    status_filter: Optional[TicketStatus] = None,
    priority_filter: Optional[TicketPriority] = None,
    limit: int = 200,
):
    """
    Admin/Supervisor: retrieve all tickets with full customer and agent details.
    Returns overdue flag and SLA due date per ticket.
    """
    if current_user.role not in (UserRole.ADMIN, UserRole.SUPERVISOR):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or Supervisor access required",
        )

    from sqlalchemy.orm import aliased

    CustomerUser = aliased(User)
    AgentUser = aliased(User)

    query = (
        select(Ticket, CustomerUser, AgentUser)
        .outerjoin(CustomerUser, Ticket.customer_id == CustomerUser.id)
        .outerjoin(AgentUser, Ticket.assigned_agent_id == AgentUser.id)
    )

    if status_filter:
        query = query.filter(Ticket.status == status_filter)
    if priority_filter:
        query = query.filter(Ticket.priority == priority_filter)

    query = query.order_by(desc(Ticket.created_at)).limit(limit)

    result = await db.execute(query)
    rows = result.all()

    now = datetime.utcnow()
    tickets_out = []
    for ticket, customer, agent in rows:
        is_overdue = False
        if (
            ticket.resolution_due
            and ticket.status not in (TicketStatus.RESOLVED, TicketStatus.CLOSED)
        ):
            is_overdue = now > ticket.resolution_due

        tickets_out.append(
            {
                "id": ticket.id,
                "ticket_id": ticket.ticket_id,
                "subject": ticket.subject,
                "description": ticket.description,
                "category": ticket.category.value if ticket.category else None,
                "priority": ticket.priority.value if ticket.priority else None,
                "status": ticket.status.value if ticket.status else None,
                "customer_name": customer.name if customer else None,
                "customer_email": customer.email if customer else None,
                "agent_name": agent.name if agent else None,
                "agent_email": agent.email if agent else None,
                "assigned_agent_id": ticket.assigned_agent_id,
                "created_at": ticket.created_at.isoformat() if ticket.created_at else None,
                "updated_at": ticket.updated_at.isoformat() if ticket.updated_at else None,
                "resolved_at": ticket.resolved_at.isoformat() if ticket.resolved_at else None,
                "resolution_due": ticket.resolution_due.isoformat() if ticket.resolution_due else None,
                "response_due": ticket.response_due.isoformat() if ticket.response_due else None,
                "is_overdue": is_overdue,
                "customer_satisfaction": ticket.customer_satisfaction,
            }
        )

    return tickets_out


@router.get("/{ticket_id}", response_model=dict)
async def get_ticket_details(
    ticket_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed ticket information
    
    Args:
        ticket_id: Ticket identifier
        current_user: Authenticated user
        db: Database session
    
    Returns:
        Detailed ticket information
    """
    result = await db.execute(
        select(Ticket).filter(Ticket.ticket_id == ticket_id)
    )
    ticket = result.scalar_one_or_none()
    
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )
    
    # Verify access permissions
    if current_user.is_customer and ticket.customer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    return {
        "id": ticket.id,
        "ticket_id": ticket.ticket_id,
        "subject": ticket.subject,
        "description": ticket.description,
        "category": ticket.category.value,
        "priority": ticket.priority.value,
        "status": ticket.status.value,
        "resolution": ticket.resolution,
        "resolution_notes": ticket.resolution_notes,
        "created_at": ticket.created_at.isoformat(),
        "updated_at": ticket.updated_at.isoformat() if ticket.updated_at else None,
        "resolved_at": ticket.resolved_at.isoformat() if ticket.resolved_at else None,
        "is_overdue": ticket.is_overdue
    }


@router.patch("/{ticket_id}", response_model=dict)
async def update_ticket(
    ticket_id: str,
    ticket_update: TicketUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update ticket information
    Agents can update status and resolution, customers can rate
    
    Args:
        ticket_id: Ticket identifier
        ticket_update: Update data
        current_user: Authenticated user
        db: Database session
    
    Returns:
        Updated ticket
    """
    result = await db.execute(
        select(Ticket).filter(Ticket.ticket_id == ticket_id)
    )
    ticket = result.scalar_one_or_none()
    
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )
    
    # Update fields based on role
    if _is_ticket_staff_owner_or_manager(ticket, current_user):
        if ticket_update.status:
            ticket.status = ticket_update.status
            if ticket_update.status == TicketStatus.RESOLVED:
                ticket.resolved_at = datetime.utcnow()
            elif ticket_update.status == TicketStatus.CLOSED:
                ticket.closed_at = datetime.utcnow()
            elif ticket_update.status == TicketStatus.IN_PROGRESS and not ticket.first_response_at:
                ticket.first_response_at = datetime.utcnow()
        
        if ticket_update.resolution:
            ticket.resolution = ticket_update.resolution
        
        if ticket_update.resolution_notes:
            ticket.resolution_notes = ticket_update.resolution_notes
    
    elif current_user.is_customer and ticket.customer_id == current_user.id:
        if ticket_update.customer_satisfaction:
            ticket.customer_satisfaction = ticket_update.customer_satisfaction
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    await db.commit()
    await db.refresh(ticket)
    
    return {
        "id": ticket.id,
        "ticket_id": ticket.ticket_id,
        "status": ticket.status.value,
        "message": "Ticket updated successfully"
    }


@router.post("/{ticket_id}/request-confirmation", response_model=dict)
async def request_customer_confirmation(
    ticket_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Move a ticket to pending customer confirmation after solution delivery.
    """
    result = await db.execute(select(Ticket).filter(Ticket.ticket_id == ticket_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    if not _is_ticket_staff_owner_or_manager(ticket, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    if ticket.status == TicketStatus.CLOSED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Closed tickets cannot request confirmation")

    ticket.status = TicketStatus.PENDING_CUSTOMER
    ticket.updated_at = datetime.utcnow()

    # Push a customer-visible update so it appears in the customer portal notifications.
    if ticket.session_id:
        session_result = await db.execute(select(ChatSession).filter(ChatSession.id == ticket.session_id))
        chat_session = session_result.scalar_one_or_none()
        if chat_session:
            resolution_excerpt = (ticket.resolution_notes or ticket.resolution or "").strip()
            if resolution_excerpt:
                resolution_excerpt = resolution_excerpt[:220]
                content = (
                    f"Update on ticket {ticket.ticket_id}: our support team marked this issue as resolved. "
                    f"Resolution notes: {resolution_excerpt}. "
                    "Please confirm in your portal if everything is now working."
                )
            else:
                content = (
                    f"Update on ticket {ticket.ticket_id}: our support team marked this issue as resolved. "
                    "Please confirm in your portal if everything is now working."
                )

            db.add(
                Message(
                    session_id=chat_session.id,
                    sender_id=current_user.id,
                    content=content,
                    language=chat_session.current_language or "en",
                    is_from_customer=False,
                    is_from_ai=True,
                    detected_intent="ticket_update",
                    confidence_score="1.0",
                )
            )

    await db.commit()
    await db.refresh(ticket)

    return {
        "ticket_id": ticket.ticket_id,
        "status": ticket.status.value,
        "message": "Ticket moved to pending customer confirmation",
    }


@router.post("/{ticket_id}/confirm-resolution", response_model=dict)
async def confirm_ticket_resolution(
    ticket_id: str,
    payload: TicketResolutionConfirm,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Customer confirms resolution. This is the official resolution signal.
    """
    result = await db.execute(select(Ticket).filter(Ticket.ticket_id == ticket_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    if not (
        (current_user.is_customer and ticket.customer_id == current_user.id)
        or _is_ticket_staff_owner_or_manager(ticket, current_user)
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    if payload.customer_satisfaction is not None:
        if payload.customer_satisfaction < 1 or payload.customer_satisfaction > 5:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Customer satisfaction must be between 1 and 5")
        ticket.customer_satisfaction = payload.customer_satisfaction

    _apply_resolved_state(ticket)

    await db.commit()
    await db.refresh(ticket)

    return {
        "ticket_id": ticket.ticket_id,
        "status": ticket.status.value,
        "resolved_at": ticket.resolved_at.isoformat() if ticket.resolved_at else None,
        "message": "Ticket marked as resolved",
    }


@router.post("/{ticket_id}/mark-unresolved", response_model=dict)
async def mark_ticket_unresolved(
    ticket_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Customer marks the issue as unresolved; ticket is reopened.
    """
    result = await db.execute(select(Ticket).filter(Ticket.ticket_id == ticket_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    if not (current_user.is_customer and ticket.customer_id == current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the ticket owner can mark unresolved")

    if not _can_customer_reopen(ticket):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Reopen window expired ({REOPEN_WINDOW_HOURS}h)",
        )

    ticket.status = TicketStatus.REOPENED
    ticket.closed_at = None
    ticket.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(ticket)

    return {
        "ticket_id": ticket.ticket_id,
        "status": ticket.status.value,
        "message": "Ticket reopened for follow-up",
    }


@router.post("/{ticket_id}/reopen", response_model=dict)
async def reopen_ticket(
    ticket_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Reopen endpoint for customer follow-up within allowed window.
    """
    result = await db.execute(select(Ticket).filter(Ticket.ticket_id == ticket_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    if not (current_user.is_customer and ticket.customer_id == current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the ticket owner can reopen")

    if not _can_customer_reopen(ticket):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Reopen window expired ({REOPEN_WINDOW_HOURS}h)",
        )

    ticket.status = TicketStatus.REOPENED
    ticket.closed_at = None
    ticket.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(ticket)

    return {
        "ticket_id": ticket.ticket_id,
        "status": ticket.status.value,
        "message": "Ticket reopened",
    }


@router.post("/{ticket_id}/close", response_model=dict)
async def close_ticket(
    ticket_id: str,
    payload: TicketCloseRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Close a ticket.

    - Admin/Supervisor can close any ticket.
    - Assigned agent can close escalated/resolved/pending_customer tickets.
    """
    result = await db.execute(select(Ticket).filter(Ticket.ticket_id == ticket_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    is_manager = current_user.role in (UserRole.ADMIN, UserRole.SUPERVISOR)
    is_assigned_agent = current_user.is_agent and ticket.assigned_agent_id == current_user.id
    is_claimed_handoff_agent = False

    if current_user.is_agent and ticket.session_id:
        handoff_result = await db.execute(
            select(ChatHandoff).filter(ChatHandoff.session_id == ticket.session_id)
        )
        handoff = handoff_result.scalar_one_or_none()
        if handoff and handoff.assigned_agent_id == current_user.id:
            is_claimed_handoff_agent = True
            # Backfill ownership consistency for legacy claimed tickets.
            if not ticket.assigned_agent_id:
                ticket.assigned_agent_id = current_user.id
    allowed_agent_statuses = {
        TicketStatus.NEW,
        TicketStatus.ESCALATED,
        TicketStatus.ASSIGNED,
        TicketStatus.IN_PROGRESS,
        TicketStatus.PENDING_CUSTOMER,
        TicketStatus.RESOLVED,
        TicketStatus.REOPENED,
    }

    if not (
        is_manager
        or ((is_assigned_agent or is_claimed_handoff_agent) and ticket.status in allowed_agent_statuses)
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    if ticket.status == TicketStatus.CLOSED:
        return {
            "ticket_id": ticket.ticket_id,
            "status": ticket.status.value,
            "message": "Ticket is already closed",
        }

    _apply_closed_state(ticket)
    if payload.reason:
        existing_notes = ticket.resolution_notes or ""
        separator = "\n" if existing_notes else ""
        ticket.resolution_notes = f"{existing_notes}{separator}[close_reason] {payload.reason}".strip()

    await db.commit()
    await db.refresh(ticket)

    return {
        "ticket_id": ticket.ticket_id,
        "status": ticket.status.value,
        "closed_at": ticket.closed_at.isoformat() if ticket.closed_at else None,
        "message": "Ticket closed successfully",
    }


@router.post("/{ticket_id}/assign")
async def assign_ticket(
    ticket_id: str,
    agent_id: str,
    current_user: User = Depends(require_role(["agent", "supervisor", "admin"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Assign ticket to an agent
    
    Args:
        ticket_id: Ticket identifier
        agent_id: Agent user ID
        current_user: Authenticated staff user
        db: Database session
    
    Returns:
        Assignment confirmation
    """
    # Get ticket
    result = await db.execute(
        select(Ticket).filter(Ticket.ticket_id == ticket_id)
    )
    ticket = result.scalar_one_or_none()
    
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )

    if ticket.status == TicketStatus.CLOSED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Closed tickets cannot be reassigned"
        )
    
    # Verify agent exists
    result = await db.execute(
        select(User).filter(User.id == agent_id, User.role == "agent")
    )
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    # Update ticket
    ticket.assigned_agent_id = agent_id
    ticket.status = TicketStatus.ASSIGNED
    
    await db.commit()
    
    return {
        "ticket_id": ticket.ticket_id,
        "assigned_agent_id": agent.id,
        "assigned_to": agent.name,
        "message": "Ticket assigned successfully"
    }
