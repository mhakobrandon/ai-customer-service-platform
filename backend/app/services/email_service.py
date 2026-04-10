"""
Email Service
Handles sending verification emails and OTP codes

Author: AI Customer Service Platform
"""

import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from datetime import datetime

from app.core.config import settings

logger = logging.getLogger(__name__)


# Email configuration (use environment variables in production)
SMTP_HOST = getattr(settings, 'SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = getattr(settings, 'SMTP_PORT', 587)
SMTP_USER = getattr(settings, 'SMTP_USER', '')
SMTP_PASSWORD = getattr(settings, 'SMTP_PASSWORD', '')
FROM_EMAIL = getattr(settings, 'FROM_EMAIL', 'noreply@ai-customer-service.com')
FROM_NAME = getattr(settings, 'FROM_NAME', 'AI Customer Service Platform')


# Email templates
OTP_EMAIL_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }}
        .otp-box {{ background: #667eea; color: white; font-size: 32px; letter-spacing: 8px; padding: 20px 40px; text-align: center; margin: 20px 0; border-radius: 8px; font-weight: bold; }}
        .footer {{ background: #333; color: #999; padding: 20px; text-align: center; font-size: 12px; border-radius: 0 0 10px 10px; }}
        .warning {{ background: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 5px; margin-top: 20px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Verification Code</h1>
        </div>
        <div class="content">
            <p>Hello {name},</p>
            <p>Your verification code is:</p>
            <div class="otp-box">{otp}</div>
            <p>This code will expire in <strong>{expiry_minutes} minutes</strong>.</p>
            <div class="warning">
                <strong>Security Notice:</strong> Never share this code with anyone. Our team will never ask for your verification code.
            </div>
        </div>
        <div class="footer">
            <p>&copy; {year} AI Customer Service Platform</p>
            <p>This is an automated message, please do not reply.</p>
        </div>
    </div>
</body>
</html>
"""

WELCOME_EMAIL_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }}
        .button {{ display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
        .footer {{ background: #333; color: #999; padding: 20px; text-align: center; font-size: 12px; border-radius: 0 0 10px 10px; }}
        .features {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }}
        .feature {{ padding: 10px 0; border-bottom: 1px solid #eee; }}
        .feature:last-child {{ border-bottom: none; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome!</h1>
        </div>
        <div class="content">
            <p>Hello {name},</p>
            <p>Your account has been successfully verified! Welcome to the AI Customer Service Platform.</p>
            <div class="features">
                <h3>What you can do:</h3>
                <div class="feature">✓ Get instant AI-powered customer support</div>
                <div class="feature">✓ Track your support tickets</div>
                <div class="feature">✓ Access your banking services</div>
                <div class="feature">✓ Chat in English, Shona, or Ndebele</div>
            </div>
            <center>
                <a href="{login_url}" class="button">Login to Your Account</a>
            </center>
        </div>
        <div class="footer">
            <p>&copy; {year} AI Customer Service Platform</p>
        </div>
    </div>
</body>
</html>
"""

VERIFICATION_LINK_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }}
        .button {{ display: inline-block; background: #667eea; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-size: 16px; }}
        .footer {{ background: #333; color: #999; padding: 20px; text-align: center; font-size: 12px; border-radius: 0 0 10px 10px; }}
        .link-text {{ background: #eee; padding: 10px; border-radius: 5px; word-break: break-all; font-size: 12px; margin-top: 20px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Verify Your Email</h1>
        </div>
        <div class="content">
            <p>Hello {name},</p>
            <p>Thank you for registering! Please verify your email address by clicking the button below:</p>
            <center>
                <a href="{verification_url}" class="button">Verify Email Address</a>
            </center>
            <p>This link will expire in <strong>24 hours</strong>.</p>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <div class="link-text">{verification_url}</div>
        </div>
        <div class="footer">
            <p>&copy; {year} AI Customer Service Platform</p>
            <p>If you didn't create an account, please ignore this email.</p>
        </div>
    </div>
</body>
</html>
"""


class EmailService:
    """Service for sending emails"""
    
    def __init__(self):
        self.smtp_host = SMTP_HOST
        self.smtp_port = SMTP_PORT
        self.smtp_user = SMTP_USER
        self.smtp_password = SMTP_PASSWORD
        self.from_email = FROM_EMAIL
        self.from_name = FROM_NAME
        # Track sent emails for development/testing
        self.sent_emails: list = []
    
    def _send_email(
        self, 
        to_email: str, 
        subject: str, 
        html_content: str,
        plain_content: Optional[str] = None
    ) -> bool:
        """
        Send an email
        
        Args:
            to_email: Recipient email
            subject: Email subject
            html_content: HTML body
            plain_content: Plain text body (optional)
        
        Returns:
            True if sent successfully
        """
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = to_email
            
            # Add plain text version
            if plain_content:
                msg.attach(MIMEText(plain_content, 'plain'))
            
            # Add HTML version
            msg.attach(MIMEText(html_content, 'html'))
            
            # In development mode, just log the email
            if not self.smtp_user or not self.smtp_password:
                logger.info(f"[DEV MODE] Email would be sent to: {to_email}")
                logger.info(f"[DEV MODE] Subject: {subject}")
                # Store for testing
                self.sent_emails.append({
                    "to": to_email,
                    "subject": subject,
                    "html": html_content,
                    "sent_at": datetime.utcnow().isoformat()
                })
                return True
            
            # Send via SMTP
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False
    
    def send_otp_email(
        self, 
        to_email: str, 
        name: str, 
        otp: str,
        expiry_minutes: int = 10
    ) -> bool:
        """
        Send OTP verification email
        
        Args:
            to_email: Recipient email
            name: User's name
            otp: The OTP code
            expiry_minutes: OTP expiry time
        
        Returns:
            True if sent successfully
        """
        html_content = OTP_EMAIL_TEMPLATE.format(
            name=name,
            otp=otp,
            expiry_minutes=expiry_minutes,
            year=datetime.now().year
        )
        
        plain_content = f"""
Hello {name},

Your verification code is: {otp}

This code will expire in {expiry_minutes} minutes.

Never share this code with anyone. Our team will never ask for your verification code.

AI Customer Service Platform
        """
        
        return self._send_email(
            to_email=to_email,
            subject=f"Your Verification Code: {otp}",
            html_content=html_content,
            plain_content=plain_content
        )
    
    def send_verification_link(
        self, 
        to_email: str, 
        name: str, 
        verification_url: str
    ) -> bool:
        """
        Send email verification link
        
        Args:
            to_email: Recipient email
            name: User's name
            verification_url: The verification URL
        
        Returns:
            True if sent successfully
        """
        html_content = VERIFICATION_LINK_TEMPLATE.format(
            name=name,
            verification_url=verification_url,
            year=datetime.now().year
        )
        
        plain_content = f"""
Hello {name},

Thank you for registering! Please verify your email address by visiting:
{verification_url}

This link will expire in 24 hours.

If you didn't create an account, please ignore this email.

AI Customer Service Platform
        """
        
        return self._send_email(
            to_email=to_email,
            subject="Verify Your Email Address",
            html_content=html_content,
            plain_content=plain_content
        )
    
    def send_welcome_email(
        self, 
        to_email: str, 
        name: str,
        login_url: str = "http://localhost:3000/login"
    ) -> bool:
        """
        Send welcome email after verification
        
        Args:
            to_email: Recipient email
            name: User's name
            login_url: URL to login page
        
        Returns:
            True if sent successfully
        """
        html_content = WELCOME_EMAIL_TEMPLATE.format(
            name=name,
            login_url=login_url,
            year=datetime.now().year
        )
        
        plain_content = f"""
Hello {name},

Your account has been successfully verified! Welcome to the AI Customer Service Platform.

What you can do:
- Get instant AI-powered customer support
- Track your support tickets
- Access your banking services
- Chat in English, Shona, or Ndebele

Login at: {login_url}

AI Customer Service Platform
        """
        
        return self._send_email(
            to_email=to_email,
            subject="Welcome to AI Customer Service Platform!",
            html_content=html_content,
            plain_content=plain_content
        )
    
    def get_recent_emails(self, limit: int = 10) -> list:
        """Get recently sent emails (for development/testing)"""
        return self.sent_emails[-limit:]


# Singleton instance
email_service = EmailService()


# Convenience functions
def send_otp_email(to_email: str, name: str, otp: str, expiry_minutes: int = 10) -> bool:
    """Send OTP verification email"""
    return email_service.send_otp_email(to_email, name, otp, expiry_minutes)


def send_verification_link(to_email: str, name: str, verification_url: str) -> bool:
    """Send email verification link"""
    return email_service.send_verification_link(to_email, name, verification_url)


def send_welcome_email(to_email: str, name: str, login_url: str = "http://localhost:3000/login") -> bool:
    """Send welcome email"""
    return email_service.send_welcome_email(to_email, name, login_url)
