"""
Integration Endpoints
Provides channel integration readiness, WhatsApp webhook (Meta Cloud API + Twilio),
and WhatsApp admin configuration.
"""

from datetime import datetime
from html import escape
from typing import Optional
import logging
import uuid

from fastapi import APIRouter, Depends, Query, Request, Response
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_active_user, get_password_hash
from app.models.user import User, UserRole
from app.models.chat_session import ChatSession, SessionStatus
from app.models.message import Message
from app.models.chat_handoff import ChatHandoff
from app.models.ticket import Ticket, TicketCategory, TicketPriority, TicketStatus
from app.core.config import settings
from app.database.session import get_db
from app.services.nlp_service import nlp_service
from app.services.llm_service import llm_service
from app.services.whatsapp_service import whatsapp_service
from app.services.market_intelligence import SUPPORTED_PROVIDERS

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Pydantic models ─────────────────────────────────────────────

class WhatsAppWebhookPayload(BaseModel):
    from_number: Optional[str] = None
    message: Optional[str] = None
    timestamp: Optional[str] = None


class WhatsAppConfigUpdate(BaseModel):
    provider: Optional[str] = None
    access_token: Optional[str] = None
    phone_number_id: Optional[str] = None
    business_account_id: Optional[str] = None
    verify_token: Optional[str] = None
    app_secret: Optional[str] = None


# ── Helpers ─────────────────────────────────────────────────────

def _sanitize_whatsapp_number(raw_number: Optional[str]) -> Optional[str]:
    if not raw_number:
        return None
    cleaned = raw_number.strip()
    if cleaned.startswith("whatsapp:"):
        cleaned = cleaned.replace("whatsapp:", "", 1)
    return cleaned


def _twiml_message(message: str) -> str:
    safe_message = escape(message or "")
    return f'<?xml version="1.0" encoding="UTF-8"?><Response><Message>{safe_message}</Message></Response>'


