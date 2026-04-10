"""
Chat API Endpoints
Handles chat session management and message processing
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid
import re

from app.database.session import get_db
from app.core.config import settings
from app.core.security import get_current_active_user, require_agent
from app.models.user import User
from app.models.chat_session import ChatSession, SessionStatus
from app.models.message import Message
from app.models.nlp_feedback import NLPFeedback
from app.models.ticket import Ticket, TicketCategory, TicketPriority, TicketStatus
from app.models.customer_rating import CustomerRating
from app.models.chat_handoff import ChatHandoff
from app.services.nlp_service import nlp_service
from app.services.llm_service import llm_service
from app.services.market_intelligence import SUPPORTED_PROVIDERS
from app.services.location_service import location_service
from app.api.endpoints.tickets import _find_least_loaded_agent

router = APIRouter()

LOW_CONFIDENCE_THRESHOLD = 0.75
TICKET_REQUIRED_ESCALATION_INTENTS = {"transaction_dispute", "security_pin", "complaint"}


INTENT_TO_TICKET_CATEGORY = {
    "balance_inquiry": TicketCategory.BALANCE_INQUIRY,
    "transaction_dispute": TicketCategory.TRANSACTION_DISPUTE,
    "security_pin": TicketCategory.SECURITY_ISSUE,
    "password_reset": TicketCategory.PASSWORD_RESET,
    "network_connectivity": TicketCategory.TECHNICAL_SUPPORT,
    "complaint": TicketCategory.COMPLAINT,
    "escalation_request": TicketCategory.GENERAL_INQUIRY,
}


def _ticket_category_for_intent(intent: str) -> TicketCategory:
    return INTENT_TO_TICKET_CATEGORY.get(intent, TicketCategory.GENERAL_INQUIRY)


def _ticket_priority_for_payload(intent: str, confidence: float) -> TicketPriority:
    if intent in {"transaction_dispute", "security_pin", "complaint"}:
        return TicketPriority.HIGH
    if confidence < 0.5:
        return TicketPriority.HIGH
    if confidence < LOW_CONFIDENCE_THRESHOLD:
        return TicketPriority.MEDIUM
    return TicketPriority.MEDIUM


def _is_airtime_dispute_message(text: str) -> bool:
    text_lower = (text or "").lower()
    airtime_keywords = [
        "airtime", "airtme", "top up", "topup", "bundle", "recharge", "bought airtime",
        "mhepo", "recharge card"
    ]
    dispute_keywords = [
        "deducted", "debited", "not received", "not recieved", "did not receive",
        "didnt receive", "didn't receive", "did not recieve", "didnt recieve", "didn't recieve",
        "failed", "missing", "yakabviswa", "haina kupinda", "handina kuwana", "isina kupinda",
        "ikhutshwe", "angikatholi", "angitholanga"
    ]
    has_airtime = any(keyword in text_lower for keyword in airtime_keywords)
    has_dispute = any(keyword in text_lower for keyword in dispute_keywords)
    return has_airtime and has_dispute


def _extract_amounts(text: str) -> List[str]:
    return re.findall(r"\$?\d+(?:\.\d{1,2})?", text or "")


def _looks_like_transaction_dispute_details(text: str) -> bool:
    text_value = text or ""
    lower_text = text_value.lower()

    has_reference = bool(re.search(r"\b(?:tc|tq|trx|ref|mp|ci)[a-z0-9]{6,}\b", lower_text))
    has_amount = bool(re.search(r"\$?\d+(?:\.\d{1,2})?", text_value))
    has_phone = bool(re.search(r"\b(?:0|263|\+263)?(?:7[1-9])\d{7}\b", text_value))

    return has_reference and has_amount and has_phone


def _airtime_dispute_followup_prompt(language: str) -> str:
    prompts = {
        "en": "I understand. Please share two details so I can open a dispute ticket immediately:\n1) How much airtime you tried to buy\n2) How much was deducted from your account\nExample: Airtime $2, deducted $2",
        "sn": "Ndinzwisisa. Ndapota ndiudze zvinhu zviviri kuti ndivhure ticket yekupikisa pakarepo:\n1) Mari yaida kutengwa yeairtime\n2) Mari yakabviswa muaccount yako\nMuenzaniso: Airtime $2, yakabviswa $2",
        "nd": "Ngiyakuzwa. Sicela unikeze imininingwane emibili ukuze ngivule i-ticket yokuphikisa masinyane:\n1) Inani le-airtime obufuna ukuyithenga\n2) Inani elikhutshwe ku-account yakho\nIsibonelo: Airtime $2, kukhutshwe $2"
    }
    return prompts.get(language, prompts["en"])


def _airtime_dispute_ticket_created_message(language: str, ticket_id: str) -> str:
    messages = {
        "en": f"Thank you. I have created your dispute ticket: {ticket_id}. Our support team is now working on it, and you will be notified as updates come in.",
        "sn": f"Maita basa. Ndavhura ticket yako yekupikisa: {ticket_id}. Boka redu rekubatsira rava kushanda pairi, uye uchaziviswa kana paine zvitsva.",
        "nd": f"Ngiyabonga. Sengivule i-ticket yakho yokuphikisa: {ticket_id}. Ithimba lethu seliqalisile ukuyilungisa, njalo uzakwaziswa uma sekukhona okutsha."
    }
    return messages.get(language, messages["en"])


def _is_location_request(text: str) -> bool:
    lower_text = (text or "").lower()
    location_terms = ["nearest", "nearby", "near", "closest", "around", "where"]
    place_terms = ["atm", "bank", "branch", "shop", "econet", "netone", "agent", "cash out", "cashout", "innbucks", "inn bucks", "telecash", "telecel", "agency"]
    return any(term in lower_text for term in location_terms) and any(term in lower_text for term in place_terms)


def _detect_location_type(
    text: str,
    provider_name: Optional[str] = None,
    provider_type: Optional[str] = None,
) -> Optional[str]:
    lower_text = (text or "").lower()
    normalized_provider = (provider_name or "").lower()

    if normalized_provider in {"ecocash", "econet"}:
        provider_shop_type = "econet_shop"
    elif normalized_provider in {"onemoney", "netone"}:
        provider_shop_type = "netone_shop"
    elif normalized_provider in {"innbucks", "inn bucks", "simbisa"}:
        provider_shop_type = "innbucks_outlet"
    elif normalized_provider in {"telecash", "telecel"}:
        provider_shop_type = "telecash_shop"
    else:
        provider_shop_type = None

    if "atm" in lower_text:
        return "atm"
    if "bank" in lower_text or "branch" in lower_text:
        return "bank"
    if "shop" in lower_text and provider_shop_type:
        return provider_shop_type
    if "econet" in lower_text and "shop" in lower_text:
        return "econet_shop"
    if "netone" in lower_text and "shop" in lower_text:
        return "netone_shop"
    if "innbucks" in lower_text or "inn bucks" in lower_text:
        return "innbucks_outlet"
    if "telecash" in lower_text or "telecel" in lower_text:
        return "telecash_shop"
    if any(term in lower_text for term in ["agency banking", "agency bank"]):
        return "agency_banking"
    if any(term in lower_text for term in ["agent", "cash out", "cashout"]):
        return "cashout_agent"
    if "shop" in lower_text and provider_type == "mno":
        return provider_shop_type or "cashout_agent"

    return None


def _provider_aliases(provider_name: Optional[str]) -> List[str]:
    if not provider_name:
        return []

    provider = provider_name.lower().strip()
    aliases = {
        "ecocash": ["ecocash", "econet"],
        "onemoney": ["onemoney", "one money", "netone"],
        "innbucks": ["innbucks", "inn bucks", "simbisa"],
        "telecash": ["telecash", "telecel"],
        "nmb": ["nmb", "nmb bank"],
        "cbz": ["cbz", "cbz bank"],
        "steward bank": ["steward", "steward bank"],
        "stanbic": ["stanbic", "stanbic bank"],
        "fbc": ["fbc", "fbc bank"],
        "zb bank": ["zb", "zb bank"],
        "bancabc": ["bancabc", "banc abc", "abc bank"],
        "posb": ["posb", "people's own"],
        "cabs": ["cabs", "cabs bank"],
    }
    return aliases.get(provider, [provider])


def _filter_locations_for_provider(results: List[dict], provider_name: Optional[str]) -> List[dict]:
    aliases = _provider_aliases(provider_name)
    if not aliases:
        return results

    filtered: List[dict] = []
    for row in results:
        haystack = " ".join(
            [
                str(row.get("name") or ""),
                str(row.get("address") or ""),
                str(row.get("contact") or ""),
            ]
        ).lower()

        if any(alias in haystack for alias in aliases):
            filtered.append(row)

    return filtered or results


def _align_response_to_provider(response_text: str, provider_name: Optional[str]) -> str:
    if not provider_name:
        return response_text

    response = (response_text or "").strip()
    if response.startswith(f"[{provider_name}]"):
        return response

    return f"[{provider_name}]\n{response}"


def _format_location_reply(language: str, location_type: str, lookup_result: dict) -> str:
    area = lookup_result.get("resolved_location") or "your requested area"
    results = lookup_result.get("results") or []

    titles = {
        "atm": {
            "en": f"Nearest ATMs around {area}:",
            "sn": f"MaATM ari pedyo ne {area}:",
            "nd": f"Ama-ATM aseduze le {area}:",
        },
        "bank": {
            "en": f"Nearest banks around {area}:",
            "sn": f"Mabhangi ari pedyo ne {area}:",
            "nd": f"Amabhanga aseduze le {area}:",
        },
        "econet_shop": {
            "en": f"Nearest Econet shops around {area}:",
            "sn": f"Zvitoro zveEconet zviri pedyo ne {area}:",
            "nd": f"Amashop eEconet aseduze le {area}:",
        },
        "netone_shop": {
            "en": f"Nearest NetOne shops around {area}:",
            "sn": f"Zvitoro zveNetOne zviri pedyo ne {area}:",
            "nd": f"Amashop eNetOne aseduze le {area}:",
        },
        "cashout_agent": {
            "en": f"Nearest cash-out agents around {area}:",
            "sn": f"Maagent ekuburitsa mari ari pedyo ne {area}:",
            "nd": f"Ama-agent okukhipha imali aseduze le {area}:",
        },
        "innbucks_outlet": {
            "en": f"Nearest InnBucks outlets around {area}:",
            "sn": f"Zvitoro zveInnBucks zviri pedyo ne {area}:",
            "nd": f"Amashop eInnBucks aseduze le {area}:",
        },
        "telecash_shop": {
            "en": f"Nearest Telecash shops around {area}:",
            "sn": f"Zvitoro zveTelecash zviri pedyo ne {area}:",
            "nd": f"Amashop eTelecash aseduze le {area}:",
        },
        "agency_banking": {
            "en": f"Nearest agency banking locations around {area}:",
            "sn": f"Nzvimbo dzeagency banking dziri pedyo ne {area}:",
            "nd": f"Izindawo ze-agency banking eziseduze le {area}:",
        },
    }

    default_title = {
        "en": f"Nearest service locations around {area}:",
        "sn": f"Nzvimbo dzebasa dziri pedyo ne {area}:",
        "nd": f"Izindawo zesevisi eziseduze le {area}:",
    }

    heading = titles.get(location_type, default_title).get(language, default_title["en"])

    lines = [heading]
    for index, item in enumerate(results, start=1):
        line = f"{index}. {item['name']} ({item['distance_km']:.2f} km)"
        lines.append(line)
        lines.append(f"   Address: {item.get('address') or 'Address not available'}")
        if item.get("contact"):
            lines.append(f"   Contact: {item['contact']}")
        if item.get("opening_hours"):
            lines.append(f"   Hours: {item['opening_hours']}")

    lines.append("You can ask for another area (e.g., 'nearest ATM in Borrowdale').")
    return "\n".join(lines)


# Schemas
class ChatSessionCreate(BaseModel):
    """Create chat session schema"""
    initial_message: Optional[str] = None


class ChatSessionResponse(BaseModel):
    """Chat session response schema"""
    id: str
    session_id: str
    status: str
    initial_language: str
    created_at: datetime
    last_message: Optional[str] = None
    last_intent: Optional[str] = None
    message_count: int = 0
    updated_at: Optional[datetime] = None


class MessageCreate(BaseModel):
    """Create message schema"""
    content: str
    session_id: str
    language: Optional[str] = None
    provider_name: Optional[str] = None
    provider_type: Optional[str] = None


class RatingCreate(BaseModel):
    rating: int
    comment: Optional[str] = None


class SessionCompletionRequest(BaseModel):
    resolved: bool
    rating: Optional[int] = None
    comment: Optional[str] = None


class AgentMessageCreate(BaseModel):
    content: str


class LocationSearchRequest(BaseModel):
    query: str
    location_type: str
    limit: int = 5


class MessageResponse(BaseModel):
    """Message response schema"""
    id: str
    content: str
    language: str
    is_from_customer: bool
    is_from_ai: bool
    is_from_agent: bool = False
    sender_name: Optional[str] = None
    detected_intent: Optional[str]
    confidence_score: Optional[str]
    timestamp: datetime


@router.get("/providers")
async def get_supported_providers(
    current_user: User = Depends(get_current_active_user),
):
    return {
        "providers": SUPPORTED_PROVIDERS,
        "integration_ready": [
            "EcoCash", "OneMoney", "InnBucks", "CBZ", "Steward Bank", "NMB", "Stanbic"
        ],
    }


@router.post("/locations/nearby", response_model=dict)
async def get_nearby_locations(
    request_data: LocationSearchRequest,
    current_user: User = Depends(get_current_active_user),
):
    supported_types = {"atm", "bank", "econet_shop", "netone_shop", "cashout_agent"}
    if request_data.location_type not in supported_types:
        raise HTTPException(status_code=400, detail="Invalid location type")

    result = await location_service.find_nearest_locations(
        query=request_data.query,
        location_type=request_data.location_type,
        limit=max(1, min(request_data.limit, 10)),
    )
    return result


@router.post("/sessions", response_model=ChatSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_chat_session(
    session_data: ChatSessionCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new chat session
    
    Args:
        session_data: Session creation data
        current_user: Authenticated user
        db: Database session
    
    Returns:
        Created chat session
    """
    # Generate unique session ID
    session_id = f"SESS{uuid.uuid4().hex[:8].upper()}"
    
    # Detect language from initial message if provided
    initial_language = current_user.preferred_language
    if session_data.initial_message:
        initial_language = nlp_service.detect_language(session_data.initial_message)
    
    # Create chat session
    chat_session = ChatSession(
        session_id=session_id,
        customer_id=current_user.id,
        status=SessionStatus.ACTIVE,
        initial_language=initial_language,
        current_language=initial_language
    )
    
    db.add(chat_session)
    await db.commit()
    await db.refresh(chat_session)
    
    return ChatSessionResponse(
        id=chat_session.id,
        session_id=chat_session.session_id,
        status=chat_session.status.value,
        initial_language=chat_session.initial_language,
        created_at=chat_session.created_at,
        message_count=0
    )


