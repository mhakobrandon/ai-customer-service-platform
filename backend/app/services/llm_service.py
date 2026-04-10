"""
LLM Service — Hybrid personalised response generation.

Uses the classified intent, detected language, and conversation context
to generate natural, context-aware responses via an LLM while keeping
the deterministic rule-based intent routing and escalation logic intact.

Falls back gracefully to template responses when:
  - LLM is disabled via config
  - API key is not set
  - LLM call fails or times out
"""

import logging
from typing import Dict, List, Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

# ── System prompt ────────────────────────────────────────────────
SYSTEM_PROMPT = """\
You are a friendly, professional customer service agent for a Zimbabwe-based \
financial services platform that supports EcoCash, OneMoney, InnBucks, TeleCash, \
ZIPIT, and local bank accounts.

CRITICAL RULES — NEVER BREAK THESE:
1. NEVER invent or fabricate information. If you don't know something, say so.
2. NEVER make up account balances, transaction amounts, dates, reference numbers, \
   ticket IDs, phone numbers, or any specific data.
3. ONLY state facts that appear in the template response or conversation context.
4. If the template has placeholder text like {balance} or {last_transaction}, \
   do NOT replace them with made-up values — omit them or say "not available".
5. Respond in the SAME language the customer is using:
   - "en" → English, "sn" → Shona, "nd" → Ndebele
6. Be concise — keep answers under 120 words.
7. Never reveal the classified intent or confidence score.
8. Stay empathetic and professional; match the customer's emotional tone.
9. When the intent requires escalation, reassure the customer that help is coming.
10. Use emoji sparingly (1-3 per response max).
11. Stick closely to the template response content — you may rephrase for warmth \
    and clarity, but do NOT add new claims, promises, or details not in the template.\
"
"""

# ── Per-intent guidelines injected into the LLM prompt ───────────
INTENT_GUIDELINES = {
    "balance_inquiry": "Show the balance from context. Suggest checking via *151*2# or the app.",
    "transaction_history": "Summarise recent transactions from context. Offer full statement option.",
    "transfer_money": "Explain transfer options (Internal, EcoCash, ZIPIT, RTGS) with fees. Ask for recipient details if not provided.",
    "account_statement": "Offer 30/60/90 day or custom period. Mention email or branch collection.",
    "password_reset": "Guide through identity verification (ID + registered phone). Mention *151# self-service option.",
    "update_profile": "Ask what they want to change. Mention branch visit may be needed for some changes.",
    "loan_inquiry": "Mention available loan products and eligibility criteria. Suggest visiting a branch for application.",
    "bill_payment": "List supported billers (ZESA, DStv, water, airtime). Guide through payment steps.",
    "mobile_money": "Help with EcoCash/OneMoney/InnBucks/TeleCash queries. Provide relevant USSD codes.",
    "transaction_dispute": "Acknowledge the issue sympathetically. Ask ONCE for transaction reference, amount, and date — do NOT keep repeating the same question if the user has already answered. Mention 24-48 hour resolution.",
    "security_pin": "Treat urgently. Guide to *151# or nearest agent. Warn: never share PIN.",
    "network_connectivity": "Suggest: toggle airplane mode, restart phone, dial *151#. Offer to call 114 if persistent.",
    "mobile_wallet_fees": "Provide fee structure: send 1-2%, cash-out 2-3%, IMTT 2% over $10. No monthly fees for basic wallet.",
    "account_opening": "Requirements: Valid ID, proof of residence, $50 minimum deposit. Can register via *151# or branch.",
    "account_closure": "Express regret. Ask for reason. Explain remaining balance transfer process.",
    "card_request": "Offer options: report lost/stolen, request new card, block card. Mention EcoCash Mastercard.",
    "atm_location": "Ask for their area/city to provide nearest ATM or EcoCash agent location.",
    "branch_location": "Ask for their area/city to provide nearest branch, hours, and services.",
    "escalation_request": "Reassure them — transferring to a human agent now. Ask them to hold briefly.",
    "greeting": "Warm welcome. Briefly list what you can help with. Ask how to assist.",
    "goodbye": "Thank them. Invite them back anytime. Wish them well.",
    "complaint": "Acknowledge frustration. Apologise sincerely. Explain next steps for resolution.",
    "general_inquiry": "Be helpful and informative. Direct them to the right service.",
}

LANGUAGE_NAMES = {"en": "English", "sn": "Shona", "nd": "Ndebele"}


