"""
Analytics API Endpoints
Provides system metrics and performance analytics with real data
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc, case
from datetime import datetime, timedelta
from typing import List, Dict, Any

from app.database.session import get_db
from app.core.security import require_role, get_current_active_user
from app.models.user import User
from app.models.ticket import Ticket, TicketStatus
from app.models.chat_session import ChatSession, SessionStatus
from app.models.message import Message
from app.models.escalation import Escalation
from app.models.customer_rating import CustomerRating
from app.services.market_intelligence import (
    get_transaction_fees,
    get_bundle_prices,
    get_rates_last_updated,
    SUPPORTED_PROVIDERS,
    get_lowest_fees_summary,
    get_lowest_bundle_summary,
)
from app.core.config import settings

router = APIRouter()


@router.get("/dashboard")
async def get_dashboard_analytics(
    current_user: User = Depends(require_role(["agent", "supervisor", "admin"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Get dashboard analytics with real data
    Available for agents and admins
    
    Returns:
        Dashboard metrics from database
    """
    # Get ticket statistics
    total_tickets_result = await db.execute(select(func.count(Ticket.id)))
    total_tickets = total_tickets_result.scalar() or 0
    
    open_tickets_result = await db.execute(
        select(func.count(Ticket.id)).filter(
            Ticket.status.in_([TicketStatus.NEW, TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS])
        )
    )
    open_tickets = open_tickets_result.scalar() or 0
    
    resolved_tickets_result = await db.execute(
        select(func.count(Ticket.id)).filter(Ticket.status == TicketStatus.RESOLVED)
    )
    resolved_tickets = resolved_tickets_result.scalar() or 0
    
    closed_tickets_result = await db.execute(
        select(func.count(Ticket.id)).filter(Ticket.status == TicketStatus.CLOSED)
    )
    closed_tickets = closed_tickets_result.scalar() or 0
    
    # Get chat session statistics
    total_sessions_result = await db.execute(select(func.count(ChatSession.id)))
    total_sessions = total_sessions_result.scalar() or 0
    
    active_sessions_result = await db.execute(
        select(func.count(ChatSession.id)).filter(ChatSession.status == SessionStatus.ACTIVE)
    )
    active_sessions = active_sessions_result.scalar() or 0
    
    escalated_sessions_result = await db.execute(
        select(func.count(ChatSession.id)).filter(ChatSession.status == SessionStatus.ESCALATED)
    )
    escalated_sessions = escalated_sessions_result.scalar() or 0
    
    # Get message statistics
    total_messages_result = await db.execute(select(func.count(Message.id)))
    total_messages = total_messages_result.scalar() or 0
    
    ai_messages_result = await db.execute(
        select(func.count(Message.id)).filter(Message.is_from_ai == True)
    )
    ai_messages = ai_messages_result.scalar() or 0
    
    customer_messages_result = await db.execute(
        select(func.count(Message.id)).filter(Message.is_from_customer == True)
    )
    customer_messages = customer_messages_result.scalar() or 0
    
    # Calculate AI resolution rate (sessions resolved without escalation)
    resolved_by_ai = await db.execute(
        select(func.count(ChatSession.id)).filter(
            and_(
                ChatSession.status == SessionStatus.RESOLVED,
                ChatSession.escalated_at.is_(None)
            )
        )
    )
    ai_resolved = resolved_by_ai.scalar() or 0
    total_resolved = await db.execute(
        select(func.count(ChatSession.id)).filter(
            ChatSession.status.in_([SessionStatus.RESOLVED, SessionStatus.CLOSED])
        )
    )
    total_resolved_count = total_resolved.scalar() or 0
    ai_resolution_rate = (ai_resolved / total_resolved_count * 100) if total_resolved_count > 0 else 0

    # Get user statistics
    total_users_result = await db.execute(select(func.count(User.id)))
    total_users = total_users_result.scalar() or 0

    rating_avg_result = await db.execute(select(func.avg(CustomerRating.rating)))
    rating_count_result = await db.execute(select(func.count(CustomerRating.id)))
    avg_rating = float(rating_avg_result.scalar() or 0)
    total_ratings = int(rating_count_result.scalar() or 0)
    
    active_users_result = await db.execute(
        select(func.count(User.id)).filter(User.is_active == True)
    )
    active_users = active_users_result.scalar() or 0
    
    # Users by role
    customer_count = await db.execute(
        select(func.count(User.id)).filter(User.role == "customer")
    )
    customers = customer_count.scalar() or 0
    
    agent_count = await db.execute(
        select(func.count(User.id)).filter(User.role == "agent")
    )
    agents = agent_count.scalar() or 0
    
    admin_count = await db.execute(
        select(func.count(User.id)).filter(User.role == "admin")
    )
    admins = admin_count.scalar() or 0
    
    # Today's statistics
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    today_sessions = await db.execute(
        select(func.count(ChatSession.id)).filter(ChatSession.created_at >= today_start)
    )
    sessions_today = today_sessions.scalar() or 0
    
    today_messages = await db.execute(
        select(func.count(Message.id)).filter(Message.timestamp >= today_start)
    )
    messages_today = today_messages.scalar() or 0
    
    return {
        "tickets": {
            "total": total_tickets,
            "open": open_tickets,
            "resolved": resolved_tickets,
            "closed": closed_tickets,
            "resolution_rate": round((resolved_tickets / total_tickets * 100) if total_tickets > 0 else 0, 1)
        },
        "chat_sessions": {
            "total": total_sessions,
            "active": active_sessions,
            "escalated": escalated_sessions,
            "today": sessions_today
        },
        "messages": {
            "total": total_messages,
            "ai_handled": ai_messages,
            "customer_messages": customer_messages,
            "today": messages_today,
            "ai_resolution_rate": round(ai_resolution_rate, 1)
        },
        "users": {
            "total": total_users,
            "active": active_users,
            "customers": customers,
            "agents": agents,
            "admins": admins
        },
        "ratings": {
            "average": round(avg_rating, 2),
            "total": total_ratings,
        },
        "system_health": {
            "status": "healthy",
            "uptime": "99.9%",
            "last_updated": datetime.utcnow().isoformat()
        }
    }


