"""
Main FastAPI Application Entry Point
AI-Powered Customer Service Platform for Zimbabwe's Financial Sector
Author: Brandon K Mhako (R223931W)
Supervisor: Mrs Mhlanga
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import asyncio
import logging
from typing import List

from app.core.config import settings
from app.api.endpoints import auth, chat, tickets, users, analytics, admin, integrations
from app.database.session import engine, Base, async_session_maker
from app.services.websocket_manager import WebSocketManager
from app.services.ticket_resolution_scheduler import ticket_resolution_scheduler
from app.models.user import User, UserRole
from app.core.security import get_password_hash
from sqlalchemy import select

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# WebSocket Manager
ws_manager = WebSocketManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("Starting AI-Powered Customer Service Platform...")
    logger.info(f"Supported Languages: {settings.SUPPORTED_LANGUAGES}")
    logger.info(f"NLP Confidence Threshold: {settings.NLP_CONFIDENCE_THRESHOLD}")
    
    # Create database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    logger.info("Database tables created successfully")
    
    # Create default admin user if no users exist
    async with async_session_maker() as db:
        result = await db.execute(select(User).filter(User.role == UserRole.ADMIN))
        admin_exists = result.scalar_one_or_none()
        
        if not admin_exists:
            logger.info("Creating default admin user...")
            admin_user = User(
                name="System Admin",
                email="admin@example.com",
                password_hash=get_password_hash("admin123"),
                role=UserRole.ADMIN,
                preferred_language="en",
                is_active=True,
                is_verified=True,
                department="System Administration"
            )
            db.add(admin_user)
            await db.commit()
            logger.info("Default admin created: admin@example.com / admin123")
    
    logger.info("Application startup complete")

    scheduler_stop_event = asyncio.Event()
    scheduler_task = asyncio.create_task(ticket_resolution_scheduler(scheduler_stop_event))
    
    yield
    
    # Shutdown
    logger.info("Shutting down application...")
    scheduler_stop_event.set()
    try:
        await scheduler_task
    except Exception:
        logger.exception("Failed while stopping ticket resolution scheduler")

    await engine.dispose()
    logger.info("Application shutdown complete")


# Initialize FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="AI-Powered Customer Service Platform with Integrated Ticketing System for Zimbabwe's Financial Sector",
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_origin_regex=settings.ALLOWED_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "supported_languages": settings.SUPPORTED_LANGUAGES
    }


# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Welcome to AI-Powered Customer Service Platform API",
        "version": settings.APP_VERSION,
        "author": "Brandon K Mhako (R223931W)",
        "project": "Capstone Project - Computer Science",
        "institution": "Faculty of Computer Engineering, Informatics and Communications",
        "docs": "/api/docs",
        "health": "/health"
    }


# WebSocket endpoint for real-time chat
@app.websocket("/ws/chat/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for real-time chat communication
    Supports multilingual conversations in English, Shona, and Ndebele
    """
    await ws_manager.connect(websocket, session_id)
    logger.info(f"WebSocket connection established for session: {session_id}")
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            logger.info(f"Received message from {session_id}: {data}")
            
            # Process message (to be implemented with NLP service)
            # For now, echo back
            response = {
                "session_id": session_id,
                "message": data.get("message", ""),
                "timestamp": data.get("timestamp"),
                "status": "received"
            }
            
            await ws_manager.send_message(session_id, response)
            
    except WebSocketDisconnect:
        ws_manager.disconnect(session_id)
        logger.info(f"WebSocket connection closed for session: {session_id}")
    except Exception as e:
        logger.error(f"WebSocket error for session {session_id}: {str(e)}")
        ws_manager.disconnect(session_id)


# Include API routers
app.include_router(auth.router, prefix=f"{settings.API_V1_PREFIX}/auth", tags=["Authentication"])
app.include_router(users.router, prefix=f"{settings.API_V1_PREFIX}/users", tags=["Users"])
app.include_router(chat.router, prefix=f"{settings.API_V1_PREFIX}/chat", tags=["Chat"])
app.include_router(tickets.router, prefix=f"{settings.API_V1_PREFIX}/tickets", tags=["Tickets"])
app.include_router(analytics.router, prefix=f"{settings.API_V1_PREFIX}/analytics", tags=["Analytics"])
app.include_router(admin.router, prefix=f"{settings.API_V1_PREFIX}/admin", tags=["Admin"])
app.include_router(integrations.router, prefix=f"{settings.API_V1_PREFIX}/integrations", tags=["Integrations"])


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler for unhandled errors"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An internal server error occurred",
            "message": str(exc) if settings.DEBUG else "Internal server error"
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )
