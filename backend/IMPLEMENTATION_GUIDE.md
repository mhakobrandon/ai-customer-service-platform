# Backend Implementation: Conversation State & Escalation System

## Problem Summary
Your bot currently:
- ❌ Doesn't track conversation state (so repeats questions)
- ❌ Doesn't escalate issues (so creates loops)
- ❌ Doesn't distinguish disputes from general questions
- ❌ Has no ticket/escalation system

## Solution Architecture

### 1. Conversation State Model

```python
from enum import Enum
from datetime import datetime
from typing import Dict, Any, List

class ConversationState(Enum):
    INITIAL = "initial"
    COLLECTING_INFO = "collecting_info"
    ESCALATING = "escalating"
    RESOLVED = "resolved"
    CLOSED = "closed"

class ConversationContext:
    """Track user conversation across multiple messages"""
    
    def __init__(self, user_id: str, conversation_id: str):
        self.user_id = user_id
        self.conversation_id = conversation_id
        self.state = ConversationState.INITIAL
        self.intent = None
        self.collected_fields = {}
        self.required_fields = []
        self.ticket_id = None
        self.created_at = datetime.now()
        self.messages: List[Dict] = []
        self.escalation_reason = None
    
    def update_state(self, new_state: ConversationState):
        """Move to next state"""
        self.state = new_state
        print(f"[STATE CHANGE] {self.conversation_id}: {new_state.value}")
    
    def collect_field(self, field_name: str, value: Any):
        """Store user-provided field"""
        self.collected_fields[field_name] = value
        print(f"[COLLECTED] {field_name} = {value}")
    
    def is_complete(self) -> bool:
        """Check if all required fields are collected"""
        return all(
            field in self.collected_fields 
            for field in self.required_fields
        )
    
    def should_escalate(self) -> bool:
        """Determine if issue needs escalation"""
        # Escalate if all required info collected
        if self.is_complete() and self.intent in DISPUTE_INTENTS:
            return True
        
        # Escalate if user repeats same issue
        if self.messages.count(self.intent) > 1:
            return True
        
        return False
    
    def add_message(self, role: str, text: str, intent: str = None):
        """Log message to conversation"""
        self.messages.append({
            "timestamp": datetime.now().isoformat(),
            "role": role,
            "text": text,
            "intent": intent
        })
```

---

### 2. Intent Classification with Context

```python
# intents.py - Define intents and their requirements

DISPUTE_INTENTS = {
    "failed_transfer_dispute": {
        "required_fields": ["ref_number", "amount", "recipient", "city"],
        "escalation_priority": "high",
        "auto_ticket": True
    },
    "airtime_failed_dispute": {
        "required_fields": ["phone_number", "amount", "timestamp"],
        "escalation_priority": "high",
        "auto_ticket": True
    },
    "transaction_issue": {
        "required_fields": ["transaction_id", "issue_description"],
        "escalation_priority": "high",
        "auto_ticket": True
    }
}

SUPPORT_INTENTS = {
    "general_question": {
        "required_fields": [],
        "escalation_priority": "low",
        "auto_ticket": False
    },
    "balance_inquiry": {
        "required_fields": [],
        "escalation_priority": "low",
        "auto_ticket": False
    },
    "network_technical_issue": {
        "required_fields": ["error_description"],
        "escalation_priority": "medium",
        "auto_ticket": False  # Try troubleshooting first
    }
}

ALL_INTENTS = {**DISPUTE_INTENTS, **SUPPORT_INTENTS}

def get_intent_config(intent: str) -> Dict:
    """Get configuration for specific intent"""
    return ALL_INTENTS.get(intent, {})

def is_dispute(intent: str) -> bool:
    """Check if intent is a money-related dispute"""
    return intent in DISPUTE_INTENTS

def get_required_fields(intent: str) -> List[str]:
    """Get list of fields needed for this intent"""
    config = get_intent_config(intent)
    return config.get("required_fields", [])
```

---

### 3. Smart Response Logic (Don't Ask Twice!)

