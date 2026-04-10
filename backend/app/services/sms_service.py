"""
SMS Service
Handles sending OTP codes via SMS for phone verification
Supports multiple SMS providers (Twilio, Africa's Talking, etc.)

Author: AI Customer Service Platform
"""

import logging
from typing import Optional
from datetime import datetime

from app.core.config import settings

logger = logging.getLogger(__name__)


# SMS Configuration (use environment variables in production)
SMS_PROVIDER = getattr(settings, 'SMS_PROVIDER', 'dev')  # 'twilio', 'africastalking', 'dev'
TWILIO_ACCOUNT_SID = getattr(settings, 'TWILIO_ACCOUNT_SID', '')
TWILIO_AUTH_TOKEN = getattr(settings, 'TWILIO_AUTH_TOKEN', '')
TWILIO_PHONE_NUMBER = getattr(settings, 'TWILIO_PHONE_NUMBER', '')
AFRICASTALKING_USERNAME = getattr(settings, 'AFRICASTALKING_USERNAME', '')
AFRICASTALKING_API_KEY = getattr(settings, 'AFRICASTALKING_API_KEY', '')


# SMS Templates
OTP_SMS_TEMPLATE = """Your AI Customer Service verification code is: {otp}

This code expires in {expiry_minutes} minutes. Do not share this code with anyone.

- AI Customer Service Platform"""


OTP_SMS_TEMPLATE_SHONA = """Kodhi yako yekusimbisa ndeiyi: {otp}

Kodhi iyi inopera mumaminetsi {expiry_minutes}. Usaipa kodhi iyi kune mumwe munhu.

- AI Customer Service Platform"""


OTP_SMS_TEMPLATE_NDEBELE = """Ikhodi yakho yokuqinisekisa yile: {otp}

Lekhodi izaphela ngemizuzu engu-{expiry_minutes}. Ungayiniki umuntu lo ikhodi.

- AI Customer Service Platform"""