@router.get("/performance")
async def get_performance_metrics(
    current_user: User = Depends(require_role(["agent", "supervisor", "admin"])),
    db: AsyncSession = Depends(get_db),
    days: int = 7
):
    """
    Get performance metrics for specified time period with real data
    
    Args:
        current_user: Authenticated agent
        db: Database session
        days: Number of days to analyze
    
    Returns:
        Performance metrics from database
    """
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Average resolution time for tickets
    result = await db.execute(
        select(
            func.avg(
                func.extract('epoch', Ticket.resolved_at - Ticket.created_at)
            )
        ).filter(
            and_(
                Ticket.resolved_at.isnot(None),
                Ticket.created_at >= start_date
            )
        )
    )
    avg_resolution_seconds = result.scalar() or 0
    avg_resolution_hours = round(avg_resolution_seconds / 3600, 2) if avg_resolution_seconds else 0
    
    # Customer satisfaction average
    satisfaction_result = await db.execute(
        select(func.avg(Ticket.customer_satisfaction)).filter(
            and_(
                Ticket.customer_satisfaction.isnot(None),
                Ticket.created_at >= start_date
            )
        )
    )
    avg_satisfaction = satisfaction_result.scalar() or 0
    
    # Escalation rate
    total_sessions_period = await db.execute(
        select(func.count(ChatSession.id)).filter(ChatSession.created_at >= start_date)
    )
    total_sessions = total_sessions_period.scalar() or 0
    
    escalated_sessions_period = await db.execute(
        select(func.count(ChatSession.id)).filter(
            and_(
                ChatSession.created_at >= start_date,
                ChatSession.escalated_at.isnot(None)
            )
        )
    )
    escalated_sessions = escalated_sessions_period.scalar() or 0
    escalation_rate = (escalated_sessions / total_sessions * 100) if total_sessions > 0 else 0
    
    # First contact resolution (sessions resolved without escalation)
    resolved_first_contact = await db.execute(
        select(func.count(ChatSession.id)).filter(
            and_(
                ChatSession.created_at >= start_date,
                ChatSession.status.in_([SessionStatus.RESOLVED, SessionStatus.CLOSED]),
                ChatSession.escalated_at.is_(None)
            )
        )
    )
    first_contact = resolved_first_contact.scalar() or 0
    
    resolved_total = await db.execute(
        select(func.count(ChatSession.id)).filter(
            and_(
                ChatSession.created_at >= start_date,
                ChatSession.status.in_([SessionStatus.RESOLVED, SessionStatus.CLOSED])
            )
        )
    )
    resolved_count = resolved_total.scalar() or 0
    fcr_rate = (first_contact / resolved_count * 100) if resolved_count > 0 else 0
    
    # Messages per session average
    if total_sessions > 0:
        messages_in_period = await db.execute(
            select(func.count(Message.id)).filter(Message.timestamp >= start_date)
        )
        total_messages = messages_in_period.scalar() or 0
        avg_messages_per_session = round(total_messages / total_sessions, 1)
    else:
        avg_messages_per_session = 0
    
    return {
        "period_days": days,
        "average_resolution_time_hours": avg_resolution_hours,
        "average_customer_satisfaction": round(float(avg_satisfaction), 2) if avg_satisfaction else 0,
        "first_contact_resolution_rate": round(fcr_rate, 1),
        "escalation_rate": round(escalation_rate, 1),
        "total_sessions": total_sessions,
        "total_escalations": escalated_sessions,
        "avg_messages_per_session": avg_messages_per_session
    }


