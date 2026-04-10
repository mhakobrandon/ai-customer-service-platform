"""
Application Configuration Settings
Loads environment variables and provides centralized configuration
"""

from pydantic_settings import BaseSettings
from typing import List
import os
from pathlib import Path

# Always resolve .env relative to this file's directory (backend/)
_ENV_FILE = Path(__file__).parent.parent.parent / ".env"


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Application
    APP_NAME: str = "AI-Powered Customer Service Platform"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/ai_customer_service"
    DATABASE_POOL_SIZE: int = 5
    DATABASE_MAX_OVERFLOW: int = 10
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000", 
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:8000"
    ]
    ALLOWED_ORIGIN_REGEX: str = r"^https?://((localhost|127\.0\.0\.1)(:\d+)?|192\.168\.\d+\.\d+(?::\d+)?|10\.\d+\.\d+\.\d+(?::\d+)?|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+(?::\d+)?)$"
    
    # NLP Configuration
    NLP_MODEL_NAME: str = "xlm-roberta-base"
    NLP_MODEL_PATH: str = "./models"
    NLP_CONFIDENCE_THRESHOLD: float = 0.45  # Lowered for better coverage
    SUPPORTED_LANGUAGES: List[str] = ["en", "sn", "nd"]
    
    # WebSocket
    WS_HEARTBEAT_INTERVAL: int = 30
    WS_MAX_CONNECTIONS: int = 500
    
    # Email (Optional)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "noreply@customerservice.com"
    
    # SMS Provider
    SMS_PROVIDER: str = "dev"  # 'twilio', 'africastalking', 'dev'
    AFRICASTALKING_USERNAME: str = ""
    AFRICASTALKING_API_KEY: str = ""
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""
    
    # WhatsApp Business API
    WHATSAPP_PROVIDER: str = "meta"  # 'meta' or 'twilio'
    WHATSAPP_ACCESS_TOKEN: str = ""
    WHATSAPP_PHONE_NUMBER_ID: str = ""
    WHATSAPP_BUSINESS_ACCOUNT_ID: str = ""
    WHATSAPP_VERIFY_TOKEN: str = "ai_customer_service_verify"
    WHATSAPP_APP_SECRET: str = ""
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/app.log"
    
    # LLM Configuration (for hybrid personalised responses)
    LLM_ENABLED: bool = False  # Toggle LLM response generation
    LLM_PROVIDER: str = "openai"  # 'openai', 'azure', 'local'
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"  # cost-effective default
    LLM_MAX_TOKENS: int = 300
    LLM_TEMPERATURE: float = 0.7
    LLM_TIMEOUT: int = 10  # seconds
    
    # Performance
    MAX_UPLOAD_SIZE: int = 10485760  # 10MB
    RATE_LIMIT_PER_MINUTE: int = 60
    
    class Config:
        env_file = str(_ENV_FILE)
        case_sensitive = True


# Create settings instance
settings = Settings()