@router.get("/sessions", response_model=List[ChatSessionResponse])
async def get_chat_sessions(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 50
):
    """
    Get user's chat sessions with message counts and last message preview
    
    Args:
        current_user: Authenticated user
        db: Database session
        limit: Maximum number of sessions to return
    
    Returns:
        List of chat sessions with details
    """
    from sqlalchemy import func
    
    result = await db.execute(
        select(ChatSession)
        .filter(ChatSession.customer_id == current_user.id)
        .order_by(desc(ChatSession.created_at))
        .limit(limit)
    )
    sessions = result.scalars().all()
    
    session_responses = []
    for session in sessions:
        # Get message count for this session
        count_result = await db.execute(
            select(func.count(Message.id)).filter(Message.session_id == session.id)
        )
        message_count = count_result.scalar() or 0
        
        # Get last message
        last_msg_result = await db.execute(
            select(Message)
            .filter(Message.session_id == session.id)
            .order_by(desc(Message.timestamp))
            .limit(1)
        )
        last_message = last_msg_result.scalar_one_or_none()
        
        session_responses.append(
            ChatSessionResponse(
                id=session.id,
                session_id=session.session_id,
                status=session.status.value,
                initial_language=session.initial_language,
                created_at=session.created_at,
                last_message=last_message.content[:100] if last_message else None,
                last_intent=session.last_intent,
                message_count=message_count,
                updated_at=last_message.timestamp if last_message else session.created_at
            )
        )
    
    return session_responses


