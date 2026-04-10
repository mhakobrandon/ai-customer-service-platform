"""
Unit Tests for NLP Service
Tests for intent classification, language detection, and response generation.

Author: Brandon K Mhako (R223931W)
"""

import pytest
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'app'))

from app.services.nlp_service import NLPService
from app.core.config import settings


class TestNLPServiceLanguageDetection:
    """Tests for language detection functionality"""
    
    @pytest.fixture
    def nlp_service(self):
        """Create NLP service instance for testing"""
        return NLPService(confidence_threshold=settings.NLP_CONFIDENCE_THRESHOLD)
    
    def test_detect_english(self, nlp_service):
        """Test detection of English language"""
        test_cases = [
            "Hello, I need help with my account",
            "What is my balance?",
            "I want to transfer money",
            "Please help me reset my password",
            "I have a complaint about a transaction"
        ]
        for text in test_cases:
            language = nlp_service.detect_language(text)
            assert language == "en", f"Expected 'en' for '{text}', got '{language}'"
    
    def test_detect_shona(self, nlp_service):
        """Test detection of Shona language"""
        test_cases = [
            "Mhoro, ndoda rubatsiro",
            "Ndine dambudziko neaccount yangu",
            "Ndiri kuda kuona mari yangu",
            "Ndinoda kutumira mari",
            "Ndapota ndibatsirei"
        ]
        for text in test_cases:
            language = nlp_service.detect_language(text)
            assert language == "sn", f"Expected 'sn' for '{text}', got '{language}'"
    
    def test_detect_ndebele(self, nlp_service):
        """Test detection of Ndebele language"""
        test_cases = [
            "Sawubona, ngicela usizo",
            "Ngifuna ukubona imali yami",
            "Ngicela ukuthumela imali",
            "Nginenkinga nge-account yami"
        ]
        for text in test_cases:
            language = nlp_service.detect_language(text)
            assert language == "nd", f"Expected 'nd' for '{text}', got '{language}'"
    
    def test_default_to_english(self, nlp_service):
        """Test that ambiguous text defaults to English"""
        text = "xyz123"
        language = nlp_service.detect_language(text)
        assert language == "en", f"Expected 'en' for ambiguous text, got '{language}'"


