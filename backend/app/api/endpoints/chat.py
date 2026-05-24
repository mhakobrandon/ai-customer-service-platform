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
from app.database.banking_session import banking_session_maker
from app.core.config import settings
from app.core.security import get_current_active_user, require_agent
from app.models.user import User
from app.models.chat_session import ChatSession, SessionStatus
from app.models.message import Message
from app.models.nlp_feedback import NLPFeedback
from app.models.ticket import Ticket, TicketCategory, TicketPriority, TicketStatus
from app.models.customer_rating import CustomerRating
from app.models.chat_handoff import ChatHandoff
from app.models.banking import BankingAccount, BankingProvider, BankingTransaction
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
        "mhepo", "recharge card",
        # Shona: "I bought airtime" / "buying airtime"
        "ndatenga airtime", "ndichitenga airtime", "ndakatenga airtime",
        "kutenga airtime", "ndatenga mhepo", "ndakatenga mhepo",
    ]
    dispute_keywords = [
        # English
        "deducted", "debited", "not received", "not recieved", "did not receive",
        "didnt receive", "didn't receive", "did not recieve", "didnt recieve", "didn't recieve",
        "failed", "missing", "nothing came", "airtime not come",
        # Shona full forms
        "yakabviswa", "haina kupinda", "handina kuwana", "isina kupinda",
        "haina kusvika", "haisina kusvika", "haisina kupinda",
        # Shona SHORTENED / colloquial forms (most common in real messages)
        "yabviswa",          # short for yakabviswa (deducted)
        "mabviswa",          # plural/generic deducted
        "hapana airtime",    # no airtime
        "hapana mhepo",      # no airtime (slang)
        "yapinda",           # came in  — used in negative: hapana yapinda
        "haisika",           # didn't arrive (short form)
        "haina kuuya",       # didn't come
        "haisisika",         # didn't reach
        # Ndebele
        "ikhutshwe", "angikatholi", "angitholanga",
        "ayifikanga", "ayibonakali",
    ]
    has_airtime = any(keyword in text_lower for keyword in airtime_keywords)
    has_dispute = any(keyword in text_lower for keyword in dispute_keywords)
    return has_airtime and has_dispute


# ── Bundle dispute helpers (data / SMS / voice / WhatsApp / Facebook) ─────────

_BUNDLE_TYPES = {
    "whatsapp": {
        "keywords": ["whatsapp", "wa bundle", "wtsapp", "whatsap", "wasap"],
        "en": "WhatsApp bundle",
        "sn": "WhatsApp bundle",
        "nd": "i-WhatsApp bundle",
    },
    "facebook": {
        "keywords": ["facebook", "fb bundle", "fb data", "facebook bundle"],
        "en": "Facebook bundle",
        "sn": "Facebook bundle",
        "nd": "i-Facebook bundle",
    },
    "sms": {
        "keywords": ["sms bundle", "sms", "text bundle", "mazwi bundle"],
        "en": "SMS bundle",
        "sn": "SMS bundle",
        "nd": "i-SMS bundle",
    },
    "voice": {
        "keywords": [
            "voice bundle", "call minutes", "minutes bundle", "voice minutes",
            "mazana", "maminitsi", "kufonera bundle", "voice",
        ],
        "en": "voice/minutes bundle",
        "sn": "bundle yemaminitsi/voice",
        "nd": "i-bundle yamazwi/minutes",
    },
    "data": {
        "keywords": [
            "data bundle", "internet bundle", "1gb", "2gb", "500mb", "250mb",
            "weekly bundle", "daily bundle", "monthly bundle", "data",
            "ndatenga bundle", "ndakatenga bundle", "ibundle",
        ],
        "en": "data bundle",
        "sn": "data bundle",
        "nd": "i-data bundle",
    },
}

_BUNDLE_DISPUTE_NON_RECEIPT_KEYWORDS = [
    # English
    "not working", "not activated", "not received", "didn't receive", "not loaded",
    "not come", "deducted", "charged but", "not showing", "expired immediately",
    "failed", "not showing up",
    # Shona — full & short forms
    "haishandisike", "haisina kushanda", "haina kuita basa", "hapana data",
    "hapana bundle", "hapana sms", "hapana voice", "hapana whatsapp",
    "hapana facebook", "yabviswa", "yakabviswa", "haina kusvika", "haisika",
    "haina kupinda", "haisina kupinda", "hapana yapinda",
    # Ndebele
    "ayisebenzi", "ayifikanga", "ayiqalanga", "ikhutshwe", "angitholanga",
]


def _detect_bundle_type(text: str) -> str:
    """Return the bundle type key (whatsapp/facebook/sms/voice/data)."""
    text_lower = (text or "").lower()
    # Check in priority order (most specific first)
    for bundle_key in ("whatsapp", "facebook", "sms", "voice", "data"):
        for kw in _BUNDLE_TYPES[bundle_key]["keywords"]:
            if kw in text_lower:
                return bundle_key
    return "data"  # default


def _is_bundle_dispute_message(text: str) -> bool:
    """
    Detect messages where the customer PURCHASED a bundle (data/SMS/voice/
    WhatsApp/Facebook) but did NOT receive it or it is not working.

    Requires BOTH a bundle keyword AND a non-receipt/deduction indicator.
    Pure "data not working" (no purchase signal) is handled by network_connectivity.
    """
    text_lower = (text or "").lower()

    # Must have an explicit purchase / deduction signal
    purchase_signals = [
        "bought", "purchased", "paid", "deducted", "charged",
        "ndatenga", "ndakatenga", "ndibhadharira", "yabviswa", "yakabviswa",
        "ngithenge", "ngakhokhela", "ikhutshwe",
    ]
    has_purchase = any(sig in text_lower for sig in purchase_signals)
    if not has_purchase:
        return False

    # Check for any bundle type keyword
    all_bundle_kws: List[str] = []
    for bt in _BUNDLE_TYPES.values():
        all_bundle_kws.extend(bt["keywords"])
    has_bundle_type = any(kw in text_lower for kw in all_bundle_kws)
    if not has_bundle_type:
        return False

    # Check for non-receipt / not-working signal
    has_non_receipt = any(kw in text_lower for kw in _BUNDLE_DISPUTE_NON_RECEIPT_KEYWORDS)
    return has_non_receipt