class LLMService:
    """Generates personalised responses using an LLM backend."""

    def __init__(self):
        self._client = None
        self._available = False
        self._init_client()

    def _init_client(self):
        """Initialise the OpenAI client if configured."""
        if not settings.LLM_ENABLED:
            logger.info("[LLM] Disabled via config (LLM_ENABLED=False)")
            return

        if not settings.OPENAI_API_KEY:
            logger.warning("[LLM] OPENAI_API_KEY not set — LLM responses disabled")
            return

        try:
            from openai import OpenAI
            self._client = OpenAI(api_key=settings.OPENAI_API_KEY)
            self._available = True
            logger.info(f"[LLM] Ready — model={settings.OPENAI_MODEL}")
        except ImportError:
            logger.warning("[LLM] openai package not installed. Run: pip install openai")
        except Exception as e:
            logger.error(f"[LLM] Initialisation failed: {e}")

    @property
    def is_available(self) -> bool:
        return self._available

    def generate_response(
        self,
        intent: str,
        language: str,
        user_message: str,
        template_response: str,
        context: Optional[Dict] = None,
        conversation_history: Optional[List[Dict]] = None,
        confidence: float = 1.0,
    ) -> Optional[str]:
        """
        Generate a personalised response using the LLM.

        Two modes based on model confidence:
        - HIGH confidence (≥0.75): Light rephrase — stay very close to template,
          just make it warmer and more natural.
        - LOW confidence (<0.75): Full assist — the model is uncertain, so the LLM
          has more freedom to interpret the customer's message and offer
          genuinely helpful guidance using its broader knowledge.

        Returns the LLM-generated text, or None if unavailable/failed
        (caller should fall back to the template response).
        """
        if not self._available:
            return None

        context = context or {}
        guideline = INTENT_GUIDELINES.get(intent, "Be helpful and informative.")
        lang_name = LANGUAGE_NAMES.get(language, "English")
        model_confident = confidence >= 0.75

        # Build conversation messages
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]

        # Add recent conversation history for context (last 6 messages)
        if conversation_history:
            for entry in conversation_history[-6:]:
                role = "user" if entry.get("sender") == "customer" else "assistant"
                messages.append({"role": role, "content": entry.get("content", "")})

        # Build the user prompt with context
        user_prompt = (
            f"Customer message: \"{user_message}\"\n"
            f"Classified intent: {intent}\n"
            f"Language: {lang_name} ({language})\n"
            f"Intent guideline: {guideline}\n"
        )

        if context.get("provider_name"):
            user_prompt += f"Provider: {context['provider_name']}\n"

        if model_confident:
            # HIGH confidence — light rephrase, stay faithful to template
            user_prompt += (
                f"\nTemplate response (AUTHORITATIVE — do not contradict or add facts beyond this):\n"
                f"{template_response}\n\n"
                f"Rephrase the template response in {lang_name} to sound warmer and more natural. "
                f"You MUST keep the same factual content — do NOT add fees, amounts, dates, "
                f"phone numbers, or details that are not in the template. "
                f"If the template has placeholders like {{balance}}, say the info is not available. "
                f"Keep it concise (under 120 words)."
            )
        else:
            # LOW confidence — model is lost, LLM should help more freely
            user_prompt += (
                f"\nOur classification model is UNCERTAIN about this customer's request "
                f"(confidence: {confidence:.0%}). The template below may not match what "
                f"the customer actually needs.\n\n"
                f"Template (may be wrong): {template_response}\n\n"
                f"Use your judgement to understand what the customer is really asking for. "
                f"Provide a helpful, accurate response in {lang_name}. "
                f"If you're unsure what they need, politely ask a clarifying question. "
                f"Do NOT make up specific account data, balances, or transaction details. "
                f"You MAY provide general guidance about banking services, fees, and processes. "
                f"Keep it concise (under 150 words)."
            )

        messages.append({"role": "user", "content": user_prompt})

        try:
            response = self._client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=messages,
                max_tokens=settings.LLM_MAX_TOKENS,
                temperature=settings.LLM_TEMPERATURE,
                timeout=settings.LLM_TIMEOUT,
            )
            llm_text = response.choices[0].message.content.strip()
            mode = "rephrase" if model_confident else "assist"
            logger.info(f"[LLM] Generated response mode={mode} intent={intent} lang={language} conf={confidence:.2f} tokens={response.usage.total_tokens}")
            return llm_text
        except Exception as e:
            logger.warning(f"[LLM] Generation failed, falling back to template: {e}")
            return None

    def reload(self):
        """Re-initialise the client (e.g., after config change)."""
        self._client = None
        self._available = False
        self._init_client()


# Singleton
llm_service = LLMService()