def _provider_integration_status(whatsapp_live: bool):
    return [
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


def _ticket_category_for_intent(intent: str) -> TicketCategory:
    mapping = {
        "balance_inquiry": TicketCategory.BALANCE_INQUIRY,
        "transaction_dispute": TicketCategory.TRANSACTION_DISPUTE,
        "security_pin": TicketCategory.SECURITY_ISSUE,
        "password_reset": TicketCategory.PASSWORD_RESET,
        "network_connectivity": TicketCategory.TECHNICAL_SUPPORT,
        "complaint": TicketCategory.COMPLAINT,
        "escalation_request": TicketCategory.GENERAL_INQUIRY,
    }
    return mapping.get(intent, TicketCategory.GENERAL_INQUIRY)


def _ticket_priority_for_payload(intent: str, confidence: float) -> TicketPriority:
    if intent in {"transaction_dispute", "security_pin", "complaint"}:
        return TicketPriority.HIGH
    if confidence < 0.5:
        return TicketPriority.HIGH
    return TicketPriority.MEDIUM


def _extract_meta_message(body: dict) -> tuple[Optional[str], Optional[str], Optional[str]]:
    """Extract (from_number, message_text, message_id) from Meta webhook payload."""
    try:
        entry = body.get("entry", [])
        if not entry:
            return None, None, None
        changes = entry[0].get("changes", [])
        if not changes:
            return None, None, None
        value = changes[0].get("value", {})
        messages = value.get("messages", [])
        if not messages:
            return None, None, None
        msg = messages[0]
        from_number = msg.get("from")
        message_id = msg.get("id")
        msg_type = msg.get("type", "text")
        if msg_type == "text":
            text = msg.get("text", {}).get("body", "")
        elif msg_type == "interactive":
            interactive = msg.get("interactive", {})
            if interactive.get("type") == "button_reply":
                text = interactive.get("button_reply", {}).get("title", "")
            elif interactive.get("type") == "list_reply":
                text = interactive.get("list_reply", {}).get("title", "")
            else:
                text = ""
        else:
            text = f"[{msg_type} message received — please send a text message]"
        return from_number, text.strip(), message_id
    except (IndexError, KeyError, TypeError):
        return None, None, None


def _is_meta_status_update(body: dict) -> bool:
    """Check if webhook payload is just a status update (delivered/read), not a message."""
    try:
        entry = body.get("entry", [])
        if not entry:
            return False
        changes = entry[0].get("changes", [])
        if not changes:
            return False
        value = changes[0].get("value", {})
        return bool(value.get("statuses")) and not value.get("messages")
    except (IndexError, KeyError, TypeError):
        return False


# ── Shared message processing logic ────────────────────────────

async def _process_whatsapp_message(
    from_number: str, message: str, db: AsyncSession, meta_message_id: Optional[str] = None
) -> str:
    """
    Core processing: user lookup, session management, NLP + LLM, escalation.
    Returns the response text.
    """
    # Mark as read (Meta only)
    if meta_message_id:
        await whatsapp_service.mark_as_read(meta_message_id)

    # ── User lookup / creation ──────────────────────────────────
    user_result = await db.execute(select(User).filter(User.phone_number == from_number))
    customer = user_result.scalar_one_or_none()

    if not customer:
        safe_number = from_number.replace("+", "").replace(" ", "")
        generated_email = f"wa_{safe_number}@whatsapp.local"
        existing_email = await db.execute(select(User).filter(User.email == generated_email))
        if existing_email.scalar_one_or_none():
            generated_email = f"wa_{uuid.uuid4().hex[:10]}@whatsapp.local"

        customer = User(
            name=f"WhatsApp {from_number[-4:]}",
            email=generated_email,
            phone_number=from_number,
            password_hash=get_password_hash(uuid.uuid4().hex),
            role=UserRole.CUSTOMER,
            preferred_language="en",
            is_active=True,
            is_verified=True,
            phone_verified=True,
        )
        db.add(customer)
        await db.flush()

    # ── Session lookup / creation ───────────────────────────────
    session_result = await db.execute(
        select(ChatSession)
        .filter(
            ChatSession.customer_id == customer.id,
            ChatSession.status.in_([SessionStatus.ACTIVE, SessionStatus.ESCALATED]),
        )
        .order_by(desc(ChatSession.created_at))
        .limit(1)
    )
    chat_session = session_result.scalar_one_or_none()

    if not chat_session:
        detected_language = nlp_service.detect_language(message)
        chat_session = ChatSession(
            session_id=f"SESS{uuid.uuid4().hex[:8].upper()}",
            customer_id=customer.id,
            status=SessionStatus.ACTIVE,
            initial_language=detected_language,
            current_language=detected_language,
        )
        db.add(chat_session)
        await db.flush()

    # Always detect language from the current incoming message so the response
    # matches what the customer is writing, not the session's stored language.
    detected_now = nlp_service.detect_language(message)
    selected_language = detected_now if detected_now in {"en", "sn", "nd"} else "en"
    chat_session.current_language = selected_language

    # ── Save customer message ───────────────────────────────────
    customer_message = Message(
        session_id=chat_session.id,
        sender_id=customer.id,
        content=message,
        language=selected_language,
        is_from_customer=True,
        is_from_ai=False,
    )
    db.add(customer_message)
    await db.flush()

    # ── Generate response ───────────────────────────────────────
    response_text = ""
    response_intent = "general_inquiry"
    response_confidence = 1.0

    if chat_session.status == SessionStatus.ESCALATED:
        handoff_result = await db.execute(
            select(ChatHandoff).filter(ChatHandoff.session_id == chat_session.id)
        )
        handoff = handoff_result.scalar_one_or_none()
        if handoff and handoff.assigned_agent_id:
            agent_result = await db.execute(select(User).filter(User.id == handoff.assigned_agent_id))
            agent = agent_result.scalar_one_or_none()
            agent_name = agent.name if agent else "our support agent"
            response_text = f"Your case is with {agent_name}. They will reply here shortly."
        else:
            response_text = "Your case is escalated to a human agent. Please wait for a response in this chat."
        response_intent = "escalation_request"
        response_confidence = 0.99
    else:
        nlp_response = nlp_service.process_message(
            message=message,
            user_language=selected_language,
            context={
                "provider_name": None,
                "provider_type": None,
                "channel": "whatsapp",
                "previous_intent": chat_session.last_intent,
            },
        )
        response_text = nlp_response.get("response", "I am here to help.")
        response_intent = nlp_response.get("intent", "general_inquiry")
        response_confidence = float(nlp_response.get("confidence", 0.7))
        selected_language = nlp_response.get("language", selected_language)

        # ── Complaint / dispute detail submission: create real ticket + confirm ──
        if response_intent in ("complaint_received", "dispute_details"):
            is_dispute = (response_intent == "dispute_details")
            prefix = "DSP" if is_dispute else "CMP"
            ticket_ref = f"{prefix}-{uuid.uuid4().hex[:6].upper()}"
            ticket_category = TicketCategory.TRANSACTION_DISPUTE if is_dispute else TicketCategory.COMPLAINT
            existing_ticket = await db.execute(
                select(Ticket).filter(
                    Ticket.session_id == chat_session.id,
                    Ticket.status.in_([
                        TicketStatus.NEW, TicketStatus.ASSIGNED,
                        TicketStatus.IN_PROGRESS, TicketStatus.PENDING_CUSTOMER,
                        TicketStatus.ESCALATED, TicketStatus.REOPENED,
                    ]),
                    Ticket.category == ticket_category,
                )
            )
            existing_ticket_row = existing_ticket.scalar_one_or_none()
            if existing_ticket_row:
                ticket_ref = existing_ticket_row.ticket_id
            else:
                subject = "Transaction dispute via WhatsApp" if is_dispute else "Customer complaint via WhatsApp"
                tags = "whatsapp,dispute,customer-submitted" if is_dispute else "whatsapp,complaint,customer-submitted"
                db.add(Ticket(
                    ticket_id=ticket_ref,
                    customer_id=customer.id,
                    session_id=chat_session.id,
                    subject=subject,
                    description=f"Customer submitted details: {message}",
                    category=ticket_category,
                    priority=TicketPriority.HIGH,
                    status=TicketStatus.NEW,
                    tags=tags,
                ))
            response_text = nlp_service.generate_response(
                response_intent, selected_language, {"complaint_ref": ticket_ref}
            )
            response_confidence = 0.99
        else:
            # ── LLM personalised response enhancement ──────────────
            if llm_service.is_available and not nlp_response.get("needs_escalation"):
                history_result = await db.execute(
                    select(Message)
                    .filter(Message.session_id == chat_session.id)
                    .order_by(Message.timestamp.desc())
                    .limit(6)
                )
                recent_messages = history_result.scalars().all()
                conversation_history = [
                    {"sender": "customer" if msg.is_from_customer else "assistant", "content": msg.content}
                    for msg in reversed(recent_messages)
                ]
                llm_text = llm_service.generate_response(
                    intent=nlp_response["intent"],
                    language=nlp_response["language"],
                    user_message=message,
                    template_response=nlp_response["response"],
                    context={"channel": "whatsapp", "previous_intent": chat_session.last_intent},
                    conversation_history=conversation_history,
                    confidence=response_confidence,
                )
                if llm_text:
                    response_text = llm_text
            # ── End LLM enhancement ────────────────────────────────

            # ── Escalation handling ────────────────────────────────
            if nlp_response.get("needs_escalation", False):
                chat_session.status = SessionStatus.ESCALATED
                chat_session.escalation_reason = f"Auto escalation by workflow: {response_intent}"
                chat_session.escalated_at = datetime.utcnow()

                open_ticket_result = await db.execute(
                    select(Ticket).filter(
                        Ticket.session_id == chat_session.id,
                        Ticket.status.in_([
                            TicketStatus.NEW, TicketStatus.ASSIGNED,
                            TicketStatus.IN_PROGRESS, TicketStatus.PENDING_CUSTOMER,
                            TicketStatus.ESCALATED, TicketStatus.REOPENED,
                        ])
                    )
                )
                if not open_ticket_result.scalar_one_or_none():
                    db.add(Ticket(
                        ticket_id=f"TICKET{uuid.uuid4().hex[:8].upper()}",
                        customer_id=customer.id,
                        session_id=chat_session.id,
                        subject=f"Unresolved issue: {response_intent.replace('_', ' ').title()}",
                        description=(
                            f"Issue auto-escalated from WhatsApp. "
                            f"Intent: {response_intent}. Confidence: {response_confidence}. "
                            f"Customer message: {message}"
                        ),
                        category=_ticket_category_for_intent(response_intent),
                        priority=_ticket_priority_for_payload(response_intent, response_confidence),
                        status=TicketStatus.NEW,
                        tags="auto-created,unresolved,ai-escalation,whatsapp",
                    ))

                handoff_result = await db.execute(
                    select(ChatHandoff).filter(ChatHandoff.session_id == chat_session.id)
                )
                if not handoff_result.scalar_one_or_none():
                    db.add(ChatHandoff(
                        session_id=chat_session.id,
                        customer_id=customer.id,
                        status="pending",
                    ))

    # ── Save AI response ────────────────────────────────────────
    db.add(Message(
        session_id=chat_session.id,
        sender_id=None,
        content=response_text,
        language=selected_language,
        is_from_customer=False,
        is_from_ai=True,
        detected_intent=response_intent,
        confidence_score=str(response_confidence),
    ))

    chat_session.last_intent = response_intent
    chat_session.confidence_score = str(response_confidence)
    await db.commit()

    return response_text


# ═══════════════════════════════════════════════════════════════
# Channel status endpoint
# ═══════════════════════════════════════════════════════════════

@router.get("/channels")
async def get_channels(
    current_user: User = Depends(get_current_active_user),
):
    whatsapp_live = whatsapp_service.is_configured

    return {
        "channels": [
            {
                "name": "web",
                "status": "live",
                "integration_ready": True,
            },
            {
                "name": "whatsapp",
                "status": "live" if whatsapp_live else "integration_ready",
                "integration_ready": True,
                "provider": whatsapp_service.provider,
                "phone": settings.TWILIO_PHONE_NUMBER or "+263 78 222 4444",
            },
        ],
        "provider_integrations": _provider_integration_status(whatsapp_live),
        "updated_at": datetime.utcnow().isoformat(),
    }


# ═══════════════════════════════════════════════════════════════
# Meta WhatsApp Cloud API webhook (GET = verification, POST = messages)
# ═══════════════════════════════════════════════════════════════

@router.get("/whatsapp/webhook")
async def whatsapp_webhook_verify(
    request: Request,
):
    """
    Meta webhook verification (challenge-response).
    Meta sends: hub.mode=subscribe, hub.verify_token=<token>, hub.challenge=<challenge>
    """
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")

    if mode == "subscribe" and token == settings.WHATSAPP_VERIFY_TOKEN:
        logger.info("WhatsApp webhook verified successfully")
        return Response(content=challenge, media_type="text/plain")

    logger.warning(f"WhatsApp webhook verification failed — mode={mode}")
    return Response(content="Verification failed", status_code=403)


@router.post("/whatsapp/webhook")
async def whatsapp_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    WhatsApp webhook receiver — supports both Meta Cloud API and Twilio.
    Detects provider from payload format.
    """
    content_type = request.headers.get("content-type", "")

    # ── Meta Cloud API (JSON) ───────────────────────────────────
    if "application/json" in content_type:
        body = await request.json()

        # Ignore status updates (delivered, read receipts)
        if _is_meta_status_update(body):
            return {"status": "ok"}

        from_number, message, meta_msg_id = _extract_meta_message(body)

        if not from_number or not message:
            logger.debug("Meta webhook — no actionable message")
            return {"status": "ok"}

        from_number = whatsapp_service._normalize_number(from_number)
        logger.info(f"WhatsApp message from {from_number}: {message[:80]}")

        response_text = await _process_whatsapp_message(from_number, message, db, meta_msg_id)

        # Send reply via Meta Cloud API
        await whatsapp_service.send_message(from_number, response_text)
        return {"status": "ok"}

    # ── Twilio (form-urlencoded) ────────────────────────────────
    form_data = await request.form()
    from_number = _sanitize_whatsapp_number(form_data.get("From"))
    message = (form_data.get("Body") or "").strip()

    if not from_number:
        return Response(
            content=_twiml_message("Unable to identify your WhatsApp number."),
            media_type="application/xml",
        )
    if not message:
        return Response(
            content=_twiml_message("Please send a message so I can assist you."),
            media_type="application/xml",
        )

    logger.info(f"Twilio WhatsApp message from {from_number}: {message[:80]}")
    response_text = await _process_whatsapp_message(from_number, message, db)
    return Response(content=_twiml_message(response_text), media_type="application/xml")


# ═══════════════════════════════════════════════════════════════
# WhatsApp admin configuration endpoints
# ═══════════════════════════════════════════════════════════════

@router.get("/whatsapp/status")
async def get_whatsapp_status(
    current_user: User = Depends(get_current_active_user),
):
    """Get WhatsApp integration status and configuration."""
    return {
        **whatsapp_service.status(),
        "webhook_url": "/api/v1/integrations/whatsapp/webhook",
    }


@router.put("/whatsapp/config")
async def update_whatsapp_config(
    config: WhatsAppConfigUpdate,
    current_user: User = Depends(get_current_active_user),
):
    """Update WhatsApp configuration (admin only)."""
    if current_user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        return {"error": "Admin access required"}

    updated = []
    if config.provider:
        settings.WHATSAPP_PROVIDER = config.provider
        updated.append("provider")
    if config.access_token:
        settings.WHATSAPP_ACCESS_TOKEN = config.access_token
        updated.append("access_token")
    if config.phone_number_id:
        settings.WHATSAPP_PHONE_NUMBER_ID = config.phone_number_id
        updated.append("phone_number_id")
    if config.business_account_id:
        settings.WHATSAPP_BUSINESS_ACCOUNT_ID = config.business_account_id
        updated.append("business_account_id")
    if config.verify_token:
        settings.WHATSAPP_VERIFY_TOKEN = config.verify_token
        updated.append("verify_token")
    if config.app_secret:
        settings.WHATSAPP_APP_SECRET = config.app_secret
        updated.append("app_secret")

    # Persist to .env
    _persist_whatsapp_settings()

    return {
        "message": f"Updated: {', '.join(updated)}" if updated else "No changes",
        **whatsapp_service.status(),
    }


class WhatsAppTokenUpdate(BaseModel):
    access_token: str


def _call_meta_api_sync(token: str):
    """Call Meta Graph API synchronously (run in a thread executor)."""
    import requests
    resp = requests.get(
        "https://graph.facebook.com/v18.0/me",
        headers={"Authorization": f"Bearer {token}"},
        timeout=8,
    )
    return resp.status_code, resp.json()


async def _validate_meta_token(token: str):
    """Run Meta API validation in a thread so it doesn't block the event loop."""
    import asyncio
    loop = asyncio.get_running_loop()
    try:
        return await asyncio.wait_for(
            loop.run_in_executor(None, _call_meta_api_sync, token),
            timeout=10.0,
        )
    except asyncio.TimeoutError:
        raise Exception("Meta API validation timed out (>10 s)")


def _read_env_token() -> str:
    """Read WHATSAPP_ACCESS_TOKEN from .env file."""
    import pathlib
    env_path = pathlib.Path(__file__).resolve().parents[3] / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith("WHATSAPP_ACCESS_TOKEN="):
                return line.split("=", 1)[1].strip()
    return ""


@router.get("/whatsapp/token-status")
async def get_whatsapp_token_status(
    current_user: User = Depends(get_current_active_user),
):
    """Validate the current WhatsApp access token against Meta's API in real time."""
    if current_user.role != UserRole.ADMIN:
        return {"error": "Admin access required"}

    token = _read_env_token()
    if not token:
        return {"valid": False, "expired": False, "reason": "No token configured", "name": None}

    try:
        status_code, data = await _validate_meta_token(token)
        if status_code == 200 and "id" in data:
            return {"valid": True, "expired": False, "reason": None, "name": data.get("name")}
        error = data.get("error", {})
        expired = error.get("error_subcode") in (463, 467)
        return {"valid": False, "expired": expired, "reason": error.get("message", "Unknown error"), "name": None}
    except Exception as exc:
        return {"valid": False, "expired": False, "reason": str(exc), "name": None}


@router.post("/whatsapp/token")
async def update_whatsapp_token(
    body: WhatsAppTokenUpdate,
    current_user: User = Depends(get_current_active_user),
):
    """Update only the WhatsApp access token, validate it, and persist to .env."""
    import pathlib

    if current_user.role != UserRole.ADMIN:
        return {"error": "Admin access required"}

    token = body.access_token.strip()
    if not token:
        return {"success": False, "reason": "Token cannot be empty"}

    # Validate against Meta before saving
    try:
        status_code, data = await _validate_meta_token(token)
        if status_code != 200 or "id" not in data:
            error = data.get("error", {})
            return {"success": False, "reason": error.get("message", "Token validation failed")}
        name = data.get("name")
    except Exception as exc:
        return {"success": False, "reason": f"Could not reach Meta API: {exc}"}

    # Persist to .env
    env_path = pathlib.Path(__file__).resolve().parents[3] / ".env"
    try:
        existing = env_path.read_text() if env_path.exists() else ""
        key = "WHATSAPP_ACCESS_TOKEN"
        if f"{key}=" in existing:
            lines = existing.split("\n")
            existing = "\n".join(
                f"{key}={token}" if line.startswith(f"{key}=") else line
                for line in lines
            )
        else:
            existing = existing.rstrip("\n") + f"\n{key}={token}\n"
        env_path.write_text(existing)
    except Exception as exc:
        logger.exception("Failed to persist token to .env")
        return {"success": False, "reason": f"Could not write to .env: {exc}"}

    return {"success": True, "name": name, "reason": None}


def _persist_whatsapp_settings():
    """Write current WhatsApp settings to .env file."""
    import pathlib
    env_path = pathlib.Path(__file__).resolve().parents[3] / ".env"
    pairs = {
        "WHATSAPP_PROVIDER": settings.WHATSAPP_PROVIDER,
        "WHATSAPP_ACCESS_TOKEN": settings.WHATSAPP_ACCESS_TOKEN,
        "WHATSAPP_PHONE_NUMBER_ID": settings.WHATSAPP_PHONE_NUMBER_ID,
        "WHATSAPP_BUSINESS_ACCOUNT_ID": settings.WHATSAPP_BUSINESS_ACCOUNT_ID,
        "WHATSAPP_VERIFY_TOKEN": settings.WHATSAPP_VERIFY_TOKEN,
        "WHATSAPP_APP_SECRET": settings.WHATSAPP_APP_SECRET,
    }
    try:
        existing = env_path.read_text() if env_path.exists() else ""
        for key, value in pairs.items():
            if f"{key}=" in existing:
                lines = existing.split("\n")
                existing = "\n".join(
                    f"{key}={value}" if line.startswith(f"{key}=") else line
                    for line in lines
                )
            else:
                existing = existing.rstrip("\n") + f"\n{key}={value}\n"
        env_path.write_text(existing)
    except Exception:
        logger.exception("Failed to persist WhatsApp settings to .env")