def _bundle_dispute_followup_prompt(language: str, bundle_key: str) -> str:
    """Return a type-specific prompt asking for the details we need."""
    info = _BUNDLE_TYPES.get(bundle_key, _BUNDLE_TYPES["data"])
    bundle_name = info.get(language, info["en"])

    # Per-type extra hint shown in the example line
    type_hint = {
        "whatsapp": {"en": "Daily WhatsApp", "sn": "Daily WhatsApp", "nd": "Daily WhatsApp"},
        "facebook":  {"en": "Daily Facebook", "sn": "Daily Facebook", "nd": "Daily Facebook"},
        "sms":       {"en": "50 SMS daily",   "sn": "50 SMS daily",   "nd": "50 SMS daily"},
        "voice":     {"en": "30min daily",    "sn": "30min daily",    "nd": "30min daily"},
        "data":      {"en": "1GB weekly",     "sn": "1GB weekly",     "nd": "1GB weekly"},
    }
    hint = type_hint.get(bundle_key, type_hint["data"]).get(language, "1GB weekly")

    prompts = {
        "en": (
            f"I understand — you purchased a {bundle_name} but it wasn't activated.\n\n"
            "To open a dispute ticket I need a few details:\n"
            f"1\ufe0f\u20e3 **Bundle type / description** (e.g. {hint})\n"
            "2\ufe0f\u20e3 **Amount deducted** (e.g. $2)\n"
            "3\ufe0f\u20e3 **Date & approximate time** (e.g. 17 May, 2pm)\n\n"
            f"Example: *{hint}, $2, 17 May 2pm*"
        ),
        "sn": (
            f"Ndinzwisisa — wakatenga {bundle_name} asi haina kushanda.\n\n"
            "Kuti ndivhure ticket yekupikisa, ndinoda ruzivo rwushomanana:\n"
            f"1\ufe0f\u20e3 **Mhando yebundle** (somuenzaniso {hint})\n"
            "2\ufe0f\u20e3 **Mari yakabviswa** (somuenzaniso $2)\n"
            "3\ufe0f\u20e3 **Zuva nenguva** zvakaitika (somuenzaniso: Chivabvu 17, nguva ye2pm)\n\n"
            f"Muenzaniso: *{hint}, $2, Chivabvu 17 nguva ye2pm*"
        ),
        "nd": (
            f"Ngiyakuzwa — uthenga i-{bundle_name} kodwa ayiqalanga ukusebenza.\n\n"
            "Ukuvula i-ticket yokuxabana, ngidinga imininingwane embalwa:\n"
            f"1\ufe0f\u20e3 **Uhlobo lwe-bundle** (isib. {hint})\n"
            "2\ufe0f\u20e3 **Inani elikhutshwe** (isib. $2)\n"
            "3\ufe0f\u20e3 **Usuku lesikhathi** (isib. May 17, cishe ngo-2pm)\n\n"
            f"Isibonelo: *{hint}, $2, May 17 ngo-2pm*"
        ),
    }
    return prompts.get(language, prompts["en"])


def _bundle_dispute_ticket_created_message(language: str, ticket_id: str, bundle_key: str) -> str:
    info = _BUNDLE_TYPES.get(bundle_key, _BUNDLE_TYPES["data"])
    bundle_name = info.get(language, info["en"])
    messages = {
        "en": (
            f"Thank you. I have created dispute ticket **{ticket_id}** for your {bundle_name}.\n\n"
            "Our technical team will:\n"
            "\u2022 Verify the purchase on our system\n"
            "\u2022 Activate the bundle or reverse the charge\n"
            "\u2022 Update you within **24-48 hours**"
        ),
        "sn": (
            f"Maita basa. Ndavhura ticket yekupikisa **{ticket_id}** ye{bundle_name} yako.\n\n"
            "Boka redu rezvitekinoroji richaita:\n"
            "\u2022 Kusimbisa kutenga pane system yedu\n"
            "\u2022 Kusimudza bundle kana kudzosera mari\n"
            "\u2022 Kukuudza mukati meawa **24-48**"
        ),
        "nd": (
            f"Ngiyabonga. Ngiqale i-ticket yokuxabana **{ticket_id}** ye{bundle_name} yakho.\n\n"
            "Ithimu yethu yezobuchwepheshe izakwenza:\n"
            "\u2022 Qinisekisa ukuthenga kuneqoqo lethu\n"
            "\u2022 Vula i-bundle noma ubuyisele imali\n"
            "\u2022 Kukwazisa ngaphakathi kwe **amahora angu-24-48**"
        ),
    }
    return messages.get(language, messages["en"])


def _looks_like_bundle_dispute_details(text: str) -> bool:
    """A bundle dispute reply is sufficient if it contains at least an amount."""
    return bool(re.search(r"\$?\d+(?:\.\d{1,2})?", text or ""))


# ── End bundle dispute helpers ─────────────────────────────────────────────────


def _is_outgoing_money_dispute_message(text: str) -> bool:
    """
    Detect messages where the customer is the SENDER — they sent money but it
    never arrived at the recipient. This is the sender-side dispute flow.
    """
    text_lower = (text or "").lower()

    outgoing_keywords = [
        # English
        "i sent", "i transfer", "i transferred", "i sent money", "sent money",
        "transfer money", "transferred money", "money didn't", "money didnt",
        # Shona — "I sent" / "I transferred" (active voice)
        "ndatumira", "ndakатumira", "ndakitumira", "ndichitumira", "ndinoda kutumira",
        "kutumira kwandiri", "tumira", "nditumira",
        # Ndebele — "I sent" / "I transferred"
        "ngithumela", "nginithunyelela", "ngilwandle", "ngakuthenga",
    ]

    non_arrival_keywords = [
        # English
        "didn't arrive", "did not arrive", "not received", "not arrived",
        "haven't received", "hasn't arrived", "never arrived", "not in wallet",
        "not in account", "missing", "not received yet", "failed",
        # Shona
        "haina kusvika", "haina kupinda", "handina kuwana", "haisina kusvika",
        "haina kuonekwa", "hairatidzi", "haina kuenda", "haisika", "yabviswa",
        "yakabviswa", "haiyakuwana", "hayakusvika",
        # Ndebele
        "ayifikanga", "angikatholi", "ayiqalanga", "ayibonakali", "ikhutshwe",
    ]

    has_outgoing = any(kw in text_lower for kw in outgoing_keywords)
    has_non_arrival = any(kw in text_lower for kw in non_arrival_keywords)
    return has_outgoing and has_non_arrival


def _is_incoming_money_dispute_message(text: str) -> bool:
    """
    Detect messages where the customer is the RECIPIENT — money was sent TO them
    but never arrived in their wallet.  This is a different flow from the sender
    dispute because the customer will not have a transaction reference.
    """
    text_lower = (text or "").lower()

    incoming_keywords = [
        # English
        "sent me", "send me", "was sent", "sending me", "were sent", "been sent",
        "i was sent", "someone sent", "they sent", "he sent", "she sent",
        "transfer to me", "transferred to me", "money to me",
        # Shona — "I was sent" / "they sent me"
        "ndatumirwa", "vakanditumira", "vakatumira", "wanditumira",
        "ndaitumirwa", "ndakatumirwa", "kuya kwandiri", "kutumira kwandiri",
        "ndanga ndichitumirwa", "vakandisendea", "vatumira kwandiri",
        # Ndebele
        "ngithunyelelwa", "bathumele", "wangithumela", "bangithumele",
        "bathumele imali", "ngithumele", "beze nayo",
    ]

    non_arrival_keywords = [
        # English
        "didn't arrive", "did not arrive", "not received", "not arrived",
        "haven't received", "hasn't arrived", "never arrived", "not in my wallet",
        "not in my account", "missing", "not showing", "not reflect", "didn't reflect",
        # Shona
        "haina kusvika", "haina kupinda", "handina kuwana", "haisina kusvika",
        "haina kuonekwa", "hairatidzi", "haina kuenda", "haisika",
        # Ndebele
        "ayifikanga", "angikatholi", "angitholanga", "ayifikanga", "ayibonakali",
    ]

    has_incoming = any(kw in text_lower for kw in incoming_keywords)
    has_non_arrival = any(kw in text_lower for kw in non_arrival_keywords)
    return has_incoming and has_non_arrival


def _detect_transfer_currency(text: str) -> Optional[str]:
    """
    Extract currency from a transfer message.
    Returns 'USD', 'ZiG', 'RTGS', or None (unknown — caller should ask).

    Priority:
      1. Explicit currency keyword (usd, zig, zwg, rtgs)
      2. '$' prefix on amount → USD
      3. None → caller must ask
    """
    t = (text or "").lower()
    if re.search(r"\busd\b", t):
        return "USD"
    if re.search(r"\b(?:zig|zwg|zimbabwe\s*gold|zimbabwe gold)\b", t):
        return "ZiG"
    if re.search(r"\brtgs\b", t):
        return "RTGS"
    if re.search(r"\$\d", text):          # $ before digits → USD
        return "USD"
    return None   # unknown — must ask



