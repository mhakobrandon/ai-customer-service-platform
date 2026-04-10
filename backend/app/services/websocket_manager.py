"""
WebSocket Manager for Real-Time Chat Communication
Manages WebSocket connections and message broadcasting
"""

from fastapi import WebSocket
from typing import Dict, List
import logging
import json
from datetime import datetime

logger = logging.getLogger(__name__)


class WebSocketManager:
    """
    WebSocket connection manager for real-time chat
    Handles connection lifecycle and message broadcasting
    """
    
    def __init__(self):
        """Initialize WebSocket manager"""
        self.active_connections: Dict[str, WebSocket] = {}
        self.session_data: Dict[str, Dict] = {}
    
    async def connect(self, websocket: WebSocket, session_id: str):
        """
        Accept and register a new WebSocket connection
        
        Args:
            websocket: WebSocket connection
            session_id: Unique session identifier
        """
        await websocket.accept()
        self.active_connections[session_id] = websocket
        self.session_data[session_id] = {
            "connected_at": datetime.utcnow().isoformat(),
            "message_count": 0
        }
        logger.info(f"WebSocket connected: {session_id}")
        logger.info(f"Active connections: {len(self.active_connections)}")
    
    def disconnect(self, session_id: str):
        """
        Remove WebSocket connection
        
        Args:
            session_id: Session identifier
        """
        if session_id in self.active_connections:
            del self.active_connections[session_id]
        if session_id in self.session_data:
            del self.session_data[session_id]
        logger.info(f"WebSocket disconnected: {session_id}")
        logger.info(f"Active connections: {len(self.active_connections)}")
    
    async def send_message(self, session_id: str, message: dict):
        """
        Send message to specific session
        
        Args:
            session_id: Target session
            message: Message data
        """
        if session_id in self.active_connections:
            try:
                websocket = self.active_connections[session_id]
                await websocket.send_json(message)
                
                # Update session data
                if session_id in self.session_data:
                    self.session_data[session_id]["message_count"] += 1
                
                logger.debug(f"Message sent to {session_id}: {message}")
            except Exception as e:
                logger.error(f"Error sending message to {session_id}: {str(e)}")
                self.disconnect(session_id)
    
    async def broadcast(self, message: dict, exclude: List[str] = None):
        """
        Broadcast message to all connected sessions
        
        Args:
            message: Message to broadcast
            exclude: List of session IDs to exclude
        """
        exclude = exclude or []
        disconnected = []
        
        for session_id, websocket in self.active_connections.items():
            if session_id not in exclude:
                try:
                    await websocket.send_json(message)
                except Exception as e:
                    logger.error(f"Error broadcasting to {session_id}: {str(e)}")
                    disconnected.append(session_id)
        
        # Clean up disconnected sessions
        for session_id in disconnected:
            self.disconnect(session_id)
    
    def get_active_count(self) -> int:
        """Get count of active connections"""
        return len(self.active_connections)
    
    def get_session_info(self, session_id: str) -> Dict:
        """Get information about specific session"""
        return self.session_data.get(session_id, {})
    
    def is_connected(self, session_id: str) -> bool:
        """Check if session is connected"""
        return session_id in self.active_connections