```python
# conversation_handler.py

class ConversationHandler:
    
    def __init__(self):
        self.sessions: Dict[str, ConversationContext] = {}
        self.ticket_system = TicketSystem()
    
    def get_or_create_session(self, user_id: str) -> ConversationContext:
        """Retrieve or create conversation session"""
        if user_id not in self.sessions:
            conversation_id = f"conv_{user_id}_{datetime.now().timestamp()}"
            self.sessions[user_id] = ConversationContext(user_id, conversation_id)
        return self.sessions[user_id]
    
    def process_message(self, user_id: str, user_message: str, detected_intent: str) -> str:
        """Main message processing logic"""
        
        context = self.get_or_create_session(user_id)
        context.add_message("user", user_message, detected_intent)
        
        # STEP 1: First time seeing this intent?
        if context.intent != detected_intent:
            context.intent = detected_intent
            context.required_fields = get_required_fields(detected_intent)
            context.update_state(ConversationState.COLLECTING_INFO)
            return self._handle_new_intent(context)
        
        # STEP 2: Already collecting info for this intent
        if context.state == ConversationState.COLLECTING_INFO:
            # Extract and store any new information from user message
            extracted = self._extract_fields(user_message, detected_intent)
            for field, value in extracted.items():
                context.collect_field(field, value)
            
            # Check if we should escalate
            if context.should_escalate():
                context.update_state(ConversationState.ESCALATING)
                return self._handle_escalation(context)
            else:
                # Ask ONLY for missing fields
                return self._ask_for_missing_fields(context)
        
        # STEP 3: Already escalated?
        if context.state == ConversationState.ESCALATING:
            return self._handle_escalated_follow_up(context)
        
        return "I'm not sure how to help. Please contact support."
    
    def _handle_new_intent(self, context: ConversationContext) -> str:
        """Handle first mention of an issue"""
        intent = context.intent
        
        if is_dispute(intent):
            # Disputes need immediate attention
            required = get_required_fields(intent)
            return self._build_collection_prompt(intent, required)
        else:
            # Other intents get generic help
            return self._get_generic_help(intent)
    
    def _handle_escalation(self, context: ConversationContext) -> str:
        """Escalate to support and create ticket"""
        intent = context.intent
        
        # Create support ticket
        ticket = self.ticket_system.create_ticket(
            user_id=context.user_id,
            intent=intent,
            fields=context.collected_fields,
            priority=ALL_INTENTS[intent]["escalation_priority"]
        )
        
        context.ticket_id = ticket.ticket_id
        context.escalation_reason = "All required info collected"
        context.update_state(ConversationState.RESOLVED)
        
        # Build response with ticket info
        return self._build_escalation_response(context, ticket)
    
    def _handle_escalated_follow_up(self, context: ConversationContext) -> str:
        """User follows up on already-escalated issue"""
        # DON'T ask for info again - reference the ticket
        return f"Your ticket #{context.ticket_id} is being processed. Check back in 24 hours or contact support."
    
    def _ask_for_missing_fields(self, context: ConversationContext) -> str:
        """Ask ONLY for fields we don't have yet"""
        missing = [
            f for f in context.required_fields 
            if f not in context.collected_fields
        ]
        
        if not missing:
            # All fields collected, escalate
            context.update_state(ConversationState.ESCALATING)
            return self._handle_escalation(context)
        
        # Ask for next missing field only
        next_field = missing[0]
        return self._build_field_prompt(next_field, context.intent)
    
    def _extract_fields(self, text: str, intent: str) -> Dict[str, str]:
        """Parse user message for required fields"""
        # This should use NER or regex to extract
        # Example: "QA2333444, $5, 0781900173, Harare"
        # Extract: ref_number, amount, recipient, city
        
        extracted = {}
        
        if intent == "failed_transfer_dispute":
            # Parse: ref, amount, recipient, city
            parts = [p.strip() for p in text.split(",")]
            if len(parts) >= 4:
                extracted["ref_number"] = parts[0]
                extracted["amount"] = parts[1]
                extracted["recipient"] = parts[2]
                extracted["city"] = parts[3]
        
        elif intent == "airtime_failed_dispute":
            # Parse: phone, amount, timestamp
            parts = [p.strip() for p in text.split(",")]
            if len(parts) >= 3:
                extracted["phone_number"] = parts[0]
                extracted["amount"] = parts[1]
                extracted["timestamp"] = parts[2]
        
        return extracted
    
    def _build_collection_prompt(self, intent: str, required_fields: List[str]) -> str:
        """Build user-friendly prompt for collecting info"""
        
        prompts = {
            "failed_transfer_dispute": {
                "en": f"I can help! Please provide: 1) Transaction reference, 2) Amount, 3) Recipient number, 4) Your city",
                "sn": f"Ndinogona kukubatsira! Ndapota ndiudze: 1) Reference number, 2) Amount, 3) Recipient number, 4) Your city"
            },
            "airtime_failed_dispute": {
                "en": f"I'll help resolve this! Please provide: 1) Phone number you bought for, 2) Amount, 3) Time of purchase",
                "sn": f"Ndinozvigadzirise! Ndapota ndiudze: 1) Nhamba yefoni, 2) Mari, 3) Zuva rakatengwira"
            }
        }
        
        return prompts.get(intent, {}).get("en", "Please provide details to help us assist you.")
    
    def _build_escalation_response(self, context: ConversationContext, ticket) -> str:
        """Build response when escalating to support"""
        
        responses = {
            "failed_transfer_dispute": {
                "en": f"Thank you. We're investigating your transfer. Ticket: #{ticket.ticket_id}. You'll be contacted in 24 hours.",
                "sn": f"Ndatora kwekenyu. Tikuchera ichizvi. Kete: #{ticket.ticket_id}. Munhu wedu achasangana nenyu mumaawa 24."
            },
            "airtime_failed_dispute": {
                "en": f"We're processing your refund. Ticket: #{ticket.ticket_id}. Refund will arrive within 30 minutes.",
                "sn": f"Tichakubvisa mari. Kete: #{ticket.ticket_id}. Mari ichapinda mumaawa 30."
            }
        }
        
        intent = context.intent
        return responses.get(intent, {}).get("en", f"Your ticket #{ticket.ticket_id} has been created.")
    
    def _build_field_prompt(self, field: str, intent: str) -> str:
        """Build prompt asking for specific field"""
        
        field_prompts = {
            "ref_number": "Please provide the transaction reference number",
            "amount": "How much was the transfer?",
            "recipient": "What was the recipient's phone number?",
            "city": "What city are you in?",
            "phone_number": "Which phone number did you buy airtime for?",
            "timestamp": "When did you attempt the purchase?"
        }
        
        return field_prompts.get(field, f"Please provide {field}")
    
    def _get_generic_help(self, intent: str) -> str:
        """Generic help response for non-dispute intents"""
        return "How can I help you today?"
```