class SMSService:
    """Service for sending SMS messages"""
    
    def __init__(self):
        self.provider = SMS_PROVIDER
        # Track sent SMS for development/testing
        self.sent_sms: list = []
        
        # Initialize provider clients
        self._init_twilio()
        self._init_africastalking()
    
    def _init_twilio(self):
        """Initialize Twilio client if configured"""
        self.twilio_client = None
        if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
            try:
                from twilio.rest import Client
                self.twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
                logger.info("Twilio SMS client initialized")
            except ImportError:
                logger.warning("Twilio library not installed. Run: pip install twilio")
            except Exception as e:
                logger.error(f"Failed to initialize Twilio: {e}")
    
    def _init_africastalking(self):
        """Initialize Africa's Talking client if configured"""
        self.at_sms = None
        if AFRICASTALKING_USERNAME and AFRICASTALKING_API_KEY:
            try:
                import africastalking
                africastalking.initialize(AFRICASTALKING_USERNAME, AFRICASTALKING_API_KEY)
                self.at_sms = africastalking.SMS
                logger.info("Africa's Talking SMS client initialized")
            except ImportError:
                logger.warning("Africa's Talking library not installed. Run: pip install africastalking")
            except Exception as e:
                logger.error(f"Failed to initialize Africa's Talking: {e}")
    
    def _normalize_phone_number(self, phone: str) -> str:
        """
        Normalize phone number to international format
        
        Args:
            phone: Phone number in any format
        
        Returns:
            Normalized phone number (e.g., +263771234567)
        """
        # Remove spaces, dashes, and parentheses
        phone = ''.join(c for c in phone if c.isdigit() or c == '+')
        
        # Handle Zimbabwe numbers
        if phone.startswith('0'):
            # Convert local format to international (Zimbabwe)
            phone = '+263' + phone[1:]
        elif phone.startswith('263'):
            phone = '+' + phone
        elif not phone.startswith('+'):
            # Assume Zimbabwe if no country code
            phone = '+263' + phone
        
        return phone
    
    def _send_via_twilio(self, to_phone: str, message: str) -> bool:
        """Send SMS via Twilio"""
        if not self.twilio_client:
            logger.error("Twilio client not initialized")
            return False
        
        try:
            message = self.twilio_client.messages.create(
                body=message,
                from_=TWILIO_PHONE_NUMBER,
                to=to_phone
            )
            logger.info(f"SMS sent via Twilio to {to_phone}: {message.sid}")
            return True
        except Exception as e:
            logger.error(f"Failed to send SMS via Twilio: {e}")
            return False
    
    def _send_via_africastalking(self, to_phone: str, message: str) -> bool:
        """Send SMS via Africa's Talking"""
        if not self.at_sms:
            logger.error("Africa's Talking client not initialized")
            return False
        
        try:
            response = self.at_sms.send(message, [to_phone])
            logger.info(f"SMS sent via Africa's Talking to {to_phone}: {response}")
            return True
        except Exception as e:
            logger.error(f"Failed to send SMS via Africa's Talking: {e}")
            return False
    
    def send_sms(
        self, 
        to_phone: str, 
        message: str
    ) -> bool:
        """
        Send an SMS message
        
        Args:
            to_phone: Recipient phone number
            message: SMS content
        
        Returns:
            True if sent successfully
        """
        # Normalize phone number
        to_phone = self._normalize_phone_number(to_phone)
        
        # In development mode, just log the SMS
        if self.provider == 'dev' or (not self.twilio_client and not self.at_sms):
            logger.info(f"[DEV MODE] SMS would be sent to: {to_phone}")
            logger.info(f"[DEV MODE] Message: {message}")
            print(f"\n[DEV] SMS to {to_phone}:\n{message}\n")
            
            # Store for testing
            self.sent_sms.append({
                "to": to_phone,
                "message": message,
                "sent_at": datetime.utcnow().isoformat()
            })
            return True
        
        # Send via configured provider
        if self.provider == 'twilio' and self.twilio_client:
            return self._send_via_twilio(to_phone, message)
        elif self.provider == 'africastalking' and self.at_sms:
            return self._send_via_africastalking(to_phone, message)
        else:
            # Fallback to dev mode
            logger.warning(f"No SMS provider configured, logging message instead")
            self.sent_sms.append({
                "to": to_phone,
                "message": message,
                "sent_at": datetime.utcnow().isoformat()
            })
            return True
    
    def send_otp_sms(
        self, 
        to_phone: str, 
        otp: str,
        expiry_minutes: int = 10,
        language: str = "en"
    ) -> bool:
        """
        Send OTP verification SMS
        
        Args:
            to_phone: Recipient phone number
            otp: The OTP code
            expiry_minutes: OTP expiry time
            language: Language for message (en, sn, nd)
        
        Returns:
            True if sent successfully
        """
        # Select template based on language
        if language == 'sn':
            template = OTP_SMS_TEMPLATE_SHONA
        elif language == 'nd':
            template = OTP_SMS_TEMPLATE_NDEBELE
        else:
            template = OTP_SMS_TEMPLATE
        
        message = template.format(otp=otp, expiry_minutes=expiry_minutes)
        
        return self.send_sms(to_phone, message)
    
    def get_recent_sms(self, limit: int = 10) -> list:
        """Get recently sent SMS (for development/testing)"""
        return self.sent_sms[-limit:]


# Singleton instance
sms_service = SMSService()


# Convenience functions
def send_otp_sms(
    to_phone: str, 
    otp: str, 
    expiry_minutes: int = 10,
    language: str = "en"
) -> bool:
    """Send OTP verification SMS"""
    return sms_service.send_otp_sms(to_phone, otp, expiry_minutes, language)


def send_sms(to_phone: str, message: str) -> bool:
    """Send SMS message"""
    return sms_service.send_sms(to_phone, message)