def _outgoing_dispute_followup_prompt(language: str) -> str:
    """Ask for the details specific to a sender-side dispute."""
    prompts = {
        "en": (
            "I understand — you sent money but it hasn't arrived at the recipient's wallet. "
            "To open a dispute ticket I need a few details:\n\n"
            "1️⃣ **Recipient's phone number** (who you sent the money to)\n"
            "2️⃣ **Amount sent** (e.g. $10)\n"
            "3️⃣ **Date & approximate time** it was sent (e.g. 17 May, around 2pm)\n\n"
            "Example: *0771234567, $10, 17 May 2pm*"
        ),
        "sn": (
            "Ndinzwisisa — wakatumira mari asi haina kusvika kumunhu. "
            "Kuti ndivhure ticket yekupikisa, ndinoda ruzivo rwushomanana:\n\n"
            "1️⃣ **Nhamba yefoni yemunhu** (wandakautumira mari)\n"
            "2️⃣ **Mari yatumirwa** (somuenzaniso $10)\n"
            "3️⃣ **Zuva nenguva** zvayakatumirwa (somuenzaniso: Chivabvu 17, nguva ye2pm)\n\n"
            "Muenzaniso: *0771234567, $10, Chivabvu 17 nguva ye2pm*"
        ),
        "nd": (
            "Ngiyakuzwa — uthumela imali kodwa ayifikanga kumamukeli. "
            "Ukuvula i-ticket yokuxabana, ngidinga imininingwane embalwa:\n\n"
            "1️⃣ **Inombolo yocingo yomamukeli** (umuntu okuthumele imali)\n"
            "2️⃣ **Inani elithunyelelwe** (isib. $10)\n"
            "3️⃣ **Usuku lesikhathi** okuthumela (isib. May 17, cishe ngo-2pm)\n\n"
            "Isibonelo: *0771234567, $10, May 17 ngo-2pm*"
        ),
    }
    return prompts.get(language, prompts["en"])


def _incoming_dispute_followup_prompt(language: str) -> str:
    """Ask for the details specific to a recipient-side dispute."""
    prompts = {
        "en": (
            "I understand — you were expecting to receive money but it hasn't arrived. "
            "To open a dispute ticket I need a few details:\n\n"
            "1️⃣ **Sender's phone number** (the person who sent you money)\n"
            "2️⃣ **Amount expected** (e.g. $10)\n"
            "3️⃣ **Date & approximate time** it was sent (e.g. 17 May, around 2pm)\n\n"
            "Example: *0771234567, $10, 17 May 2pm*"
        ),
        "sn": (
            "Ndinzwisisa — wakanga uchitarisira mari asi haina kusvika. "
            "Kuti ndivhure ticket yekupikisa, ndinoda ruzivo rwushomanana:\n\n"
            "1️⃣ **Nhamba yefoni yemutumiri** (munhu wakakutumira mari)\n"
            "2️⃣ **Mari yakatarisiwa** (somuenzaniso $10)\n"
            "3️⃣ **Zuva nenguva** zvayakange ichatumirwa (somuenzaniso: Chivabvu 17, nguva ye2pm)\n\n"
            "Muenzaniso: *0771234567, $10, Chivabvu 17 nguva ye2pm*"
        ),
        "nd": (
            "Ngiyakuzwa — ulindele ukwamukela imali kodwa ayifikanga. "
            "Ukuvula i-ticket yokuxabana, ngidinga imininingwane embalwa:\n\n"
            "1️⃣ **Inombolo yocingo yomthumeli** (umuntu okuthumele imali)\n"
            "2️⃣ **Inani elilindelekile** (isib. $10)\n"
            "3️⃣ **Usuku lesikhathi** okuseyo ukuthumela (isib. May 17, cishe ngo-2pm)\n\n"
            "Isibonelo: *0771234567, $10, May 17 ngo-2pm*"
        ),
    }
    return prompts.get(language, prompts["en"])


def _incoming_dispute_ticket_created_message(language: str, ticket_id: str) -> str:
    messages = {
        "en": (
            f"Thank you. I have created dispute ticket **{ticket_id}** for you.\n\n"
            "Our team will:\n"
            "• Contact the sender's wallet to verify the transaction\n"
            "• Trace the payment on our network\n"
            "• Update you within **24-48 hours**\n\n"
            "If the money was sent, it will be credited to your account."
        ),
        "sn": (
            f"Maita basa. Ndavhura ticket yekupikisa **{ticket_id}** kwauri.\n\n"
            "Boka redu richaita:\n"
            "• Kubata wallet yemutumiri kuona kana mari yakabuda\n"
            "• Kutsvaga nzira yemari munetweki yedu\n"
            "• Kukuudza mukati meawa **24-48**\n\n"
            "Kana mari yakange yatumirwa, ichaiswa muaccount yako."
        ),
        "nd": (
            f"Ngiyabonga. Ngiqale i-ticket yokuxabana **{ticket_id}** ngokumelene lawe.\n\n"
            "Ithimu yethu izakwenza:\n"
            "• Xhumana ne-wallet yomthumeli ukuqinisekisa umsebenzi\n"
            "• Landela inzuzo kunetwethi yethu\n"
            "• Kukwazisa ngaphakathi kwe **amahora angu-24-48**\n\n"
            "Uma imali ithunyelwe, izafakwa ku-akhawunti yakho."
        ),
    }
    return messages.get(language, messages["en"])


def _looks_like_incoming_dispute_details(text: str) -> bool:
    """
    Check whether a reply to the incoming-dispute prompt contains enough information:
    sender phone + amount.  Date is optional but helpful.
    """
    text_value = text or ""
    has_phone = bool(re.search(r"\b(?:0|263|\+263)?(?:7[1-9])\d{7}\b", text_value))
    has_amount = bool(re.search(r"\$?\d+(?:\.\d{1,2})?", text_value))
    return has_phone and has_amount


def _extract_amounts(text: str) -> List[str]:
    return re.findall(r"\$?\d+(?:\.\d{1,2})?", text or "")


def _looks_like_transaction_dispute_details(text: str) -> bool:
    text_value = text or ""
    lower_text = text_value.lower()

    # Match known prefixes (tc, tq, trx, ref, mp, ci) OR a single letter followed by
    # 6+ alphanumeric chars — covers real EcoCash refs like t234444444, c9812345, etc.
    # Also matches 2-4 letter prefixes like QA2333444, ECA12345 (common EcoCash formats).
    has_reference = bool(
        re.search(r"\b(?:tc|tq|trx|ref|mp|ci)[a-z0-9]{6,}\b", lower_text)
        or re.search(r"\b[a-z]\d{6,}\b", lower_text)
        or re.search(r"\b[a-zA-Z]{2,4}\d{5,}\b", text_value)  # QA2333444, ECA12345
    )
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


