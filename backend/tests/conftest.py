"""
Pytest Configuration and Fixtures
Shared fixtures for all test modules.

Author: Brandon K Mhako (R223931W)
"""

import pytest
import sys
import os
from unittest.mock import MagicMock, patch

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


@pytest.fixture(scope="session")
def mock_database():
    """
    Mock database session for testing.
    Prevents actual database operations during tests.
    """
    mock_db = MagicMock()
    return mock_db


@pytest.fixture(scope="session")
def mock_nlp_model():
    """
    Mock NLP model for testing without ML dependencies.
    """
    mock_model = MagicMock()
    mock_model.predict.return_value = [{"label": "balance_inquiry", "score": 0.95}]
    return mock_model


@pytest.fixture(scope="function")
def sample_user_data():
    """Sample user data for testing"""
    return {
        "email": "testuser@example.com",
        "password": "securepassword123",
        "full_name": "Test User",
        "role": "customer"
    }


@pytest.fixture(scope="function")
def sample_message_data():
    """Sample chat message data for testing"""
    return {
        "content": "What is my account balance?",
        "language": "en",
        "session_id": "test-session-123"
    }


@pytest.fixture(scope="function")
def sample_ticket_data():
    """Sample support ticket data for testing"""
    return {
        "subject": "Transaction Issue",
        "description": "My EcoCash transfer failed but money was deducted",
        "priority": "high",
        "category": "transaction_dispute"
    }


@pytest.fixture(scope="session")
def test_messages_multilingual():
    """Sample messages in multiple languages for testing"""
    return {
        "en": [
            "Hello, I need help with my account",
            "What is my balance?",
            "I want to transfer money",
            "Pay my electricity bill",
            "I have a complaint"
        ],
        "sn": [
            "Mhoro, ndoda rubatsiro",
            "Mari yangu yakamira sei",
            "Ndoda kutumira mari",
            "Ndoda kubhadhara magetsi",
            "Ndine dambudziko"
        ],
        "nd": [
            "Sawubona, ngicela usizo",
            "Imali yami ingakanani",
            "Ngifuna ukuthumela imali",
            "Ngicela ukukhokha ugesi",
            "Nginesikhalazo"
        ]
    }


@pytest.fixture(scope="session")
def expected_intents():
    """Expected intent classifications for test messages"""
    return [
        "greeting",
        "balance_inquiry",
        "transfer_money",
        "bill_payment",
        "complaint"
    ]


@pytest.fixture(scope="session")
def zimbabwe_financial_services():
    """Zimbabwe-specific financial service test data"""
    return {
        "mobile_money": {
            "ecocash_codes": ["*151#", "*151*1#", "*151*2#"],
            "providers": ["Econet", "NetOne", "Telecel"]
        },
        "banking": {
            "zipit_fee": "$2.00",
            "imtt_tax": "2%",
            "imtt_threshold": "$10"
        },
        "bills": {
            "zesa": "Electricity",
            "zinwa": "Water",
            "dstv": "TV Subscription"
        }
    }


# Test configuration
def pytest_configure(config):
    """Configure pytest with custom markers"""
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')"
    )
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests"
    )
    config.addinivalue_line(
        "markers", "unit: marks tests as unit tests"
    )