---

### 4. Ticket System

```python
# ticket_system.py

from dataclasses import dataclass
from datetime import datetime
import uuid

@dataclass
class SupportTicket:
    ticket_id: str
    user_id: str
    intent: str
    fields: Dict[str, str]
    priority: str
    status: str = "open"
    created_at: datetime = None
    updated_at: datetime = None
    assigned_to: str = None
    resolution: str = None

class TicketSystem:
    
    def __init__(self):
        self.tickets: Dict[str, SupportTicket] = {}
    
    def create_ticket(self, user_id: str, intent: str, fields: Dict, priority: str) -> SupportTicket:
        """Create new support ticket"""
        ticket_id = f"T{str(uuid.uuid4())[:8].upper()}"
        
        ticket = SupportTicket(
            ticket_id=ticket_id,
            user_id=user_id,
            intent=intent,
            fields=fields,
            priority=priority,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        self.tickets[ticket_id] = ticket
        
        # Log to database
        self._save_ticket_to_db(ticket)
        
        # Route to appropriate queue
        self._route_ticket(ticket)
        
        print(f"[TICKET CREATED] {ticket_id} - {priority} priority")
        
        return ticket
    
    def _save_ticket_to_db(self, ticket: SupportTicket):
        """Save to database"""
        # TODO: Implement database save
        pass
    
    def _route_ticket(self, ticket: SupportTicket):
        """Route ticket to appropriate support queue"""
        if ticket.priority == "high":
            # Urgent queue (refunds, security)
            self._send_to_urgent_queue(ticket)
        elif ticket.priority == "medium":
            # Standard queue
            self._send_to_standard_queue(ticket)
        else:
            # General queue
            self._send_to_general_queue(ticket)
    
    def _send_to_urgent_queue(self, ticket: SupportTicket):
        # Send alert to support team
        print(f"[URGENT] Ticket {ticket.ticket_id} needs immediate attention")
    
    def _send_to_standard_queue(self, ticket: SupportTicket):
        print(f"[STANDARD] Ticket {ticket.ticket_id} queued for response")
    
    def _send_to_general_queue(self, ticket: SupportTicket):
        print(f"[GENERAL] Ticket {ticket.ticket_id} queued")
    
    def get_ticket(self, ticket_id: str) -> SupportTicket:
        return self.tickets.get(ticket_id)
    
    def update_ticket(self, ticket_id: str, status: str, resolution: str = None):
        if ticket_id in self.tickets:
            ticket = self.tickets[ticket_id]
            ticket.status = status
            ticket.resolution = resolution
            ticket.updated_at = datetime.now()
            self._save_ticket_to_db(ticket)
```