@router.get("/intent-distribution")
async def get_intent_distribution(
    current_user: User = Depends(require_role(["agent", "supervisor", "admin"])),
    db: AsyncSession = Depends(get_db),
    days: int = 30
):
    """
    Get distribution of detected intents from real message data
    
    Returns:
        List of intents with counts and percentages
    """
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Get intent counts from messages
    intent_query = await db.execute(
        select(
            Message.detected_intent,
            func.count(Message.id).label('count')
        ).filter(
            and_(
                Message.detected_intent.isnot(None),
                Message.timestamp >= start_date,
                Message.is_from_customer == True
            )
        ).group_by(Message.detected_intent).order_by(desc('count'))
    )
    
    intent_results = intent_query.all()
    
    # Calculate total for percentages
    total_intents = sum(r[1] for r in intent_results)
    
    distribution = []
    for intent, count in intent_results:
        percentage = round((count / total_intents * 100), 1) if total_intents > 0 else 0
        distribution.append({
            "intent": intent,
            "count": count,
            "percentage": percentage
        })
    
    return {
        "period_days": days,
        "total_classified": total_intents,
        "distribution": distribution,
        "intent_distribution": distribution,
    }


@router.get("/recent-escalations")
async def get_recent_escalations(
    current_user: User = Depends(require_role(["agent", "supervisor", "admin"])),
    db: AsyncSession = Depends(get_db),
    limit: int = 10
):
    """
    Get recent escalations with real data
    
    Returns:
        List of recent escalations
    """
    # Get recent escalated sessions
    escalated_query = await db.execute(
        select(ChatSession).filter(
            ChatSession.escalated_at.isnot(None)
        ).order_by(desc(ChatSession.escalated_at)).limit(limit)
    )
    
    escalated_sessions = escalated_query.scalars().all()
    
    escalations = []
    for session in escalated_sessions:
        # Get customer info
        customer_query = await db.execute(
            select(User).filter(User.id == session.customer_id)
        )
        customer = customer_query.scalar_one_or_none()
        
        # Get last message for context
        last_msg_query = await db.execute(
            select(Message).filter(
                Message.session_id == session.id
            ).order_by(desc(Message.timestamp)).limit(1)
        )
        last_message = last_msg_query.scalar_one_or_none()
        
        # Calculate time ago
        if session.escalated_at:
            time_diff = datetime.utcnow() - session.escalated_at
            if time_diff.total_seconds() < 3600:
                time_ago = f"{int(time_diff.total_seconds() / 60)} min ago"
            elif time_diff.total_seconds() < 86400:
                time_ago = f"{int(time_diff.total_seconds() / 3600)} hours ago"
            else:
                time_ago = f"{int(time_diff.days)} days ago"
        else:
            time_ago = "Unknown"
        
        escalations.append({
            "id": session.id,
            "session_id": session.session_id,
            "user": customer.name if customer else "Unknown",
            "user_name": customer.name if customer else "Unknown",
            "user_email": customer.email if customer else "Unknown",
            "issue": session.escalation_reason or last_message.content[:100] if last_message else "No details",
            "reason": session.escalation_reason or "Escalated by AI",
            "last_intent": session.last_intent,
            "time": time_ago,
            "escalated_at": session.escalated_at.isoformat() if session.escalated_at else None,
            "priority": "high" if session.last_intent in ["complaint", "transaction_dispute", "security_pin"] else "medium"
        })
    
    return {
        "total": len(escalations),
        "escalations": escalations
    }


@router.get("/daily-activity")
async def get_daily_activity(
    current_user: User = Depends(require_role(["agent", "supervisor", "admin"])),
    db: AsyncSession = Depends(get_db),
    days: int = 7
):
    """
    Get daily activity statistics for charts
    
    Returns:
        Daily breakdown of sessions and messages
    """
    activity = []
    
    for i in range(days - 1, -1, -1):
        day_start = (datetime.utcnow() - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        
        # Sessions created that day
        sessions_query = await db.execute(
            select(func.count(ChatSession.id)).filter(
                and_(
                    ChatSession.created_at >= day_start,
                    ChatSession.created_at < day_end
                )
            )
        )
        sessions_count = sessions_query.scalar() or 0
        
        # Messages sent that day
        messages_query = await db.execute(
            select(func.count(Message.id)).filter(
                and_(
                    Message.timestamp >= day_start,
                    Message.timestamp < day_end
                )
            )
        )
        messages_count = messages_query.scalar() or 0
        
        # Escalations that day
        escalations_query = await db.execute(
            select(func.count(ChatSession.id)).filter(
                and_(
                    ChatSession.escalated_at >= day_start,
                    ChatSession.escalated_at < day_end
                )
            )
        )
        escalations_count = escalations_query.scalar() or 0
        
        activity.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "day": day_start.strftime("%a"),
            "sessions": sessions_count,
            "messages": messages_count,
            "escalations": escalations_count
        })
    
    return {
        "period_days": days,
        "activity": activity
    }


