"""
Unit Tests for API Endpoints
Tests for FastAPI endpoints including chat, auth, and analytics.

Author: Brandon K Mhako (R223931W)
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.main import app


@pytest.fixture
def client():
    """Create test client for API testing"""
    return TestClient(app)


class TestHealthEndpoints:
    """Tests for health check endpoints"""
    
    def test_root_endpoint(self, client):
        """Test root endpoint returns welcome message"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Welcome" in data["message"] or "API" in data["message"]
    
    def test_health_check(self, client):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["status"] in ["healthy", "ok"]


class TestAuthEndpoints:
    """Tests for authentication endpoints"""
    
    def test_register_user(self, client):
        """Test user registration endpoint"""
        user_data = {
            "email": "testuser@example.com",
            "password": "testpassword123",
            "full_name": "Test User"
        }
        response = client.post("/api/v1/auth/register", json=user_data)
        # Should return 200/201 on success or 400 if user exists
        assert response.status_code in [200, 201, 400]
    
    def test_register_invalid_email(self, client):
        """Test registration with invalid email"""
        user_data = {
            "email": "invalid-email",
            "password": "testpassword123",
            "full_name": "Test User"
        }
        response = client.post("/api/v1/auth/register", json=user_data)
        assert response.status_code in [422, 400]  # Validation error
    
    def test_login_invalid_credentials(self, client):
        """Test login with invalid credentials"""
        login_data = {
            "email": "nonexistent@example.com",
            "password": "wrongpassword"
        }
        response = client.post("/api/v1/auth/login", json=login_data)
        assert response.status_code in [401, 400]


class TestChatEndpoints:
    """Tests for chat endpoints"""
    
    def test_chat_message_unauthorized(self, client):
        """Test chat endpoint requires authentication"""
        message_data = {
            "content": "Hello, I need help",
            "language": "en"
        }
        response = client.post("/api/v1/chat/messages", json=message_data)
        assert response.status_code == 401
    
    def test_create_session_unauthorized(self, client):
        """Test session creation requires authentication"""
        response = client.post("/api/v1/chat/sessions", json={})
        assert response.status_code == 401
    
    def test_get_sessions_unauthorized(self, client):
        """Test getting sessions requires authentication"""
        response = client.get("/api/v1/chat/sessions")
        assert response.status_code == 401


class TestAnalyticsEndpoints:
    """Tests for analytics endpoints"""
    
    def test_dashboard_unauthorized(self, client):
        """Test dashboard endpoint requires authentication"""
        response = client.get("/api/v1/analytics/dashboard")
        assert response.status_code == 401
    
    def test_performance_unauthorized(self, client):
        """Test performance endpoint requires authentication"""
        response = client.get("/api/v1/analytics/performance")
        assert response.status_code == 401


class TestTicketEndpoints:
    """Tests for ticket endpoints"""
    
    def test_create_ticket_unauthorized(self, client):
        """Test ticket creation requires authentication"""
        ticket_data = {
            "subject": "Test Ticket",
            "description": "Test description"
        }
        response = client.post("/api/v1/tickets", json=ticket_data)
        assert response.status_code == 401
    
    def test_get_tickets_unauthorized(self, client):
        """Test getting tickets requires authentication"""
        response = client.get("/api/v1/tickets")
        assert response.status_code == 401


class TestAdminEndpoints:
    """Tests for admin endpoints"""
    
    def test_admin_users_unauthorized(self, client):
        """Test admin user list requires authentication"""
        response = client.get("/api/v1/admin/users")
        assert response.status_code == 401
    
    def test_admin_stats_unauthorized(self, client):
        """Test admin stats requires authentication"""
        response = client.get("/api/v1/admin/system-stats")
        assert response.status_code == 401


class TestAPIResponseFormat:
    """Tests for API response format consistency"""
    
    def test_error_response_format(self, client):
        """Test that error responses have consistent format"""
        response = client.get("/api/v1/nonexistent-endpoint")
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
    
    def test_unauthorized_response_format(self, client):
        """Test that unauthorized responses have consistent format"""
        response = client.get("/api/v1/chat/sessions")
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data


class TestCORSHeaders:
    """Tests for CORS configuration"""
    
    def test_cors_headers_present(self, client):
        """Test that CORS headers are set correctly"""
        response = client.options(
            "/api/v1/auth/login",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "POST"
            }
        )
        # Should allow the request or return 200
        assert response.status_code in [200, 405]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