---

### 5. Integration with ChatBot API

```python
# app/api/chat.py

@router.post("/chat")
async def chat(request: ChatRequest):
    """
    Main chat endpoint
    
    request.user_id: str
    request.message: str
    request.language: str (en, sn, nd)
    """
    
    # Step 1: Classify intent using the model
    intent, confidence = nlp_service.classify_intent(
        request.message,
        language=request.language
    )
    
    # Step 2: Process with conversation handler
    conversation_handler = ConversationHandler()
    bot_response = conversation_handler.process_message(
        user_id=request.user_id,
        user_message=request.message,
        detected_intent=intent
    )
    
    # Step 3: Return response
    return {
        "user_id": request.user_id,
        "user_message": request.message,
        "bot_response": bot_response,
        "intent": intent,
        "confidence": confidence,
        "conversation_state": conversation_handler.sessions[request.user_id].state.value
    }
```

---

## Implementation Checklist

- [ ] Create `ConversationContext` class for state tracking
- [ ] Create intent configuration with required fields
- [ ] Build `ConversationHandler` with logic to avoid repetition
- [ ] Implement `TicketSystem` for escalation
- [ ] Add field extraction (parse user messages for ref, amount, etc.)
- [ ] Add multilingual prompts (English, Shona, Ndebele)
- [ ] Add database persistence for tickets
- [ ] Integrate with existing chat endpoint
- [ ] Test with sample conversations from your error logs
- [ ] Monitor and adjust based on new errors

---

## Testing the Implementation

```python
# test_conversation_flow.py

def test_failed_transfer_flow():
    handler = ConversationHandler()
    
    # Message 1: User reports failed transfer
    msg1 = "ndatumirwa mai asi haina kusvika"
    response1 = handler.process_message("user_123", msg1, "failed_transfer_dispute")
    print("Response 1:", response1)
    # Expected: Ask for reference, amount, recipient, city
    
    # Message 2: User provides info
    msg2 = "QA2333444, $5, 0781900173, Harare"
    response2 = handler.process_message("user_123", msg2, "failed_transfer_dispute")
    print("Response 2:", response2)
    # Expected: Create ticket and confirm
    
    # Message 3: User repeats (should NOT ask again)
    msg3 = "QA2333444, $5, 0781900173, Harare"
    response3 = handler.process_message("user_123", msg3, "failed_transfer_dispute")
    print("Response 3:", response3)
    # Expected: Reference existing ticket, NOT ask for info again
    
    assert "ticket" in response2.lower()
    assert "don't ask" in response3.lower() or "ticket" in response3.lower()
    print("✅ Test passed!")

if __name__ == "__main__":
    test_failed_transfer_flow()
```