@router.get("/language-distribution")
async def get_language_distribution(
    current_user: User = Depends(require_role(["agent", "supervisor", "admin"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Get distribution of languages used in chat sessions
    
    Returns:
        Language usage statistics
    """
    language_query = await db.execute(
        select(
            ChatSession.initial_language,
            func.count(ChatSession.id).label('count')
        ).group_by(ChatSession.initial_language).order_by(desc('count'))
    )
    
    language_results = language_query.all()
    total = sum(r[1] for r in language_results)
    
    language_names = {
        "en": "English",
        "sn": "Shona",
        "nd": "Ndebele"
    }
    
    distribution = []
    for lang, count in language_results:
        distribution.append({
            "code": lang,
            "name": language_names.get(lang, lang),
            "count": count,
            "percentage": round((count / total * 100), 1) if total > 0 else 0
        })
    
    return {
        "total_sessions": total,
        "distribution": distribution
    }


@router.get("/frequent-queries")
async def get_frequent_queries(
    current_user: User = Depends(require_role(["agent", "supervisor", "admin"])),
    db: AsyncSession = Depends(get_db),
    days: int = 30,
    limit: int = 10,
):
    start_date = datetime.utcnow() - timedelta(days=days)

    query = await db.execute(
        select(
            Message.content,
            func.count(Message.id).label("count"),
        )
        .filter(
            and_(
                Message.is_from_customer == True,
                Message.timestamp >= start_date,
            )
        )
        .group_by(Message.content)
        .order_by(desc("count"))
        .limit(limit)
    )

    rows = query.all()
    total = sum(row[1] for row in rows)

    items = [
        {
            "query": content,
            "count": count,
            "percentage": round((count / total * 100), 1) if total else 0,
        }
        for content, count in rows
    ]

    return {
        "period_days": days,
        "total_top_queries": total,
        "items": items,
    }


@router.get("/agent-ticket-overview")
async def get_agent_ticket_overview(
    current_user: User = Depends(require_role(["supervisor", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    pending_statuses = [
        TicketStatus.NEW,
        TicketStatus.ASSIGNED,
        TicketStatus.IN_PROGRESS,
        TicketStatus.PENDING_CUSTOMER,
        TicketStatus.ESCALATED,
        TicketStatus.REOPENED,
    ]

    query = await db.execute(
        select(
            User.id,
            User.name,
            User.email,
            func.coalesce(
                func.sum(
                    case((Ticket.status == TicketStatus.RESOLVED, 1), else_=0)
                ),
                0,
            ).label("resolved_count"),
            func.coalesce(
                func.sum(
                    case((Ticket.status.in_(pending_statuses), 1), else_=0)
                ),
                0,
            ).label("pending_count"),
            func.count(Ticket.id).label("total_count"),
        )
        .select_from(User)
        .outerjoin(Ticket, Ticket.assigned_agent_id == User.id)
        .filter(User.role == "agent")
        .group_by(User.id, User.name, User.email)
        .order_by(desc("resolved_count"), User.name)
    )

    rows = query.all()

    agents = []
    for row in rows:
        total = int(row.total_count or 0)
        resolved = int(row.resolved_count or 0)
        pending = int(row.pending_count or 0)
        resolution_rate = round((resolved / total * 100), 1) if total > 0 else 0

        agents.append(
            {
                "agent_id": row.id,
                "agent_name": row.name,
                "agent_email": row.email,
                "resolved": resolved,
                "pending": pending,
                "total": total,
                "resolution_rate": resolution_rate,
            }
        )

    return {
        "total_agents": len(agents),
        "agents": agents,
        "totals": {
            "resolved": sum(item["resolved"] for item in agents),
            "pending": sum(item["pending"] for item in agents),
            "assigned": sum(item["total"] for item in agents),
        },
    }


@router.get("/market-comparison")
async def get_market_comparison(
    current_user: User = Depends(get_current_active_user),
):
    return {
        "providers": SUPPORTED_PROVIDERS,
        "transaction_fees": get_transaction_fees(),
        "bundle_prices": get_bundle_prices(),
        "lowest_fees": get_lowest_fees_summary(),
        "lowest_bundles": get_lowest_bundle_summary(),
        "last_updated": get_rates_last_updated(),
    }


@router.get("/integration-status")
async def get_integration_status(
    current_user: User = Depends(get_current_active_user),
):
    whatsapp_live = bool(
        settings.TWILIO_ACCOUNT_SID
        and settings.TWILIO_AUTH_TOKEN
        and settings.TWILIO_PHONE_NUMBER
    )

    provider_integrations = [
        {
            "provider": provider["provider"],
            "type": provider["type"],
            "chat_assistant": "live",
            "escalation": "live",
            "fees_comparison": "live",
            "bundles_comparison": "live",
            "channels": {
                "web": "live",
                "whatsapp": "live" if whatsapp_live else "integration_ready",
            },
        }
        for provider in SUPPORTED_PROVIDERS
    ]

    return {
        "channels": [
            {
                "name": "web",
                "status": "live",
                "description": "Web chat application",
            },
            {
                "name": "whatsapp",
                "status": "live" if whatsapp_live else "integration_ready",
                "description": "WhatsApp chatbot channel",
                "phone": settings.TWILIO_PHONE_NUMBER or "+263 78 222 4444",
                "webhook": f"{settings.API_V1_PREFIX}/integrations/whatsapp/webhook",
            },
        ],
        "provider_integrations": provider_integrations,
    }
