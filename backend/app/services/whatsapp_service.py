"""
WhatsApp Business API Service
Supports both Meta Cloud API and Twilio as providers.
Handles sending messages, formatting for WhatsApp, and webhook signature verification.
"""

import hashlib
import hmac
import logging
import os
import re
from pathlib import Path
from typing import Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

# WhatsApp Cloud API base
META_API_BASE = "https://graph.facebook.com/v19.0"

# Path to .env file (same directory as this file's package root: backend/)
_ENV_PATH = Path(__file__).parent.parent.parent / ".env"


def _read_token_from_env_file() -> str:
    """Read WHATSAPP_ACCESS_TOKEN directly from .env file at call time.
    This allows updating the token without restarting the server.
    Falls back to settings value if file not readable."""
    try:
        for line in _ENV_PATH.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("WHATSAPP_ACCESS_TOKEN="):
                return line.split("=", 1)[1].strip()
    except Exception:
        pass
    return settings.WHATSAPP_ACCESS_TOKEN


class WhatsAppService:
    """Service for sending WhatsApp messages via Meta Cloud API or Twilio."""

    # ── Public helpers ──────────────────────────────────────────

    @property
    def provider(self) -> str:
        return (settings.WHATSAPP_PROVIDER or "meta").lower()

    @property
    def is_configured(self) -> bool:
        if self.provider == "meta":
            return bool(settings.WHATSAPP_ACCESS_TOKEN and settings.WHATSAPP_PHONE_NUMBER_ID)
        return bool(settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_PHONE_NUMBER)

    def status(self) -> dict:
        return {
            "provider": self.provider,
            "configured": self.is_configured,
            "phone_number_id": settings.WHATSAPP_PHONE_NUMBER_ID or None,
            "business_account_id": settings.WHATSAPP_BUSINESS_ACCOUNT_ID or None,
            "webhook_verify_token": "configured" if settings.WHATSAPP_VERIFY_TOKEN else "not_set",
        }

    # ── Send message ────────────────────────────────────────────

    async def send_message(self, to: str, text: str) -> dict:
        """Send a text message to a WhatsApp number."""
        formatted = self._format_for_whatsapp(text)

        if self.provider == "meta":
            return await self._send_meta(to, formatted)
        return await self._send_twilio(to, formatted)

    async def _send_meta(self, to: str, text: str) -> dict:
        phone_id = settings.WHATSAPP_PHONE_NUMBER_ID
        token = _read_token_from_env_file()  # read fresh from .env every time
        if not phone_id or not token:
            logger.warning("Meta WhatsApp API not configured")
            return {"success": False, "error": "not_configured"}

        url = f"{META_API_BASE}/{phone_id}/messages"
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": self._normalize_number(to),
            "type": "text",
            "text": {"preview_url": False, "body": text},
        }
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(url, json=payload, headers=headers)
                data = resp.json()
                if resp.status_code == 200:
                    msg_id = data.get("messages", [{}])[0].get("id")
                    logger.info(f"WhatsApp message sent to {to}: {msg_id}")
                    return {"success": True, "message_id": msg_id}
                logger.error(f"Meta API error {resp.status_code}: {data}")
                return {"success": False, "error": data}
        except Exception as exc:
            logger.exception(f"Failed to send WhatsApp message to {to}")
            return {"success": False, "error": str(exc)}

    async def _send_twilio(self, to: str, text: str) -> dict:
        sid = settings.TWILIO_ACCOUNT_SID
        token = settings.TWILIO_AUTH_TOKEN
        from_number = settings.TWILIO_PHONE_NUMBER
        if not all([sid, token, from_number]):
            return {"success": False, "error": "not_configured"}

        url = f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"
        payload = {
            "From": f"whatsapp:{from_number}",
            "To": f"whatsapp:{self._normalize_number(to)}",
            "Body": text,
        }
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(url, data=payload, auth=(sid, token))
                data = resp.json()
                if resp.status_code in (200, 201):
                    logger.info(f"Twilio WhatsApp message sent to {to}: {data.get('sid')}")
                    return {"success": True, "message_id": data.get("sid")}
                logger.error(f"Twilio error {resp.status_code}: {data}")
                return {"success": False, "error": data}
        except Exception as exc:
            logger.exception(f"Failed to send Twilio WhatsApp message to {to}")
            return {"success": False, "error": str(exc)}

    # ── Mark message as read (Meta only) ────────────────────────

    async def mark_as_read(self, message_id: str) -> None:
        if self.provider != "meta" or not self.is_configured:
            return
        phone_id = settings.WHATSAPP_PHONE_NUMBER_ID
        token = _read_token_from_env_file()  # read fresh from .env every time
        url = f"{META_API_BASE}/{phone_id}/messages"
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        payload = {"messaging_product": "whatsapp", "status": "read", "message_id": message_id}
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                await client.post(url, json=payload, headers=headers)
        except Exception:
            logger.debug(f"Failed to mark message {message_id} as read")

    # ── Webhook signature verification (Meta) ──────────────────

    @staticmethod
    def verify_meta_signature(payload_bytes: bytes, signature_header: str) -> bool:
        app_secret = settings.WHATSAPP_APP_SECRET
        if not app_secret:
            logger.warning("WHATSAPP_APP_SECRET not set — skipping signature verification")
            return True  # Allow in dev; enforce in prod
        expected = "sha256=" + hmac.new(
            app_secret.encode(), payload_bytes, hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected, signature_header or "")

    # ── Formatting helpers ──────────────────────────────────────

    @staticmethod
    def _format_for_whatsapp(text: str) -> str:
        """Convert HTML/markdown-style formatting to WhatsApp-compatible formatting."""
        # Convert **bold** (already supported by WhatsApp)
        # Convert emoji-heavy markdown to cleaner WhatsApp text
        # Remove HTML tags if any
        text = re.sub(r"<br\s*/?>", "\n", text)
        text = re.sub(r"<[^>]+>", "", text)
        # WhatsApp has a 4096 char limit per message
        if len(text) > 4000:
            text = text[:3990] + "\n\n...(continued)"
        return text.strip()

    @staticmethod
    def _normalize_number(number: str) -> str:
        """Normalize phone number to E.164 format."""
        cleaned = re.sub(r"[^\d+]", "", number.strip())
        if cleaned.startswith("whatsapp:"):
            cleaned = cleaned.replace("whatsapp:", "")
        if not cleaned.startswith("+"):
            # Assume Zimbabwe if no country code
            if cleaned.startswith("0"):
                cleaned = "+263" + cleaned[1:]
            elif cleaned.startswith("263"):
                cleaned = "+" + cleaned
            else:
                cleaned = "+" + cleaned
        return cleaned


# Singleton
whatsapp_service = WhatsAppService()