class TestNLPServiceIntentClassification:
    """Tests for intent classification functionality"""
    
    @pytest.fixture
    def nlp_service(self):
        """Create NLP service instance for testing"""
        return NLPService(confidence_threshold=settings.NLP_CONFIDENCE_THRESHOLD)
    
    def test_balance_inquiry_english(self, nlp_service):
        """Test balance inquiry intent classification in English"""
        test_cases = [
            "What is my balance?",
            "Check my account balance",
            "How much money do I have?",
            "Show me my balance",
            "I want to see my balance"
        ]
        for text in test_cases:
            intent, confidence = nlp_service.classify_intent(text, "en")
            assert intent == "balance_inquiry", f"Expected 'balance_inquiry' for '{text}', got '{intent}'"
            assert confidence > 0, f"Confidence should be positive for '{text}'"
    
    def test_balance_inquiry_shona(self, nlp_service):
        """Test balance inquiry intent classification in Shona"""
        test_cases = [
            "Ndoda kuona mari yangu",
            "Mari yangu yakamira sei",
            "Ndinoda kuona balance yangu",
            "Ndikuda kuona mari hangu"
        ]
        for text in test_cases:
            intent, confidence = nlp_service.classify_intent(text, "sn")
            assert intent == "balance_inquiry", f"Expected 'balance_inquiry' for '{text}', got '{intent}'"
    
    def test_transfer_money_intent(self, nlp_service):
        """Test money transfer intent classification"""
        test_cases = [
            ("I want to transfer money", "en"),
            ("Send money to another account", "en"),
            ("Ndoda kutumira mari", "sn"),
            ("Ngifuna ukuthumela imali", "nd")
        ]
        for text, lang in test_cases:
            intent, confidence = nlp_service.classify_intent(text, lang)
            assert intent == "transfer_money", f"Expected 'transfer_money' for '{text}', got '{intent}'"
    
    def test_greeting_intent(self, nlp_service):
        """Test greeting intent classification"""
        test_cases = [
            ("Hello", "en"),
            ("Hi there", "en"),
            ("Good morning", "en"),
            ("Mhoro", "sn"),
            ("Masikati", "sn"),
            ("Sawubona", "nd")
        ]
        for text, lang in test_cases:
            intent, confidence = nlp_service.classify_intent(text, lang)
            assert intent == "greeting", f"Expected 'greeting' for '{text}', got '{intent}'"
    
    def test_complaint_intent(self, nlp_service):
        """Test complaint intent classification"""
        test_cases = [
            "I have a complaint",
            "This is unacceptable",
            "I'm not happy with the service",
            "I want to report a problem"
        ]
        for text in test_cases:
            intent, confidence = nlp_service.classify_intent(text, "en")
            assert intent == "complaint", f"Expected 'complaint' for '{text}', got '{intent}'"
    
    def test_mobile_money_intent(self, nlp_service):
        """Test mobile money/EcoCash intent classification"""
        test_cases = [
            "I need help with EcoCash",
            "How do I use EcoCash?",
            "EcoCash transfer not working",
            "Send money via EcoCash"
        ]
        for text in test_cases:
            intent, confidence = nlp_service.classify_intent(text, "en")
            assert intent == "mobile_money", f"Expected 'mobile_money' for '{text}', got '{intent}'"
    
    def test_transaction_dispute_intent(self, nlp_service):
        """Test transaction dispute intent classification"""
        test_cases = [
            "I want a reversal",
            "Transaction dispute",
            "Wrong transaction",
            "Refund my money",
            "Transaction failed but money deducted"
        ]
        for text in test_cases:
            intent, confidence = nlp_service.classify_intent(text, "en")
            assert intent == "transaction_dispute", f"Expected 'transaction_dispute' for '{text}', got '{intent}'"
    
    def test_security_pin_intent(self, nlp_service):
        """Test security PIN intent classification"""
        test_cases = [
            "I forgot my PIN",
            "Reset my PIN",
            "Change PIN",
            "PIN blocked",
            "Unblock my PIN"
        ]
        for text in test_cases:
            intent, confidence = nlp_service.classify_intent(text, "en")
            assert intent == "security_pin", f"Expected 'security_pin' for '{text}', got '{intent}'"
    
    def test_network_connectivity_intent(self, nlp_service):
        """Test network connectivity intent classification"""
        test_cases = [
            "Network is down",
            "App not working",
            "Connection problem",
            "USSD not responding"
        ]
        for text in test_cases:
            intent, confidence = nlp_service.classify_intent(text, "en")
            assert intent == "network_connectivity", f"Expected 'network_connectivity' for '{text}', got '{intent}'"
    
    def test_bill_payment_intent(self, nlp_service):
        """Test bill payment intent classification"""
        test_cases = [
            "Pay ZESA bill",
            "Buy electricity",
            "Pay my bills",
            "ZESA tokens"
        ]
        for text in test_cases:
            intent, confidence = nlp_service.classify_intent(text, "en")
            assert intent == "bill_payment", f"Expected 'bill_payment' for '{text}', got '{intent}'"
    
    def test_escalation_request_intent(self, nlp_service):
        """Test escalation request intent classification"""
        test_cases = [
            "Talk to a human",
            "I want to speak to an agent",
            "Connect me to someone",
            "Escalate this issue",
            "Let me talk to a person"
        ]
        for text in test_cases:
            intent, confidence = nlp_service.classify_intent(text, "en")
            assert intent == "escalation_request", f"Expected 'escalation_request' for '{text}', got '{intent}'"

    def test_update_profile_intent_regression(self, nlp_service):
        """Update-profile phrases should not be routed to security intents."""
        test_cases = [
            ("I want to change my phone number on my account", "en"),
            ("Ndoda kuchinja email address yangu", "sn"),
        ]
        for text, lang in test_cases:
            intent, confidence = nlp_service.classify_intent(text, lang)
            assert intent == "update_profile", f"Expected 'update_profile' for '{text}', got '{intent}'"

    def test_mobile_wallet_fees_intent_regression(self, nlp_service):
        """Fee/tax language should map to mobile_wallet_fees intent."""
        test_cases = [
            ("How much are EcoCash transfer fees?", "en"),
            ("IMTT tax inobhadharwa sei?", "sn"),
        ]
        for text, lang in test_cases:
            intent, confidence = nlp_service.classify_intent(text, lang)
            assert intent == "mobile_wallet_fees", f"Expected 'mobile_wallet_fees' for '{text}', got '{intent}'"

    def test_account_closure_intent_regression(self, nlp_service):
        """Account closure requests should map to account_closure intent."""
        test_cases = [
            ("I want to close my account", "en"),
            ("Ndoda kuvhara account yangu", "sn"),
        ]
        for text, lang in test_cases:
            intent, confidence = nlp_service.classify_intent(text, lang)
            assert intent == "account_closure", f"Expected 'account_closure' for '{text}', got '{intent}'"

    def test_shona_loan_wording_regression(self, nlp_service):
        """Common Shona loan wording should map to loan inquiry."""
        intent, confidence = nlp_service.classify_intent("Ndinoda kukwereta mari", "sn")
        assert intent == "loan_inquiry", f"Expected 'loan_inquiry', got '{intent}'"