@router.post("/messages", response_model=dict)
async def send_message(
    message_data: MessageCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Send a message and get AI response
    
    Args:
        message_data: Message data
        current_user: Authenticated user
        db: Database session
    
    Returns:
        AI response with metadata
    """
    # Verify session exists and belongs to user
    result = await db.execute(
        select(ChatSession).filter(
            ChatSession.session_id == message_data.session_id,
            ChatSession.customer_id == current_user.id
        )
    )
    chat_session = result.scalar_one_or_none()
    
    if not chat_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )
    
    selected_language = (message_data.language or chat_session.current_language or current_user.preferred_language or "en").lower()
    if selected_language not in {"en", "sn", "nd"}:
        selected_language = "en"

    chat_session.current_language = selected_language

    # Create customer message
    customer_message = Message(
        session_id=chat_session.id,
        sender_id=current_user.id,
        content=message_data.content,
        language=selected_language,
        is_from_customer=True,
        is_from_ai=False
    )
    
    db.add(customer_message)
    await db.flush()

    def build_ai_message_payload(
        content: str,
        intent: str,
        confidence: float,
        response_language: str,
        needs_escalation: bool = False,
        session_intent: Optional[str] = None,
    ) -> dict:
        return {
            "language": response_language,
            "intent": intent,
            "confidence": confidence,
            "response": content,
            "needs_escalation": needs_escalation,
            "session_intent": session_intent,
        }

    async def persist_ai_response(payload: dict) -> dict:
        chat_session.last_intent = payload.get("session_intent") or payload["intent"]
        chat_session.confidence_score = str(payload["confidence"])
        created_ticket_id: Optional[str] = None

        ai_message = Message(
            session_id=chat_session.id,
            sender_id=None,
            content=payload["response"],
            language=payload["language"],
            is_from_customer=False,
            is_from_ai=True,
            detected_intent=payload["intent"],
            confidence_score=str(payload["confidence"])
        )
        db.add(ai_message)

        if payload.get("needs_escalation"):
            chat_session.status = SessionStatus.ESCALATED
            chat_session.escalation_reason = f"Auto escalation by workflow: {payload['intent']}"
            chat_session.escalated_at = datetime.utcnow()

            should_create_ticket = payload["intent"] in TICKET_REQUIRED_ESCALATION_INTENTS or bool(payload.get("force_ticket"))
            if should_create_ticket:
                open_ticket_result = await db.execute(
                    select(Ticket).filter(
                        Ticket.session_id == chat_session.id,
                        Ticket.status.in_([
                            TicketStatus.NEW,
                            TicketStatus.ASSIGNED,
                            TicketStatus.IN_PROGRESS,
                            TicketStatus.PENDING_CUSTOMER,
                            TicketStatus.ESCALATED,
                            TicketStatus.REOPENED,
                        ])
                    )
                )
                open_ticket = open_ticket_result.scalar_one_or_none()

                if not open_ticket:
                    auto_ticket_id = f"TICKET{uuid.uuid4().hex[:8].upper()}"
                    ticket_category = _ticket_category_for_intent(payload["intent"])
                    assigned_agent = await _find_least_loaded_agent(db, category=ticket_category)
                    auto_ticket = Ticket(
                        ticket_id=auto_ticket_id,
                        customer_id=current_user.id,
                        session_id=chat_session.id,
                        assigned_agent_id=assigned_agent.id if assigned_agent else None,
                        subject=f"Escalated issue: {payload['intent'].replace('_', ' ').title()}",
                        description=(
                            f"Issue escalated after workflow required human review. "
                            f"Intent: {payload['intent']}. Confidence: {payload['confidence']}. "
                            f"Customer message: {message_data.content}"
                        ),
                        category=ticket_category,
                        priority=_ticket_priority_for_payload(payload["intent"], float(payload["confidence"])),
                        status=TicketStatus.ASSIGNED if assigned_agent else TicketStatus.NEW,
                        tags="auto-created,workflow-escalation",
                    )
                    db.add(auto_ticket)
                    created_ticket_id = auto_ticket_id
                else:
                    created_ticket_id = open_ticket.ticket_id

            handoff_result = await db.execute(
                select(ChatHandoff).filter(ChatHandoff.session_id == chat_session.id)
            )
            handoff = handoff_result.scalar_one_or_none()
            if not handoff:
                db.add(
                    ChatHandoff(
                        session_id=chat_session.id,
                        customer_id=current_user.id,
                        status="pending",
                    )
                )

        await db.commit()
        await db.refresh(ai_message)

        return {
            "message_id": ai_message.id,
            "content": ai_message.content,
            "language": payload["language"],
            "intent": payload["intent"],
            "confidence": payload["confidence"],
            "requires_escalation": payload.get("needs_escalation", False),
            "ticket_id": created_ticket_id,
            "timestamp": ai_message.timestamp.isoformat()
        }

    # Continue airtime dispute flow FIRST (before new-dispute detection)
    # so that replies like "Airtime $2, deducted $2" are not re-detected
    # as a brand-new dispute and stuck in an infinite prompt loop.
    # Only enter airtime flow when explicitly pending airtime details.
    if chat_session.last_intent == "transaction_dispute_airtime_pending":
        amounts = _extract_amounts(message_data.content)
        if len(amounts) < 2:
            missing_details_payload = build_ai_message_payload(
                content=_airtime_dispute_followup_prompt(selected_language),
                intent="transaction_dispute",
                confidence=0.98,
                response_language=selected_language,
                needs_escalation=False,
                session_intent="transaction_dispute_airtime_pending",
            )
            return await persist_ai_response(missing_details_payload)

    # General transaction dispute follow-up: user was asked for details and provided them.
    if chat_session.last_intent == "transaction_dispute":
        if _looks_like_transaction_dispute_details(message_data.content):
            pass  # Fall through to the ticket-creation block below
        else:
            # User provided partial details — try to create a ticket with what we have
            has_any_detail = (
                bool(re.search(r'\b(?:tc|tq|trx|ref|mp|ci)[a-z0-9]{6,}\b', message_data.content.lower()))
                or bool(re.search(r'\$?\d+(?:\.\d{1,2})?', message_data.content))
                or bool(re.search(r'\b(?:0|263|\+263)?(?:7[1-9])\d{7}\b', message_data.content))
            )
            if has_any_detail:
                dispute_ticket_id = f"TICKET{uuid.uuid4().hex[:8].upper()}"
                evidence_agent = await _find_least_loaded_agent(db, category=TicketCategory.TRANSACTION_DISPUTE)
                dispute_ticket = Ticket(
                    ticket_id=dispute_ticket_id,
                    customer_id=current_user.id,
                    session_id=chat_session.id,
                    assigned_agent_id=evidence_agent.id if evidence_agent else None,
                    subject="Transaction dispute with customer details",
                    description=f"Customer submitted transaction dispute details: {message_data.content}",
                    category=TicketCategory.TRANSACTION_DISPUTE,
                    priority=TicketPriority.HIGH,
                    status=TicketStatus.ASSIGNED if evidence_agent else TicketStatus.NEW,
                    tags="dispute,evidence,auto-created",
                )
                db.add(dispute_ticket)
                await db.flush()

                ticket_msgs = {
                    "en": f"Thank you for those details. I have created dispute ticket **{dispute_ticket_id}** and assigned it to our support team. They will follow up with you shortly.",
                    "sn": f"Maita basa nekupa mashoko aya. Ndavhura ticket yekupikisa **{dispute_ticket_id}** uye ndaipa kune tiimu yedu yekubatsira. Vachakupindura nokukurumidza.",
                    "nd": f"Ngiyabonga ngemininingwane. Ngiqale i-ticket yokuxabana **{dispute_ticket_id}** futhi ngiyinikeze ithimu yethu yokusekela. Bazakulandelela masinyane.",
                }
                ticket_payload = build_ai_message_payload(
                    content=ticket_msgs.get(selected_language, ticket_msgs["en"]),
                    intent="transaction_dispute",
                    confidence=0.99,
                    response_language=selected_language,
                    needs_escalation=True,
                    session_intent="transaction_dispute_ticket_created",
                )
                return await persist_ai_response(ticket_payload)

        existing_ticket_result = await db.execute(
            select(Ticket).filter(
                Ticket.session_id == chat_session.id,
                Ticket.status.in_(
                    [
                        TicketStatus.NEW,
                        TicketStatus.ASSIGNED,
                        TicketStatus.IN_PROGRESS,
                        TicketStatus.PENDING_CUSTOMER,
                        TicketStatus.ESCALATED,
                        TicketStatus.REOPENED,
                    ]
                ),
            )
        )
        dispute_ticket = existing_ticket_result.scalar_one_or_none()

        if not dispute_ticket:
            ticket_id = f"TICKET{uuid.uuid4().hex[:8].upper()}"
            dispute_agent = await _find_least_loaded_agent(db, category=TicketCategory.TRANSACTION_DISPUTE)
            dispute_ticket = Ticket(
                ticket_id=ticket_id,
                customer_id=current_user.id,
                session_id=chat_session.id,
                assigned_agent_id=dispute_agent.id if dispute_agent else None,
                subject="Airtime deducted but not received",
                description=(
                    f"Customer reported airtime purchase issue. "
                    f"Airtime amount: {amounts[0]}, deducted amount: {amounts[1]}. "
                    f"Original message: {message_data.content}"
                ),
                category=TicketCategory.TRANSACTION_DISPUTE,
                priority=TicketPriority.HIGH,
                status=TicketStatus.ASSIGNED if dispute_agent else TicketStatus.NEW,
                tags="airtime,dispute,auto-created",
            )
            db.add(dispute_ticket)
            await db.flush()

        ticket_created_payload = build_ai_message_payload(
            content=_airtime_dispute_ticket_created_message(selected_language, dispute_ticket.ticket_id),
            intent="transaction_dispute",
            confidence=0.99,
            response_language=selected_language,
            needs_escalation=True,
            session_intent="transaction_dispute_ticket_created",
        )

        return await persist_ai_response(ticket_created_payload)

    # Accept rich dispute detail payloads even when customers skip strict phrasing.
    if _looks_like_transaction_dispute_details(message_data.content):
        open_ticket_result = await db.execute(
            select(Ticket).filter(
                Ticket.session_id == chat_session.id,
                Ticket.status.in_(
                    [
                        TicketStatus.NEW,
                        TicketStatus.ASSIGNED,
                        TicketStatus.IN_PROGRESS,
                        TicketStatus.PENDING_CUSTOMER,
                        TicketStatus.ESCALATED,
                        TicketStatus.REOPENED,
                    ]
                ),
            )
        )
        open_ticket = open_ticket_result.scalar_one_or_none()

        if not open_ticket:
            dispute_ticket_id = f"TICKET{uuid.uuid4().hex[:8].upper()}"
            evidence_agent = await _find_least_loaded_agent(db, category=TicketCategory.TRANSACTION_DISPUTE)
            open_ticket = Ticket(
                ticket_id=dispute_ticket_id,
                customer_id=current_user.id,
                session_id=chat_session.id,
                assigned_agent_id=evidence_agent.id if evidence_agent else None,
                subject="Transaction dispute with provided reference",
                description=f"Customer submitted transaction dispute evidence: {message_data.content}",
                category=TicketCategory.TRANSACTION_DISPUTE,
                priority=TicketPriority.HIGH,
                status=TicketStatus.ASSIGNED if evidence_agent else TicketStatus.NEW,
                tags="dispute,evidence,auto-created",
            )
            db.add(open_ticket)
            await db.flush()

        dispute_details_payload = build_ai_message_payload(
            content=(
                f"Thank you. I have logged your dispute details and created ticket {open_ticket.ticket_id}. "
                "Our support team will follow up shortly."
            ),
            intent="transaction_dispute",
            confidence=0.99,
            response_language=selected_language,
            needs_escalation=True,
            session_intent="transaction_dispute_ticket_created",
        )
        return await persist_ai_response(dispute_details_payload)

    # When session is escalated, keep customer in human handoff mode
    if chat_session.status == SessionStatus.ESCALATED:
        handoff_result = await db.execute(
            select(ChatHandoff).filter(ChatHandoff.session_id == chat_session.id)
        )
        handoff = handoff_result.scalar_one_or_none()

        if handoff and handoff.assigned_agent_id:
            agent_result = await db.execute(
                select(User).filter(User.id == handoff.assigned_agent_id)
            )
            agent = agent_result.scalar_one_or_none()
            agent_name = agent.name if agent else "a support agent"
            waiting_message = f"Your case is with {agent_name}. They will reply here shortly."
        else:
            waiting_message = "Your case has been escalated to a human agent. Please wait for a response in this chat."

        waiting_payload = build_ai_message_payload(
            content=waiting_message,
            intent="escalation_request",
            confidence=0.99,
            response_language=selected_language,
            needs_escalation=False,
        )
        return await persist_ai_response(waiting_payload)

    # New airtime dispute detection (checked AFTER continuation so replies
    # containing "airtime" + "deducted" don't re-trigger the initial prompt)
    if _is_airtime_dispute_message(message_data.content):
        followup_payload = build_ai_message_payload(
            content=_airtime_dispute_followup_prompt(selected_language),
            intent="transaction_dispute",
            confidence=0.99,
            response_language=selected_language,
            needs_escalation=False,
            session_intent="transaction_dispute_airtime_pending",
        )
        return await persist_ai_response(followup_payload)

    # Continue location lookup when user provides area after being prompted
    if chat_session.last_intent and chat_session.last_intent.startswith("location_awaiting_area:"):
        stored_location_type = chat_session.last_intent.split(":", 1)[1]
        area_text = message_data.content.strip()
        if area_text:
            location_result = await location_service.find_nearest_locations(
                query=f"nearest {stored_location_type.replace('_', ' ')} in {area_text}",
                location_type=stored_location_type,
                limit=5,
            )

            if location_result.get("status") == "ok" and message_data.provider_name:
                scoped_results = _filter_locations_for_provider(
                    location_result.get("results") or [],
                    message_data.provider_name,
                )
                location_result["results"] = scoped_results[:5]
                location_result["count"] = len(location_result["results"])

            status_value = location_result.get("status")
            if status_value == "ok" and location_result.get("results"):
                location_payload = build_ai_message_payload(
                    content=_format_location_reply(selected_language, stored_location_type, location_result),
                    intent="atm_location" if stored_location_type == "atm" else "branch_location",
                    confidence=0.98,
                    response_language=selected_language,
                    needs_escalation=False,
                )
                return await persist_ai_response(location_payload)

            if status_value in {"location_not_found", "missing_area"}:
                retry_by_language = {
                    "en": "I couldn't find that location. Please try a different suburb, town, or city (example: nearest ATM in Avondale Harare).",
                    "sn": "Handina kuwana nzvimbo iyoyo. Ndapota edza suburb, town kana city yakasiyana (muenzaniso: nearest ATM in Avondale Harare).",
                    "nd": "Angikutholi leyondawo. Sicela uzame suburb, town kumbe city etshiyeneyo (isibonelo: nearest ATM in Avondale Harare).",
                }
                retry_payload = build_ai_message_payload(
                    content=retry_by_language.get(selected_language, retry_by_language["en"]),
                    intent="branch_location",
                    confidence=0.90,
                    response_language=selected_language,
                    needs_escalation=False,
                    session_intent=f"location_awaiting_area:{stored_location_type}",
                )
                return await persist_ai_response(retry_payload)

    # Live nearby location lookup (ATM, bank, Econet/NetOne shops, cash-out agents)
    if _is_location_request(message_data.content):
        location_type = _detect_location_type(
            message_data.content,
            provider_name=message_data.provider_name,
            provider_type=message_data.provider_type,
        )
        if location_type:
            location_result = await location_service.find_nearest_locations(
                query=message_data.content,
                location_type=location_type,
                limit=5,
            )

            if location_result.get("status") == "ok" and message_data.provider_name:
                scoped_results = _filter_locations_for_provider(
                    location_result.get("results") or [],
                    message_data.provider_name,
                )
                location_result["results"] = scoped_results[:5]
                location_result["count"] = len(location_result["results"])

            status_value = location_result.get("status")
            if status_value == "ok" and location_result.get("results"):
                location_payload = build_ai_message_payload(
                    content=_format_location_reply(selected_language, location_type, location_result),
                    intent="atm_location" if location_type == "atm" else "branch_location",
                    confidence=0.98,
                    response_language=selected_language,
                    needs_escalation=False,
                )
                return await persist_ai_response(location_payload)

            if status_value in {"location_not_found", "missing_area"}:
                prompt_by_language = {
                    "en": "Please share your suburb, town, or city so I can find the nearest real locations for you (example: nearest ATM in Avondale Harare).",
                    "sn": "Ndapota taura suburb, town kana city yako kuti ndikupe nzvimbo dziri pedyo chaidzo (muenzaniso: nearest ATM in Avondale Harare).",
                    "nd": "Sicela unikeze suburb, town kumbe city yakho ukuze ngithole indawo eziseduze zangempela (isibonelo: nearest ATM in Avondale Harare).",
                }
                missing_location_payload = build_ai_message_payload(
                    content=prompt_by_language.get(selected_language, prompt_by_language["en"]),
                    intent="branch_location",
                    confidence=0.95,
                    response_language=selected_language,
                    needs_escalation=False,
                    session_intent=f"location_awaiting_area:{location_type}",
                )
                return await persist_ai_response(missing_location_payload)

    # Process message with NLP service
    context_data = {
        "balance": "currently unavailable",
        "count": 0,
        "transactions": "No verified transactions loaded yet.",
        "ticket_id": "pending",
        "previous_intent": chat_session.last_intent,
        "provider_name": message_data.provider_name,
        "provider_type": message_data.provider_type,
    }
    
    nlp_response = nlp_service.process_message(
        message=message_data.content,
        user_language=selected_language,
        context=context_data
    )

    # ── LLM personalised response enhancement ──────────────────
    if llm_service.is_available and not nlp_response.get("needs_escalation"):
        # Fetch recent conversation history for context
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

        confidence = nlp_response.get("confidence", 0)
        llm_text = llm_service.generate_response(
            intent=nlp_response["intent"],
            language=nlp_response["language"],
            user_message=message_data.content,
            template_response=nlp_response["response"],
            context=context_data,
            conversation_history=conversation_history,
            confidence=confidence,
        )
        if llm_text:
            nlp_response["response"] = llm_text
    # ── End LLM enhancement ─────────────────────────────────────

    # ── Repeat-intent loop breaker ──────────────────────────────
    # If the user is sending another message that resolves to the SAME
    # intent they already received a full response for, don't repeat
    # the same canned answer.  Instead, escalate progressively.
    _LOOPABLE_INTENTS = {
        "network_connectivity",
        "security_pin",
        "transaction_dispute",
        "bill_payment",
        "password_reset",
    }

    _repeat_intent = nlp_response["intent"]
    _previous_intent = chat_session.last_intent

    if (
        _repeat_intent in _LOOPABLE_INTENTS
        and _previous_intent == _repeat_intent
    ):
        # Second repeat → offer to create a ticket / escalate
        _escalation_messages = {
            "network_connectivity": {
                "en": (
                    "I can see the troubleshooting steps haven't resolved your issue. "
                    "Let me escalate this to our technical support team so they can investigate further.\n\n"
                    "🎫 I'm creating a support ticket for you now. A technician will follow up with you shortly.\n\n"
                    "In the meantime:\n"
                    "• You can also call **114** (free from Econet) for immediate assistance\n"
                    "• Or visit your nearest Econet shop with your phone"
                ),
                "sn": (
                    "Ndinoona kuti maitiro ekugadzirisa matambudziko haana kushanda. "
                    "Rega ndiendese izvi kuboka redu rezvetekinoroji kuti vaongorore.\n\n"
                    "🎫 Ndiri kugadzira ticket yekukubatsira. Boka redu richatevera newe nekukurumidza.\n\n"
                    "Panguva ino:\n"
                    "• Unogona kufona **114** (mahara kubva pa Econet) kuti ubatsirwe nekukurumidza\n"
                    "• Kana kuti enda ku Econet shop iri pedyo nefoni yako"
                ),
                "nd": (
                    "Ngiyabona ukuthi amanyathelo okulungisa awakaxazululanga udaba lwakho. "
                    "Ake ngidlulisele lokhu ethimini yethu yezobuchwepheshe ukuze baphenye.\n\n"
                    "🎫 Ngidala i-ticket yokukusiza manje. Ithimu yethu izakulandela ngokushesha.\n\n"
                    "Okwamanje:\n"
                    "• Ungafona ku-**114** (mahhala ku-Econet) ukuze uthole usizo olusheshayo\n"
                    "• Noma uvakashele i-Econet shop eseduze ngefoni yakho"
                ),
            },
            "security_pin": {
                "en": "I understand you still need help with your PIN/security issue. Let me create a support ticket so our team can assist you directly.",
                "sn": "Ndinonzwisisa kuti uchiri kuda kubatsirwa nenyaya yePIN/security. Rega ndigadzire ticket kuti boka redu rikubatsire pachena.",
                "nd": "Ngiyakuzwa ukuthi usadinga usizo ngodaba lwe-PIN/security. Ake ngenze i-ticket ukuze ithimu yethu ikusize ngqo.",
            },
            "transaction_dispute": {
                "en": "I can see this transaction issue needs further investigation. Let me escalate it to our team with a support ticket.",
                "sn": "Ndinoona kuti nyaya yetransaction iyi inoda kuongororwa zvakadzikira. Rega ndiendese kuboka redu neticket.",
                "nd": "Ngiyabona ukuthi udaba lwale-transaction ludinga ukuphenywa okwengeziweyo. Ake ngidlulisele ethimini yethu nge-ticket.",
            },
        }

        intent_msgs = _escalation_messages.get(_repeat_intent, {})
        escalation_text = intent_msgs.get(selected_language, intent_msgs.get("en", "Let me escalate this to our team."))

        nlp_response["response"] = escalation_text
        nlp_response["needs_escalation"] = True
    # ── End loop breaker ────────────────────────────────────────

    payload = build_ai_message_payload(
        content=nlp_response["response"],
        intent=nlp_response["intent"],
        confidence=float(nlp_response["confidence"]),
        response_language=nlp_response["language"],
        needs_escalation=nlp_response.get("needs_escalation", False),
    )

    payload["response"] = _align_response_to_provider(
        payload["response"],
        message_data.provider_name,
    )

    # Auto-log low-confidence/ambiguous predictions for review and retraining
    confidence_value = float(nlp_response["confidence"])
    should_log_feedback = (
        confidence_value < LOW_CONFIDENCE_THRESHOLD
        or nlp_response.get("needs_escalation", False)
    )

    if should_log_feedback:
        feedback_entry = NLPFeedback(
            user_id=current_user.id,
            session_id=chat_session.id,
            message_id=customer_message.id,
            message_text=message_data.content,
            predicted_intent=nlp_response["intent"],
            predicted_confidence=str(nlp_response["confidence"]),
            language=nlp_response["language"],
            needs_escalation=nlp_response.get("needs_escalation", False)
        )
        db.add(feedback_entry)
    
    return await persist_ai_response(payload)


@router.get("/sessions/{session_id}/messages", response_model=List[MessageResponse])
async def get_session_messages(
    session_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all messages in a chat session
    
    Args:
        session_id: Session identifier
        current_user: Authenticated user
        db: Database session
    
    Returns:
        List of messages
    """
    # Staff can access any session; customers only their own
    session_filters = [ChatSession.session_id == session_id]
    if not current_user.is_staff:
        session_filters.append(ChatSession.customer_id == current_user.id)

    result = await db.execute(select(ChatSession).filter(*session_filters))
    chat_session = result.scalar_one_or_none()
    
    if not chat_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )
    
    # Get messages
    result = await db.execute(
        select(Message)
        .filter(Message.session_id == chat_session.id)
        .order_by(Message.timestamp)
    )
    messages = result.scalars().all()
    
    response_items = []
    for msg in messages:
        sender_name = None
        is_from_agent = False
        if msg.sender_id and not msg.is_from_customer and not msg.is_from_ai:
            sender_result = await db.execute(select(User).filter(User.id == msg.sender_id))
            sender = sender_result.scalar_one_or_none()
            if sender and sender.is_staff:
                is_from_agent = True
                sender_name = sender.name

        response_items.append(
            MessageResponse(
                id=msg.id,
                content=msg.content,
                language=msg.language,
                is_from_customer=msg.is_from_customer,
                is_from_ai=msg.is_from_ai,
                is_from_agent=is_from_agent,
                sender_name=sender_name,
                detected_intent=msg.detected_intent,
                confidence_score=msg.confidence_score,
                timestamp=msg.timestamp,
            )
        )

    return response_items