def _provider_code_for_name(provider_name: Optional[str]) -> Optional[str]:
    if not provider_name:
        return None
    normalized = provider_name.strip().lower()
    provider_map = {
        "ecocash": "ECOCASH",
        "onemoney": "ONEMONEY",
        "one money": "ONEMONEY",
        "innbucks": "INNBUCKS",
        "telecash": "TELECASH",
        "cbz": "CBZ",
        "steward": "STEWARD",
        "steward bank": "STEWARD",
        "stanbic": "STANBIC",
        "nmb": "NMB",
        "fbc": "FBC",
        "zb": "ZB",
        "zb bank": "ZB",
        "cabs": "CABS",
    }
    return provider_map.get(normalized)


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
    provider_account_identifier: Optional[str] = None


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

    # ── Bundle dispute continuation ───────────────────────────────────────────
    # session_intent is encoded as "transaction_dispute_bundle_pending:{bundle_key}"
    if (
        chat_session.last_intent
        and chat_session.last_intent.startswith("transaction_dispute_bundle_pending:")
    ):
        stored_bundle_key = chat_session.last_intent.split(":", 1)[1]
        if _looks_like_bundle_dispute_details(message_data.content):
            bundle_ticket_id = f"TICKET{uuid.uuid4().hex[:8].upper()}"
            bundle_agent = await _find_least_loaded_agent(db, category=TicketCategory.TRANSACTION_DISPUTE)
            bundle_type_info = _BUNDLE_TYPES.get(stored_bundle_key, _BUNDLE_TYPES["data"])
            bundle_ticket = Ticket(
                ticket_id=bundle_ticket_id,
                customer_id=current_user.id,
                session_id=chat_session.id,
                assigned_agent_id=bundle_agent.id if bundle_agent else None,
                subject=f"{bundle_type_info['en'].title()} not received after purchase",
                description=(
                    f"Customer purchased a {bundle_type_info['en']} but it was not activated. "
                    f"Customer-provided details: {message_data.content}"
                ),
                category=TicketCategory.TRANSACTION_DISPUTE,
                priority=TicketPriority.HIGH,
                status=TicketStatus.ASSIGNED if bundle_agent else TicketStatus.NEW,
                tags=f"dispute,bundle,{stored_bundle_key},auto-created",
            )
            db.add(bundle_ticket)
            await db.flush()

            bundle_created_payload = build_ai_message_payload(
                content=_bundle_dispute_ticket_created_message(
                    selected_language, bundle_ticket_id, stored_bundle_key
                ),
                intent="transaction_dispute",
                confidence=0.99,
                response_language=selected_language,
                needs_escalation=True,
                session_intent="transaction_dispute_ticket_created",
            )
            return await persist_ai_response(bundle_created_payload)
        else:
            # Missing amount — ask again
            bundle_type_info = _BUNDLE_TYPES.get(stored_bundle_key, _BUNDLE_TYPES["data"])
            retry_msgs = {
                "en": (
                    f"I still need the amount that was deducted for the "
                    f"{bundle_type_info['en']} to raise a ticket. "
                    "Please share the amount (e.g. $2) and the bundle type."
                ),
                "sn": (
                    f"Ndinoda mari yakabviswa ye{bundle_type_info['sn']} "
                    "kuti ndivhure ticket. Ndapota tipa mari (somuenzaniso $2) nemhando yebundle."
                ),
                "nd": (
                    f"Ngisadinga inani elikhutshwe le{bundle_type_info['nd']} "
                    "ukuvula i-ticket. Sicela unikeze inani (isib. $2) kanye nohlobo lwe-bundle."
                ),
            }
            bundle_retry_payload = build_ai_message_payload(
                content=retry_msgs.get(selected_language, retry_msgs["en"]),
                intent="transaction_dispute",
                confidence=0.98,
                response_language=selected_language,
                needs_escalation=False,
                session_intent=f"transaction_dispute_bundle_pending:{stored_bundle_key}",
            )
            return await persist_ai_response(bundle_retry_payload)

    # ── Outgoing money dispute continuation ─────────────────────────────────
    # When we're waiting for: recipient phone + amount + date.
    if chat_session.last_intent == "transaction_dispute_outgoing_pending":
        if _looks_like_incoming_dispute_details(message_data.content):
            # Sufficient details — create the ticket
            outgoing_ticket_id = f"TICKET{uuid.uuid4().hex[:8].upper()}"
            outgoing_agent = await _find_least_loaded_agent(db, category=TicketCategory.TRANSACTION_DISPUTE)
            outgoing_ticket = Ticket(
                ticket_id=outgoing_ticket_id,
                customer_id=current_user.id,
                session_id=chat_session.id,
                assigned_agent_id=outgoing_agent.id if outgoing_agent else None,
                subject="Outgoing money transfer — recipient did not receive",
                description=(
                    f"Customer reports sending money to recipient but it did not arrive in recipient's wallet. "
                    f"Customer-provided details: {message_data.content}"
                ),
                category=TicketCategory.TRANSACTION_DISPUTE,
                priority=TicketPriority.HIGH,
                status=TicketStatus.ASSIGNED if outgoing_agent else TicketStatus.NEW,
                tags="dispute,outgoing,transfer-failed,auto-created",
            )
            db.add(outgoing_ticket)
            await db.flush()

            outgoing_created_payload = build_ai_message_payload(
                content=_incoming_dispute_ticket_created_message(selected_language, outgoing_ticket_id),
                intent="transaction_dispute",
                confidence=0.99,
                response_language=selected_language,
                needs_escalation=True,
                session_intent="transaction_dispute_ticket_created",
            )
            return await persist_ai_response(outgoing_created_payload)
        else:
            # Still missing recipient phone or amount — ask again
            retry_msgs = {
                "en": (
                    "I still need a bit more to raise the ticket. Please share:\n"
                    "• **Recipient's phone number** (e.g. 0771234567)\n"
                    "• **Amount sent** (e.g. $10)"
                ),
                "sn": (
                    "Ndinoda zvishomashoma zvakawanda kuti ndivhure ticket. Ndapota tipa:\n"
                    "• **Nhamba yefoni yemunhu** (somuenzaniso 0771234567)\n"
                    "• **Mari yatumirwa** (somuenzaniso $10)"
                ),
                "nd": (
                    "Ngisadinga okwengeziweyo ukuvula i-ticket. Sicela unikeze:\n"
                    "• **Inombolo yocingo yomamukeli** (isib. 0771234567)\n"
                    "• **Inani elithunyelelwe** (isib. $10)"
                ),
            }
            retry_payload = build_ai_message_payload(
                content=retry_msgs.get(selected_language, retry_msgs["en"]),
                intent="transaction_dispute",
                confidence=0.98,
                response_language=selected_language,
                needs_escalation=False,
                session_intent="transaction_dispute_outgoing_pending",
            )
            return await persist_ai_response(retry_payload)

    # ── Incoming money dispute continuation ─────────────────────────────────
    # When we're waiting for: sender phone + amount + date.
    if chat_session.last_intent == "transaction_dispute_incoming_pending":
        if _looks_like_incoming_dispute_details(message_data.content):
            # Sufficient details — create the ticket
            incoming_ticket_id = f"TICKET{uuid.uuid4().hex[:8].upper()}"
            incoming_agent = await _find_least_loaded_agent(db, category=TicketCategory.TRANSACTION_DISPUTE)
            incoming_ticket = Ticket(
                ticket_id=incoming_ticket_id,
                customer_id=current_user.id,
                session_id=chat_session.id,
                assigned_agent_id=incoming_agent.id if incoming_agent else None,
                subject="Incoming money not received — recipient dispute",
                description=(
                    f"Customer reports money was sent TO them but did not arrive in their wallet. "
                    f"Customer-provided details: {message_data.content}"
                ),
                category=TicketCategory.TRANSACTION_DISPUTE,
                priority=TicketPriority.HIGH,
                status=TicketStatus.ASSIGNED if incoming_agent else TicketStatus.NEW,
                tags="dispute,incoming,no-reference,auto-created",
            )
            db.add(incoming_ticket)
            await db.flush()

            incoming_created_payload = build_ai_message_payload(
                content=_incoming_dispute_ticket_created_message(selected_language, incoming_ticket_id),
                intent="transaction_dispute",
                confidence=0.99,
                response_language=selected_language,
                needs_escalation=True,
                session_intent="transaction_dispute_ticket_created",
            )
            return await persist_ai_response(incoming_created_payload)
        else:
            # Still missing sender phone or amount — ask again once
            retry_msgs = {
                "en": (
                    "I still need a bit more to raise the ticket. Please share:\n"
                    "• **Sender's phone number** (e.g. 0771234567)\n"
                    "• **Amount expected** (e.g. $10)"
                ),
                "sn": (
                    "Ndinoda zvishomashoma zvakawanda kuti ndivhure ticket. Ndapota tipa:\n"
                    "• **Nhamba yefoni yemutumiri** (somuenzaniso 0771234567)\n"
                    "• **Mari yakatarisiwa** (somuenzaniso $10)"
                ),
                "nd": (
                    "Ngisadinga okwengeziweyo ukuvula i-ticket. Sicela unikeze:\n"
                    "• **Inombolo yocingo yomthumeli** (isib. 0771234567)\n"
                    "• **Inani elilindelekile** (isib. $10)"
                ),
            }
            retry_payload = build_ai_message_payload(
                content=retry_msgs.get(selected_language, retry_msgs["en"]),
                intent="transaction_dispute",
                confidence=0.98,
                response_language=selected_language,
                needs_escalation=False,
                session_intent="transaction_dispute_incoming_pending",
            )
            return await persist_ai_response(retry_payload)

    # ── Airtime dispute continuation ─────────────────────────────────────────
    # IMPORTANT: this block must return in BOTH branches.
    # If we fall through when amounts >= 2, the reply (which contains "airtime"
    # + "yakabviswa") re-triggers _is_airtime_dispute_message() below and loops.
    if chat_session.last_intent == "transaction_dispute_airtime_pending":
        amounts = _extract_amounts(message_data.content)
        if len(amounts) >= 2:
            # Enough info — create the ticket now
            airtime_ticket_id = f"TICKET{uuid.uuid4().hex[:8].upper()}"
            airtime_agent = await _find_least_loaded_agent(db, category=TicketCategory.TRANSACTION_DISPUTE)
            airtime_ticket = Ticket(
                ticket_id=airtime_ticket_id,
                customer_id=current_user.id,
                session_id=chat_session.id,
                assigned_agent_id=airtime_agent.id if airtime_agent else None,
                subject="Airtime deducted but not received",
                description=(
                    f"Customer reported airtime purchase issue. "
                    f"Airtime amount: {amounts[0]}, deducted amount: {amounts[1]}. "
                    f"Original message: {message_data.content}"
                ),
                category=TicketCategory.TRANSACTION_DISPUTE,
                priority=TicketPriority.HIGH,
                status=TicketStatus.ASSIGNED if airtime_agent else TicketStatus.NEW,
                tags="airtime,dispute,auto-created",
            )
            db.add(airtime_ticket)
            await db.flush()

            airtime_created_msgs = {
                "en": (
                    f"We are sorry about this. Your issue has been passed to our team. "
                    f"We assure you it will be resolved in the shortest possible time.\n\n"
                    f"🎫 Ticket Reference: **{airtime_ticket_id}**\n"
                    f"📋 Details: Airtime {amounts[0]}, Deducted {amounts[1]}\n"
                    f"⏱️ Expected resolution: 24-48 hours"
                ),
                "sn": (
                    f"Tine urombo nyaya yenyu taipa kuteam yedu. "
                    f"Tinokuvimbisai kuti zvinogadzirisika muchikamu chipfupi chinotevera.\n\n"
                    f"🎫 Nhamba yeTicket: **{airtime_ticket_id}**\n"
                    f"📋 Ruzivo: Airtime {amounts[0]}, Yakabviswa {amounts[1]}\n"
                    f"⏱️ Nguva yekugadziriswa: Maawa 24-48"
                ),
                "nd": (
                    f"Siyaxolisa ngalokhu. Inkinga yenu inikelwe ithimba lethu. "
                    f"Siqinisekisa ukuthi izaxazululwa ngesikhathi esifishane.\n\n"
                    f"🎫 Inombolo ye-Ticket: **{airtime_ticket_id}**\n"
                    f"📋 Imininingwane: I-Airtime {amounts[0]}, Elikhutshwe {amounts[1]}\n"
                    f"⏱️ Isikhathi esilindelwe: Amahora angu-24-48"
                ),
            }
            airtime_created_payload = build_ai_message_payload(
                content=airtime_created_msgs.get(selected_language, airtime_created_msgs["en"]),
                intent="transaction_dispute",
                confidence=0.99,
                response_language=selected_language,
                needs_escalation=True,
                session_intent="transaction_dispute_ticket_created",
            )
            return await persist_ai_response(airtime_created_payload)
        else:
            # Still missing one of the amounts — ask again
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
        # --- Explicit "I don't have a reference" detection ---
        # Catches Shona, Ndebele, and English phrases so we don't rely on the
        # word "referensi" accidentally matching the reference regex.
        _no_ref_phrases = [
            # Shona
            "handina referensi", "handina ref", "handina nhamba", "handina transaction",
            "ndanga ndichitumirwa", "ndaitumirwa", "wanditumira", "vakatumira",
            "ndakatumirwa", "vakanditumira",
            # Ndebele
            "anginayo i-reference", "anginayo ireferensi", "anginalutho", "ngithunyelelwa",
            # English
            "no reference", "don't have reference", "don't have a reference",
            "i was sent", "was sent money", "didn't send", "receiving money",
            "someone sent me", "they sent me",
        ]
        _content_lower = message_data.content.lower()
        if any(phrase in _content_lower for phrase in _no_ref_phrases):
            no_ref_ticket_id = f"TICKET{uuid.uuid4().hex[:8].upper()}"
            no_ref_agent = await _find_least_loaded_agent(db, category=TicketCategory.TRANSACTION_DISPUTE)
            no_ref_ticket = Ticket(
                ticket_id=no_ref_ticket_id,
                customer_id=current_user.id,
                session_id=chat_session.id,
                assigned_agent_id=no_ref_agent.id if no_ref_agent else None,
                subject="Transaction dispute — customer has no reference number",
                description=(
                    f"Customer reported money was sent to them but did not arrive. "
                    f"Customer stated they do not have a transaction reference. "
                    f"Customer message: {message_data.content}"
                ),
                category=TicketCategory.TRANSACTION_DISPUTE,
                priority=TicketPriority.HIGH,
                status=TicketStatus.ASSIGNED if no_ref_agent else TicketStatus.NEW,
                tags="dispute,no-reference,auto-created",
            )
            db.add(no_ref_ticket)
            await db.flush()

            no_ref_msgs = {
                "en": (
                    f"No problem — I have created dispute ticket **{no_ref_ticket_id}** for you. "
                    "Our support team will contact the sender's side to investigate. "
                    "You will be updated as soon as there is progress."
                ),
                "sn": (
                    f"Hapana dambudziko — Ndavhura ticket yekupikisa **{no_ref_ticket_id}** kwauri. "
                    "Boka redu richaongorora kurutivi rwakatumira. "
                    "Uchaziviswa pakava nemashoko matsva."
                ),
                "nd": (
                    f"Akukho inkinga — Ngiqale i-ticket yokuxabana **{no_ref_ticket_id}** ngokumelene lawe. "
                    "Ithimu yethu izaphenyisisa ohlangothini oluthunyelayo. "
                    "Uzaziswa uma sekukhona okuthile okusha."
                ),
            }
            no_ref_payload = build_ai_message_payload(
                content=no_ref_msgs.get(selected_language, no_ref_msgs["en"]),
                intent="transaction_dispute",
                confidence=0.99,
                response_language=selected_language,
                needs_escalation=True,
                session_intent="transaction_dispute_ticket_created",
            )
            return await persist_ai_response(no_ref_payload)
        # --- End "no reference" detection ---

        if _looks_like_transaction_dispute_details(message_data.content):
            pass  # Fall through to the ticket-creation block below
        else:
            # User provided partial details — try to create a ticket with what we have
            has_any_detail = (
                bool(re.search(r'\b(?:tc|tq|trx|ref|mp|ci)[a-z0-9]{6,}\b', message_data.content.lower()))
                or bool(re.search(r'\b[a-z]\d{6,}\b', message_data.content.lower()))
                or bool(re.search(r'\b[a-zA-Z]{2,4}\d{5,}\b', message_data.content))  # QA2333444
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

    # New outgoing-money dispute detection — fires when customer says they sent money
    # but it didn't arrive. Ask for recipient phone + amount + date.
    if _is_outgoing_money_dispute_message(message_data.content):
        outgoing_prompt_payload = build_ai_message_payload(
            content=_outgoing_dispute_followup_prompt(selected_language),
            intent="transaction_dispute",
            confidence=0.99,
            response_language=selected_language,
            needs_escalation=False,
            session_intent="transaction_dispute_outgoing_pending",
        )
        return await persist_ai_response(outgoing_prompt_payload)

    # New incoming-money dispute detection — fires when customer says money was sent
    # TO them but never arrived.  Ask for sender number + amount, NOT a ref number
    # (which the recipient would not have).
    if _is_incoming_money_dispute_message(message_data.content):
        incoming_prompt_payload = build_ai_message_payload(
            content=_incoming_dispute_followup_prompt(selected_language),
            intent="transaction_dispute",
            confidence=0.99,
            response_language=selected_language,
            needs_escalation=False,
            session_intent="transaction_dispute_incoming_pending",
        )
        return await persist_ai_response(incoming_prompt_payload)

    # New bundle dispute detection (data / SMS / voice / WhatsApp / Facebook)
    # Fires when customer bought a bundle but it wasn't activated.
    # Must NOT re-trigger when already in a bundle pending state (handled above).
    if _is_bundle_dispute_message(message_data.content):
        detected_bundle_key = _detect_bundle_type(message_data.content)
        bundle_prompt_payload = build_ai_message_payload(
            content=_bundle_dispute_followup_prompt(selected_language, detected_bundle_key),
            intent="transaction_dispute",
            confidence=0.99,
            response_language=selected_language,
            needs_escalation=False,
            session_intent=f"transaction_dispute_bundle_pending:{detected_bundle_key}",
        )
        return await persist_ai_response(bundle_prompt_payload)

    # ── Direct "Tumira $50 kuna Mai" detection ──────────────────────────────
    # When user gives amount + name (no phone), ask for the recipient's number
    # and jump straight into ecocash_transfer_pending.
    _direct_send_verbs = [
        "tumira", "kutumira", "ndirikuda kutumira", "ndinoda kutumira",
        "thumela", "ukuthumela", "ngifuna ukuthumela", "send", "transfer",
    ]
    _has_direct_verb = any(v in message_data.content.lower() for v in _direct_send_verbs)
    _has_dollar_amount = bool(re.search(r"\$\d+", message_data.content))
    _has_phone = bool(re.search(r"\b(?:0|263|\+263)?(?:7[1-9])\d{7}\b", message_data.content))
    _transfer_pending_states = {
        "transfer_money_ecocash_transfer_pending",
        "transfer_money_internal_transfer_pending",
        "transfer_money_zipit_transfer_pending",
        "transfer_money_rtgs_transfer_pending",
        "transfer_money_completed",
    }
    if _has_direct_verb and _has_dollar_amount and not _has_phone and chat_session.last_intent not in _transfer_pending_states:
        _amounts_found = re.findall(r"\$\d+(?:\.\d{1,2})?", message_data.content)
        _pre_amount = _amounts_found[0] if _amounts_found else ""
        _direct_send_msgs = {
            "en": (
                f"I can send {_pre_amount} for you right away! \U0001f4b8\n\n"
                "Please provide the **recipient's phone number** to complete the transfer.\n"
                "Example: *0771234567*"
            ),
            "sn": (
                f"Ndinogona kutumira {_pre_amount} pakarepo! \U0001f4b8\n\n"
                "Ndapota tipa **nhamba yefoni yemunhu** kuti tipedzise kutumira.\n"
                "Muenzaniso: *0771234567*"
            ),
            "nd": (
                f"Ngingakuthumelela {_pre_amount} masinyane! \U0001f4b8\n\n"
                "Sicela unikeze **inombolo yocingo yomamukeli** ukuze siqede ukuthumela.\n"
                "Isibonelo: *0771234567*"
            ),
        }
        direct_send_payload = build_ai_message_payload(
            content=_direct_send_msgs.get(selected_language, _direct_send_msgs["en"]),
            intent="transfer_money",
            confidence=0.98,
            response_language=selected_language,
            needs_escalation=False,
            session_intent="transfer_money_ecocash_transfer_pending",
        )
        return await persist_ai_response(direct_send_payload)

    # ── Transfer currency continuation ──────────────────────────────────────
    # Fires when session_intent encodes pending transfer details after asking
    # for currency: "transfer_money_ecocash_transfer_pending|recipient=X|amount=Y"
    _last = chat_session.last_intent or ""
    if "|recipient=" in _last and "_pending" in _last:
        _parts = dict(p.split("=", 1) for p in _last.split("|")[1:] if "=" in p)
        _base_state = _last.split("|")[0]
        _stored_recipient = _parts.get("recipient", "(unknown)")
        _stored_amount = _parts.get("amount", "(unknown)")
        _replied_currency = _detect_transfer_currency(message_data.content)

        # If still can't detect (user typed something else), ask again
        if _replied_currency is None:
            _ask_again = {
                "en": "Sorry, I didn't catch that. Please reply with **USD** or **ZiG**.",
                "sn": "Ndinzwisisa. Ndapota pindura ne **USD** kana **ZiG**.",
                "nd": "Ngiyaxolisa, angizwanga. Sicela uphendule nge **USD** noma **ZiG**.",
            }
            return await persist_ai_response(build_ai_message_payload(
                content=_ask_again.get(selected_language, _ask_again["en"]),
                intent="transfer_money",
                confidence=0.98,
                response_language=selected_language,
                needs_escalation=False,
                session_intent=_last,  # keep same state
            ))

        _sender_number = getattr(current_user, "phone_number", None) or "your account"
        _tx_ref = f"TXN{uuid.uuid4().hex[:8].upper()}"
        _curr = _replied_currency

        _final_msgs = {
            "en": (
                f"\u23f3 **Your transaction is being processed**\n\n"
                f"\U0001f4b8 Sending **{_curr} {_stored_amount}** to **{_stored_recipient}**\n"
                f"\U0001f4f1 From: {_sender_number}\n"
                f"\U0001f3ab Reference: **{_tx_ref}**\n"
                f"\U0001f4b1 Currency: **{_curr}**\n\n"
                "You will receive a **confirmation message** within the next few seconds. "
                "If money does not arrive within 5 minutes, reply **\"dispute\"** and I will open a case immediately."
            ),
            "sn": (
                f"\u23f3 **Kutumira kwako kuri kuitwa**\n\n"
                f"\U0001f4b8 Kutumira **{_curr} {_stored_amount}** kuna **{_stored_recipient}**\n"
                f"\U0001f4f1 Kubva: {_sender_number}\n"
                f"\U0001f3ab Nhamba: **{_tx_ref}**\n"
                f"\U0001f4b1 Mhando yemari: **{_curr}**\n\n"
                "Uchagamuchira **confirmation message** mumasekendi mashoma anotevera. "
                "Kana mari isina kusvika muminitsi 5, pindura **\"dispute\"** uye ndichavhura kesi pakarepo."
            ),
            "nd": (
                f"\u23f3 **Ukuthumela kwakho kuyaqhubeka**\n\n"
                f"\U0001f4b8 Ukuthumela **{_curr} {_stored_amount}** ku **{_stored_recipient}**\n"
                f"\U0001f4f1 Kusuka: {_sender_number}\n"
                f"\U0001f3ab Inombolo: **{_tx_ref}**\n"
                f"\U0001f4b1 Uhlobo lwemali: **{_curr}**\n\n"
                "Uzothola i-**confirmation message** emizuzwini embalwa ezilandelayo. "
                "Uma imali ingafiki emizuzwini emi-5, phendula **\"dispute\"** ngizovula icala masinyane."
            ),
        }
        return await persist_ai_response(build_ai_message_payload(
            content=_final_msgs.get(selected_language, _final_msgs["en"]),
            intent="transfer_money",
            confidence=0.99,
            response_language=selected_language,
            needs_escalation=False,
            session_intent="transfer_money_completed",
        ))

    # ── Transfer money pending continuation ─────────────────────────────────

    # Fired when session_intent is e.g. "transfer_money_ecocash_transfer_pending"
    # after the user picked option 2 (EcoCash) from the transfer menu.
    _TRANSFER_PENDING_PREFIXES = (
        "transfer_money_ecocash_transfer_pending",
        "transfer_money_internal_transfer_pending",
        "transfer_money_zipit_transfer_pending",
        "transfer_money_rtgs_transfer_pending",
    )
    if chat_session.last_intent in _TRANSFER_PENDING_PREFIXES:
        transfer_type = chat_session.last_intent.replace("transfer_money_", "").replace("_pending", "")
        raw_content = message_data.content

        # ── Smart token classifier ───────────────────────────────────────────
        # Walk each comma-separated token and bin it into:
        #   currency_token  → "USD" / "ZiG" / "RTGS"
        #   amount_token    → first pure-numeric token  (e.g. "500", "$50")
        #   account_tokens  → everything else            (e.g. "ACC001", "CBZ", phone)
        _CURRENCY_MAP = {"usd": "USD", "zig": "ZiG", "zwg": "ZiG", "rtgs": "RTGS"}
        _raw_tokens = [t.strip() for t in raw_content.replace("$", "").split(",") if t.strip()]

        _currency_token: Optional[str] = None
        _amount_token: Optional[str] = None
        _account_tokens: list = []

        for tok in _raw_tokens:
            tok_lower = tok.lower()
            if tok_lower in _CURRENCY_MAP:
                _currency_token = _CURRENCY_MAP[tok_lower]
            elif re.match(r"^\d+(?:\.\d{1,2})?$", tok):   # pure number = amount
                if _amount_token is None:                   # take first numeric as amount
                    _amount_token = tok
                else:
                    _account_tokens.append(tok)             # second numeric = account number
            else:
                _account_tokens.append(tok)

        # For EcoCash, identifiers MUST be Zimbabwe mobile numbers
        if transfer_type == "ecocash_transfer":
            identifiers = re.findall(r"\b(?:0|263|\+263)?(?:7[1-9])\d{7}\b", raw_content)
            # If a plain numeric token looks like a phone number, accept it too
            if not identifiers:
                identifiers = [t for t in _account_tokens if re.match(r"^0?7[1-9]\d{7}$", t)]
        else:
            # For Internal/ZIPIT/RTGS: use account_tokens (alphanumeric account refs, bank names)
            identifiers = _account_tokens if _account_tokens else []

        # Amount: prefer classifier result, fall back to regex
        if _amount_token:
            amounts = [_amount_token]
        else:
            amounts = re.findall(r"\$?\d+(?:\.\d{1,2})?", raw_content)

        # Currency from classifier (already applied _detect_transfer_currency later if None)
        if _currency_token:
            # Pre-seed so the currency check below won't ask again
            raw_content = raw_content  # keep original for _detect_transfer_currency

        if not identifiers or not amounts:
            # Still missing details — tell them what we need per transfer type
            _needs = {
                "ecocash_transfer": {
                    "en": "Please provide the **recipient's phone number** and the **amount** to send.\nExample: *0771234567, $10*",
                    "sn": "Ndapota tipa **nhamba yefoni yemunhu** uye **mari** yaunoda kutumira.\nMuenzaniso: *0771234567, $10*",
                    "nd": "Sicela unikeze **inombolo yocingo yomamukeli** kanye **nenani** ofuna ukulithumela.\nIsibonelo: *0771234567, $10*",
                },
                "internal_transfer": {
                    "en": "Please provide your **source account**, **destination account**, **amount**, and **currency** (USD or ZiG).\nExample: *ACC001, ACC002, 500, USD*",
                    "sn": "Ndapota tipa **account yekubva**, **yekuenda**, **mari**, uye **mhando yemari** (USD kana ZiG).\nMuenzaniso: *ACC001, ACC002, 500, USD*",
                    "nd": "Sicela unikeze **i-account esuka kuyo**, **eya kuyo**, **inani**, kanye **nohlobo lwemali** (USD noma ZiG).\nIsibonelo: *ACC001, ACC002, 500, USD*",
                },
                "zipit_transfer": {
                    "en": "Please provide the **recipient bank name**, **account number**, **amount**, and **currency** (USD or ZiG).\nExample: *CBZ, 12345678, 100, USD*",
                    "sn": "Ndapota tipa **zita rebhangi**, **nhamba yeaccount**, **mari**, uye **mhando yemari** (USD kana ZiG).\nMuenzaniso: *CBZ, 12345678, 100, USD*",
                    "nd": "Sicela unikeze **ibhange lomamukeli**, **inombolo ye-account**, **inani**, kanye **nohlobo lwemali** (USD noma ZiG).\nIsibonelo: *CBZ, 12345678, 100, USD*",
                },
                "rtgs_transfer": {
                    "en": "Please provide the **recipient bank**, **account number**, **amount**, **currency** (USD or ZiG), and **reason**.\nExample: *Stanbic, 987654321, 5000, USD, school fees*",
                    "sn": "Ndapota tipa **bhangi remugamuchiri**, **nhamba yeaccount**, **mari**, **mhando yemari** (USD kana ZiG), uye **chikonzero**.\nMuenzaniso: *Stanbic, 987654321, 5000, USD, mafees echikoro*",
                    "nd": "Sicela unikeze **ibhange lomamukeli**, **inombolo ye-account**, **inani**, **uhlobo lwemali** (USD noma ZiG), kanye **nesizathu**.\nIsibonelo: *Stanbic, 987654321, 5000, USD, imali yesikole*",
                },
            }
            need_msg = _needs.get(transfer_type, _needs["ecocash_transfer"])
            retry_payload = build_ai_message_payload(
                content=need_msg.get(selected_language, need_msg["en"]),
                intent="transfer_money",
                confidence=0.98,
                response_language=selected_language,
                needs_escalation=False,
                session_intent=chat_session.last_intent,  # keep same pending state
            )
            return await persist_ai_response(retry_payload)

        # We have enough details — detect currency, then build the confirmation
        recipient = identifiers[-1] if identifiers else "(unknown)"  # last identifier = destination
        source = identifiers[0] if len(identifiers) >= 2 else "your account"
        sender_number = getattr(current_user, "phone_number", None) or source
        # Amount: prefer ≤7-digit tokens (not account numbers)
        _short_amounts = [a for a in amounts if len(a.replace("$", "")) <= 7]
        amount = _short_amounts[-1] if _short_amounts else amounts[-1] if amounts else "(unknown)"

        # Currency detection — ask if not specified
        currency = _detect_transfer_currency(raw_content)
        if currency is None:
            _ask_currency_msgs = {
                "en": (
                    f"Almost done! What currency would you like to send **{amount}** in?\n\n"
                    "Reply with:\n"
                    "• **USD** — US Dollar\n"
                    "• **ZiG** — Zimbabwe Gold"
                ),
                "sn": (
                    f"Tava pedyo! Unoda kutumira **{amount}** mumari ipi?\n\n"
                    "Pindura ne:\n"
                    "• **USD** — US Dollar\n"
                    "• **ZiG** — Zimbabwe Gold"
                ),
                "nd": (
                    f"Seseduze! Ufuna ukuthumela **{amount}** ngohlobo lwemali luni?\n\n"
                    "Phendula nge:\n"
                    "• **USD** — US Dollar\n"
                    "• **ZiG** — Zimbabwe Gold"
                ),
            }
            # Store transfer details in session_intent so they survive the extra round-trip
            _currency_state = f"{chat_session.last_intent}|recipient={recipient}|amount={amount}"
            ask_currency_payload = build_ai_message_payload(
                content=_ask_currency_msgs.get(selected_language, _ask_currency_msgs["en"]),
                intent="transfer_money",
                confidence=0.98,
                response_language=selected_language,
                needs_escalation=False,
                session_intent=_currency_state,
            )
            return await persist_ai_response(ask_currency_payload)

        _tx_ref = f"TXN{uuid.uuid4().hex[:8].upper()}"

        _processing_msgs = {
            "en": (
                f"\u23f3 **Your transaction is being processed**\n\n"
                f"💸 Sending **{currency} {amount}** to **{recipient}**\n"
                f"📱 From: {sender_number}\n"
                f"🎫 Reference: **{_tx_ref}**\n"
                f"💱 Currency: **{currency}**\n\n"
                "You will receive a **confirmation message** within the next few seconds. "
                "If money does not arrive within 5 minutes, reply **\"dispute\"** and I will open a case immediately."
            ),
            "sn": (
                f"\u23f3 **Kutumira kwako kuri kuitwa**\n\n"
                f"💸 Kutumira **{currency} {amount}** kuna **{recipient}**\n"
                f"📱 Kubva: {sender_number}\n"
                f"🎫 Nhamba: **{_tx_ref}**\n"
                f"💱 Mhando yemari: **{currency}**\n\n"
                "Uchagamuchira **confirmation message** mumasekendi mashoma anotevera. "
                "Kana mari isina kusvika muminitsi 5, pindura **\"dispute\"** uye ndichavhura kesi pakarepo."
            ),
            "nd": (
                f"\u23f3 **Ukuthumela kwakho kuyaqhubeka**\n\n"
                f"💸 Ukuthumela **{currency} {amount}** ku **{recipient}**\n"
                f"📱 Kusuka: {sender_number}\n"
                f"🎫 Inombolo: **{_tx_ref}**\n"
                f"💱 Uhlobo lwemali: **{currency}**\n\n"
                "Uzothola i-**confirmation message** emizuzwini embalwa ezilandelayo. "
                "Uma imali ingafiki emizuzwini emi-5, phendula **\"dispute\"** ngizovula icala masinyane."
            ),
        }

        transfer_done_payload = build_ai_message_payload(
            content=_processing_msgs.get(selected_language, _processing_msgs["en"]),
            intent="transfer_money",
            confidence=0.99,
            response_language=selected_language,
            needs_escalation=False,
            session_intent="transfer_money_completed",
        )
        return await persist_ai_response(transfer_done_payload)

    # Continue location lookup when user provides area after being prompted
    if chat_session.last_intent and chat_session.last_intent.startswith("location_awaiting_area:"):
        stored_location_type = chat_session.last_intent.split(":", 1)[1]
        raw_area_text = message_data.content.strip()

        # If the user sent a completely new location request (e.g. "WHERE is my nearest branch"),
        # exit this handler and let the main location block below handle it fresh,
        # otherwise we would geocode the full sentence and get wrong/overseas results.
        if raw_area_text and not _is_location_request(raw_area_text):
            # Strip location keywords the user may have included in their reply
            # (e.g. "'nearest ATM in Borrowdale" → "Borrowdale")
            extracted_area = location_service._extract_area_from_query(raw_area_text)
            area_text = extracted_area if extracted_area else raw_area_text.lstrip("'\"").strip()

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
        "last_transaction": "No recent transaction available",
        "ticket_id": "pending",
        # Populate all template variables to prevent raw {placeholders} leaking in chat
        "credits": "N/A",
        "debits": "N/A",
        "frequent_type": "Transfer",
        "loan_eligibility": "a loan based on your account activity. Please visit any branch or dial *151*3# to apply.",
        "previous_intent": chat_session.last_intent,
        "provider_name": message_data.provider_name,
        "provider_type": message_data.provider_type,
    }

    account_identifier = (message_data.provider_account_identifier or "").strip()
    if account_identifier:
        provider_code = _provider_code_for_name(message_data.provider_name)
        try:
            async with banking_session_maker() as banking_db:
                account_query = (
                    select(BankingAccount, BankingProvider)
                    .join(BankingProvider, BankingAccount.provider_id == BankingProvider.id)
                    .where(BankingAccount.phone_number == account_identifier)
                    .where(BankingAccount.is_active == True)
                )
                if provider_code:
                    account_query = account_query.where(BankingProvider.code == provider_code)

                account_rows = (await banking_db.execute(account_query)).all()
                if account_rows:
                    account, provider = account_rows[0]
                    context_data["balance"] = f"{account.currency.value} {account.balance:.2f}"
                    context_data["count"] = len(account_rows)

                    txn_result = await banking_db.execute(
                        select(BankingTransaction)
                        .where(BankingTransaction.account_id == account.id)
                        .order_by(desc(BankingTransaction.timestamp))
                        .limit(1)
                    )
                    latest_txn = txn_result.scalar_one_or_none()
                    if latest_txn:
                        context_data["last_transaction"] = (
                            f"{latest_txn.transaction_type.value} "
                            f"{latest_txn.currency.value} {latest_txn.amount:.2f} "
                            f"on {latest_txn.timestamp.strftime('%Y-%m-%d %H:%M')}"
                        )
                        context_data["transactions"] = context_data["last_transaction"]
                    else:
                        context_data["transactions"] = (
                            f"No transactions found for {provider.name} yet."
                        )
        except Exception:
            # Keep fallback values if mock banking DB lookup fails.
            pass
    
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
        # bill_payment intentionally excluded: the confirm step (YES/NO) looks like a
        # repeat but is a valid continuation of the structured payment flow.
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
        # Forward session_intent from structured option flows (e.g. transfer sub-states)
        session_intent=nlp_response.get("session_intent"),
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