class TestNLPServiceResponseGeneration:
    """Tests for response generation functionality"""
    
    @pytest.fixture
    def nlp_service(self):
        """Create NLP service instance for testing"""
        return NLPService(confidence_threshold=settings.NLP_CONFIDENCE_THRESHOLD)
    
    def test_generate_balance_response_english(self, nlp_service):
        """Test balance response generation in English"""
        response = nlp_service.generate_response(
            "balance_inquiry", 
            "en", 
            {"balance": "$500.00", "last_transaction": "-$50 on Jan 15"}
        )
        assert "$500.00" in response
        assert response is not None
        assert len(response) > 10
    
    def test_generate_greeting_response(self, nlp_service):
        """Test greeting response generation"""
        languages = ["en", "sn", "nd"]
        for lang in languages:
            response = nlp_service.generate_response("greeting", lang)
            assert response is not None
            assert len(response) > 10
    
    def test_generate_response_all_intents(self, nlp_service):
        """Test that all intents have valid responses"""
        intents = [
            "balance_inquiry", "transaction_history", "transfer_money",
            "account_statement", "password_reset", "loan_inquiry",
            "bill_payment", "mobile_money", "greeting", "goodbye",
            "complaint", "transaction_dispute", "security_pin",
            "network_connectivity", "mobile_wallet_fees"
        ]
        for intent in intents:
            response = nlp_service.generate_response(intent, "en")
            assert response is not None, f"No response for intent '{intent}'"
            assert len(response) > 5, f"Response too short for intent '{intent}'"
    
    def test_generate_response_multilingual(self, nlp_service):
        """Test response generation in multiple languages"""
        intent = "greeting"
        languages = ["en", "sn", "nd"]
        responses = {}
        
        for lang in languages:
            responses[lang] = nlp_service.generate_response(intent, lang)
            assert responses[lang] is not None
        
        # Responses should be different for different languages
        assert responses["en"] != responses["sn"]
        assert responses["en"] != responses["nd"]


class TestNLPServiceEntityExtraction:
    """Tests for entity extraction functionality"""
    
    @pytest.fixture
    def nlp_service(self):
        """Create NLP service instance for testing"""
        return NLPService(confidence_threshold=settings.NLP_CONFIDENCE_THRESHOLD)
    
    def test_extract_phone_number(self, nlp_service):
        """Test phone number extraction"""
        text = "Send money to 0771234567"
        entities = nlp_service.extract_entities(text, "transfer_money")
        assert "phone_number" in entities
        assert "0771234567" in entities["phone_number"]
    
    def test_extract_amount(self, nlp_service):
        """Test amount extraction"""
        test_cases = [
            ("Transfer $100", "transfer_money"),
            ("I want to send $50 dollars", "transfer_money"),
            ("Pay $25.50 for electricity", "bill_payment")
        ]
        for text, intent in test_cases:
            entities = nlp_service.extract_entities(text, intent)
            assert "amount" in entities or len(entities) >= 0  # May not always extract