@router.post("/sessions/{session_id}/rating", response_model=dict)
async def submit_customer_rating(
    session_id: str,
    rating_data: RatingCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if rating_data.rating < 1 or rating_data.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    session_result = await db.execute(
        select(ChatSession).filter(
            ChatSession.session_id == session_id,
            ChatSession.customer_id == current_user.id,
        )
    )
    chat_session = session_result.scalar_one_or_none()
    if not chat_session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    existing_result = await db.execute(
        select(CustomerRating).filter(
            CustomerRating.session_id == chat_session.id,
            CustomerRating.customer_id == current_user.id,
        )
    )
    existing = existing_result.scalar_one_or_none()

    if existing:
        existing.rating = rating_data.rating
        existing.comment = rating_data.comment
        saved = existing
    else:
        saved = CustomerRating(
            session_id=chat_session.id,
            customer_id=current_user.id,
            rating=rating_data.rating,
            comment=rating_data.comment,
        )
        db.add(saved)

    await db.commit()
    await db.refresh(saved)

    return {
        "id": saved.id,
        "session_id": session_id,
        "rating": saved.rating,
        "comment": saved.comment,
        "created_at": saved.created_at.isoformat(),
    }


@router.get("/sessions/{session_id}/rating", response_model=dict)
async def get_customer_rating(
    session_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    session_result = await db.execute(
        select(ChatSession).filter(
            ChatSession.session_id == session_id,
            ChatSession.customer_id == current_user.id,
        )
    )
    chat_session = session_result.scalar_one_or_none()
    if not chat_session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    rating_result = await db.execute(
        select(CustomerRating).filter(
            CustomerRating.session_id == chat_session.id,
            CustomerRating.customer_id == current_user.id,
        )
    )
    rating = rating_result.scalar_one_or_none()

    return {
        "rating": rating.rating if rating else None,
        "comment": rating.comment if rating else None,
    }


@router.post("/sessions/{session_id}/complete", response_model=dict)
async def complete_chat_session(
    session_id: str,
    completion: SessionCompletionRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Complete a customer chat session with an explicit resolution outcome.

    - resolved=true: marks linked ticket as resolved and closes chat session.
    - resolved=false: keeps chat active and reopens linked ticket when needed.
    """
    session_filters = [ChatSession.session_id == session_id]
    if current_user.is_customer:
        session_filters.append(ChatSession.customer_id == current_user.id)

    session_result = await db.execute(select(ChatSession).filter(*session_filters))
    chat_session = session_result.scalar_one_or_none()
    if not chat_session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    if completion.rating is not None and (completion.rating < 1 or completion.rating > 5):
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    ticket_result = await db.execute(
        select(Ticket)
        .filter(Ticket.session_id == chat_session.id)
        .order_by(desc(Ticket.created_at))
        .limit(1)
    )
    linked_ticket = ticket_result.scalar_one_or_none()

    if linked_ticket:
        if completion.resolved:
            linked_ticket.status = TicketStatus.RESOLVED
            linked_ticket.resolved_at = datetime.utcnow()
        elif linked_ticket.status in (TicketStatus.PENDING_CUSTOMER, TicketStatus.RESOLVED, TicketStatus.CLOSED):
            linked_ticket.status = TicketStatus.REOPENED
            linked_ticket.closed_at = None

        if completion.rating is not None:
            linked_ticket.customer_satisfaction = completion.rating

        if completion.comment:
            existing_notes = linked_ticket.resolution_notes or ""
            separator = "\n" if existing_notes else ""
            linked_ticket.resolution_notes = f"{existing_notes}{separator}[customer_feedback] {completion.comment}".strip()

    if completion.rating is not None and current_user.is_customer:
        rating_result = await db.execute(
            select(CustomerRating).filter(
                CustomerRating.session_id == chat_session.id,
                CustomerRating.customer_id == current_user.id,
            )
        )
        rating = rating_result.scalar_one_or_none()
        if rating:
            rating.rating = completion.rating
            rating.comment = completion.comment
        else:
            db.add(
                CustomerRating(
                    session_id=chat_session.id,
                    customer_id=current_user.id,
                    rating=completion.rating,
                    comment=completion.comment,
                )
            )

    if completion.resolved:
        chat_session.status = SessionStatus.CLOSED
        chat_session.closed_at = datetime.utcnow()
        chat_session.last_intent = "session_closed"
    else:
        chat_session.status = SessionStatus.ACTIVE if chat_session.status != SessionStatus.ESCALATED else SessionStatus.ESCALATED
        chat_session.closed_at = None

    await db.commit()

    return {
        "session_id": chat_session.session_id,
        "session_status": chat_session.status.value,
        "ticket_id": linked_ticket.ticket_id if linked_ticket else None,
        "ticket_status": linked_ticket.status.value if linked_ticket else None,
        "message": "Session completed" if completion.resolved else "Session kept open for follow-up",
    }


@router.get("/escalations/inbox", response_model=dict)
async def get_escalation_inbox(
    current_user: User = Depends(require_agent),
    db: AsyncSession = Depends(get_db),
    limit: int = 20,
):
    result = await db.execute(
        select(ChatHandoff)
        .filter(ChatHandoff.status.in_(["pending", "assigned", "resolved"]))
        .order_by(desc(ChatHandoff.updated_at))
        .limit(limit)
    )
    handoffs = result.scalars().all()

    items = []
    for handoff in handoffs:
        session_result = await db.execute(
            select(ChatSession).filter(ChatSession.id == handoff.session_id)
        )
        chat_session = session_result.scalar_one_or_none()
        if not chat_session:
            continue

        customer_result = await db.execute(
            select(User).filter(User.id == handoff.customer_id)
        )
        customer = customer_result.scalar_one_or_none()

        ticket_result = await db.execute(
            select(Ticket)
            .filter(Ticket.session_id == chat_session.id)
            .order_by(desc(Ticket.created_at))
            .limit(1)
        )
        linked_ticket = ticket_result.scalar_one_or_none()

        # Check if current agent has replied to this escalation
        agent_message_result = await db.execute(
            select(Message)
            .filter(
                Message.session_id == chat_session.id,
                Message.sender_id == current_user.id
            )
            .limit(1)
        )
        agent_has_replied = agent_message_result.scalar_one_or_none() is not None

        items.append(
            {
                "session_id": chat_session.session_id,
                "status": handoff.status,
                "customer": customer.name if customer else "Unknown",
                "escalation_reason": chat_session.escalation_reason,
                "assigned_agent_id": handoff.assigned_agent_id,
                "ticket_id": linked_ticket.ticket_id if linked_ticket else None,
                "ticket_status": linked_ticket.status.value if linked_ticket else None,
                "updated_at": handoff.updated_at.isoformat() if handoff.updated_at else None,
                "unreplied": not agent_has_replied,
            }
        )

    return {"items": items}


@router.post("/sessions/{session_id}/assign-agent", response_model=dict)
async def claim_escalated_session(
    session_id: str,
    current_user: User = Depends(require_agent),
    db: AsyncSession = Depends(get_db),
):
    session_result = await db.execute(select(ChatSession).filter(ChatSession.session_id == session_id))
    chat_session = session_result.scalar_one_or_none()
    if not chat_session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    handoff_result = await db.execute(select(ChatHandoff).filter(ChatHandoff.session_id == chat_session.id))
    handoff = handoff_result.scalar_one_or_none()
    if not handoff:
        handoff = ChatHandoff(
            session_id=chat_session.id,
            customer_id=chat_session.customer_id,
            assigned_agent_id=current_user.id,
            status="assigned",
        )
        db.add(handoff)
    else:
        handoff.assigned_agent_id = current_user.id
        handoff.status = "assigned"

    ticket_result = await db.execute(
        select(Ticket)
        .filter(Ticket.session_id == chat_session.id)
        .order_by(desc(Ticket.created_at))
        .limit(1)
    )
    linked_ticket = ticket_result.scalar_one_or_none()
    if linked_ticket:
        linked_ticket.assigned_agent_id = current_user.id
        if linked_ticket.status in (TicketStatus.NEW, TicketStatus.ESCALATED, TicketStatus.REOPENED):
            linked_ticket.status = TicketStatus.ASSIGNED

    await db.commit()
    return {
        "session_id": session_id,
        "assigned_agent_id": current_user.id,
        "status": "assigned",
        "ticket_id": linked_ticket.ticket_id if linked_ticket else None,
    }


@router.post("/sessions/{session_id}/agent-message", response_model=dict)
async def send_agent_message(
    session_id: str,
    message_data: AgentMessageCreate,
    current_user: User = Depends(require_agent),
    db: AsyncSession = Depends(get_db),
):
    session_result = await db.execute(select(ChatSession).filter(ChatSession.session_id == session_id))
    chat_session = session_result.scalar_one_or_none()
    if not chat_session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    if chat_session.status != SessionStatus.ESCALATED:
        raise HTTPException(status_code=400, detail="Session is not escalated")

    handoff_result = await db.execute(select(ChatHandoff).filter(ChatHandoff.session_id == chat_session.id))
    handoff = handoff_result.scalar_one_or_none()
    if not handoff:
        handoff = ChatHandoff(
            session_id=chat_session.id,
            customer_id=chat_session.customer_id,
            assigned_agent_id=current_user.id,
            status="assigned",
        )
        db.add(handoff)
    else:
        handoff.assigned_agent_id = current_user.id
        handoff.status = "assigned"

    ticket_result = await db.execute(
        select(Ticket)
        .filter(Ticket.session_id == chat_session.id)
        .order_by(desc(Ticket.created_at))
        .limit(1)
    )
    linked_ticket = ticket_result.scalar_one_or_none()
    if linked_ticket:
        linked_ticket.assigned_agent_id = current_user.id
        if linked_ticket.status in (TicketStatus.NEW, TicketStatus.ASSIGNED, TicketStatus.ESCALATED, TicketStatus.REOPENED):
            linked_ticket.status = TicketStatus.IN_PROGRESS

    agent_message = Message(
        session_id=chat_session.id,
        sender_id=current_user.id,
        content=message_data.content,
        language=chat_session.current_language,
        is_from_customer=False,
        is_from_ai=False,
        detected_intent="human_agent",
        confidence_score="1.0",
    )
    db.add(agent_message)

    chat_session.last_intent = "human_agent"
    chat_session.confidence_score = "1.0"

    await db.commit()
    await db.refresh(agent_message)

    return {
        "message_id": agent_message.id,
        "content": agent_message.content,
        "sender_name": current_user.name,
        "timestamp": agent_message.timestamp.isoformat(),
    }


# ==================== Intent Correction (Agent / Supervisor) ====================

class IntentCorrectionRequest(BaseModel):
    message_text: str
    predicted_intent: str
    predicted_confidence: float
    corrected_intent: str
    language: Optional[str] = "en"
    session_id: Optional[str] = None


@router.post("/feedback/correct-intent", response_model=dict)
async def submit_intent_correction(
    body: IntentCorrectionRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Allow agents / supervisors to flag a misclassified message
    and record the correct intent. This feeds into the retraining pipeline.
    """
    feedback = NLPFeedback(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        session_id=body.session_id,
        message_text=body.message_text,
        predicted_intent=body.predicted_intent,
        predicted_confidence=str(body.predicted_confidence),
        language=body.language or "en",
        needs_escalation=False,
        corrected_intent=body.corrected_intent,
        reviewer_notes=f"Corrected by {current_user.role} via chat",
        reviewed=True,
        reviewed_by=current_user.id,
        reviewed_at=datetime.utcnow(),
    )
    db.add(feedback)
    await db.commit()

    return {"status": "ok", "feedback_id": feedback.id}


# ── LLM Configuration Endpoints ─────────────────────────────────

class LLMConfigUpdate(BaseModel):
    enabled: Optional[bool] = None
    api_key: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None


@router.get("/llm/status")
async def get_llm_status(
    current_user: User = Depends(require_agent),
):
    """Get current LLM configuration status (staff only)."""
    return {
        "enabled": settings.LLM_ENABLED,
        "available": llm_service.is_available,
        "provider": settings.LLM_PROVIDER,
        "model": settings.OPENAI_MODEL,
        "has_api_key": bool(settings.OPENAI_API_KEY),
        "temperature": settings.LLM_TEMPERATURE,
        "max_tokens": settings.LLM_MAX_TOKENS,
    }


@router.put("/llm/config")
async def update_llm_config(
    config: LLMConfigUpdate,
    current_user: User = Depends(require_agent),
):
    """Update LLM configuration at runtime (staff only). Persists to .env."""
    if config.enabled is not None:
        settings.LLM_ENABLED = config.enabled
    if config.api_key is not None:
        settings.OPENAI_API_KEY = config.api_key
    if config.model is not None:
        settings.OPENAI_MODEL = config.model
    if config.temperature is not None:
        settings.LLM_TEMPERATURE = max(0.0, min(1.0, config.temperature))
    if config.max_tokens is not None:
        settings.LLM_MAX_TOKENS = max(50, min(1000, config.max_tokens))

    # Persist LLM settings to .env so they survive restarts
    _persist_llm_settings()

    # Re-initialise the LLM client with new settings
    llm_service.reload()

    return {
        "status": "ok",
        "enabled": settings.LLM_ENABLED,
        "available": llm_service.is_available,
        "model": settings.OPENAI_MODEL,
    }


def _persist_llm_settings():
    """Write current LLM settings to the .env file."""
    import pathlib
    env_path = pathlib.Path(__file__).resolve().parents[3] / ".env"
    llm_keys = {
        "LLM_ENABLED": str(settings.LLM_ENABLED),
        "OPENAI_API_KEY": settings.OPENAI_API_KEY,
        "OPENAI_MODEL": settings.OPENAI_MODEL,
        "LLM_TEMPERATURE": str(settings.LLM_TEMPERATURE),
        "LLM_MAX_TOKENS": str(settings.LLM_MAX_TOKENS),
    }
    # Read existing .env
    lines = env_path.read_text().splitlines() if env_path.exists() else []
    existing_keys = set()
    new_lines = []
    for line in lines:
        key = line.split("=", 1)[0].strip() if "=" in line and not line.strip().startswith("#") else None
        if key in llm_keys:
            new_lines.append(f"{key}={llm_keys[key]}")
            existing_keys.add(key)
        else:
            new_lines.append(line)
    # Add any missing keys
    missing = set(llm_keys) - existing_keys
    if missing:
        new_lines.append("\n# LLM Configuration")
        for k in sorted(missing):
            new_lines.append(f"{k}={llm_keys[k]}")
    env_path.write_text("\n".join(new_lines) + "\n")