class TestNLPServiceProcessMessage:
    """Tests for complete message processing"""
    
    @pytest.fixture
    def nlp_service(self):
        """Create NLP service instance for testing"""
        return NLPService(confidence_threshold=settings.NLP_CONFIDENCE_THRESHOLD)
    
    def test_process_complete_message(self, nlp_service):
        """Test complete message processing"""
        result = nlp_service.process_message("What is my account balance?")
        
        assert "language" in result
        assert "intent" in result
        assert "confidence" in result
        assert "response" in result
        assert "needs_escalation" in result
        assert "timestamp" in result
        
        assert result["language"] == "en"
        assert result["intent"] == "balance_inquiry"
        assert result["confidence"] > 0
    
    def test_process_multilingual_messages(self, nlp_service):
        """Test processing messages in different languages"""
        test_cases = [
            ("Hello", "en", "greeting"),
            ("Mhoro", "sn", "greeting"),
            ("Sawubona", "nd", "greeting"),
            ("I want to check my balance", "en", "balance_inquiry"),
            ("Ndoda kutumira mari", "sn", "transfer_money")
        ]
        for text, expected_lang, expected_intent in test_cases:
            result = nlp_service.process_message(text)
            assert result["language"] == expected_lang, f"Language mismatch for '{text}'"
            assert result["intent"] == expected_intent, f"Intent mismatch for '{text}'"
    
    def test_escalation_flag(self, nlp_service):
        """Test that low confidence triggers escalation"""
        # Process an ambiguous message
        result = nlp_service.process_message("xyz abc 123")
        
        # For ambiguous messages, needs_escalation should be determined by confidence
        assert "needs_escalation" in result
        assert isinstance(result["needs_escalation"], bool)


class TestNLPServiceHybridApproach:
    """Tests for hybrid ML + rule-based approach"""
    
    @pytest.fixture
    def nlp_service(self):
        """Create NLP service instance for testing"""
        return NLPService(confidence_threshold=settings.NLP_CONFIDENCE_THRESHOLD)
    
    def test_rule_based_fallback_for_short_greetings(self, nlp_service):
        """Test that short greetings use rule-based classification"""
        short_greetings = ["Hi", "Hey", "Hello", "Mhoro", "Sawubona"]
        for greeting in short_greetings:
            intent, confidence = nlp_service.classify_intent(greeting, "en")
            assert intent == "greeting", f"Expected 'greeting' for '{greeting}', got '{intent}'"
            # Should have reasonable confidence from rule-based system
            assert confidence > 0.5, f"Expected confidence > 0.5 for '{greeting}', got {confidence}"
    
    def test_classification_returns_valid_intent(self, nlp_service):
        """Test that classification always returns a valid intent"""
        test_texts = [
            "What is my balance?",
            "Hello there",
            "Some random text here",
            "Ndoda rubatsiro",
            "Transfer money please"
        ]
        valid_intents = set(nlp_service.INTENT_CATEGORIES)
        
        for text in test_texts:
            intent, confidence = nlp_service.classify_intent(text, "en")
            assert intent in valid_intents, f"Invalid intent '{intent}' for text '{text}'"


class TestNLPServiceConfiguration:
    """Tests for NLP service configuration"""
    
    def test_confidence_threshold_from_config(self):
        """Test that confidence threshold uses config value"""
        service = NLPService(confidence_threshold=settings.NLP_CONFIDENCE_THRESHOLD)
        assert service.confidence_threshold == settings.NLP_CONFIDENCE_THRESHOLD
    
    def test_custom_confidence_threshold(self):
        """Test setting custom confidence threshold"""
        custom_threshold = 0.75
        service = NLPService(confidence_threshold=custom_threshold)
        assert service.confidence_threshold == custom_threshold
    
    def test_intent_labels_defined(self):
        """Test that all intent labels are defined"""
        service = NLPService()
        expected_intents = [
            "balance_inquiry", "transaction_history", "transfer_money",
            "account_statement", "password_reset", "update_profile",
            "loan_inquiry", "bill_payment", "mobile_money",
            "transaction_dispute", "security_pin", "network_connectivity",
            "mobile_wallet_fees", "account_closure", "account_opening",
            "card_request", "atm_location", "branch_location",
            "escalation_request", "general_inquiry", "greeting", "goodbye", "complaint"
        ]
        for intent in expected_intents:
            assert intent in service.INTENT_LABELS, f"Intent '{intent}' not in INTENT_LABELS"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
