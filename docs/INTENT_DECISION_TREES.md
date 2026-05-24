# Intent Decision Trees & Conversation Workflows

## Critical Issues Identified from Chat Logs

### ❌ **Problem 1: Failed Transfer Loop**
```
User: "ndatumirwa mai asi haina kusvika" (I sent money but it didn't arrive)
Bot: Asks for details
User: Provides QA2333444,$5,0781900173,Harare  
Bot: REPEATS same request ← LOOP PROBLEM
```

### ❌ **Problem 2: Airtime Not Arriving**
```
User: "ndatenga airtime mari yabviswa muakaundi asi hakuna airtime yasvika"
Bot: Shows general bill payment options ← WRONG INTENT CLASSIFICATION
```

---

## Solution: Decision Trees by Intent

### 1. **FAILED_TRANSFER / TRANSACTION_DISPUTE**

```
┌─ User reports transfer failed/not arrived
│
├─ Is this their first mention of this issue?
│  ├─ YES → Collect: Ref#, Amount, Account, Recipient, City
│  │         Store in session context
│  │         Go to STEP 2
│  │
│  └─ NO (already collected) → Go to STEP 2
│
└─ STEP 2: All details collected?
   ├─ YES → Create TICKET #XXXX
   │        "We're investigating. Ticket: #XXXX"
   │        "You'll be contacted in 24hrs"
   │        ✅ ESCALATE (don't ask again)
   │
   └─ NO → Ask ONLY missing info
          "We have: $5, Ref# QA2333444. Need: Recipient name?"
```

**Decision Points:**
- IF user repeats same info → DON'T ask again, escalate
- IF user adds new details → Update ticket, escalate
- IF user says "I didn't receive X amount" → Always create ticket

**Output:** Create support ticket, NOT repeat questions

---

### 2. **AIRTIME_FAILED / AIRTIME_NOT_RECEIVED**

```
┌─ User: "airtime didn't arrive but money was deducted"
│
├─ Collect: Phone number, Amount, Timestamp/Date
│  Store in context
│
├─ Has this been reported before in this session?
│  ├─ YES → Create AIRTIME_DISPUTE ticket
│  │        "Your airtime request is being resolved. Ticket: #XXXX"
│  │
│  └─ NO → Offer 2 options:
│          1. Check balance (manual check)
│          2. Create dispute ticket + auto-refund
│          ✅ ESCALATE (don't repeat question)
```

**Decision Points:**
- IF money deducted but airtime not received → Always escalate
- IF user asks for refund → Process immediately, create ticket
- IF user repeats issue → Don't ask for details again

**Output:** Immediate refund + ticket, NOT repeat questions

---

### 3. **ACCOUNT_ISSUE / NETWORK_PROBLEM**

```
┌─ User: "network issue", "app not working", "can't load data"
│
├─ Is this a network/technical issue?
│  ├─ YES → Check: Is it their phone or our service?
│  │        
│  │        Option A: Troubleshooting (quick steps)
│  │        - "Try: 1. Toggle data off/on 2. Restart app"
│  │        - Wait 30 seconds
│  │        
│  │        Option B: Server status
│  │        - "Our servers are [UP/DOWN]"
│  │        
│  │        ✅ If issue persists → Create ticket
│  │
│  └─ NO (something else) → Reclassify
```

**Decision Points:**
- IF user reports issue persists after troubleshooting → Escalate
- IF multiple users report same issue → Server incident (escalate to ops)
- IF issue resolves → Confirm and close conversation

**Output:** Troubleshoot once, then escalate if not resolved

---

## Critical Conversation Flow Rules

### ✅ **DO:**
1. **Store Context**: Remember what user said/provided
2. **Never Repeat**: If you asked once and got answer, move forward
3. **Escalate Decisively**: After collecting info → CREATE TICKET
4. **Track State**: Know if user already provided details
5. **Offer 1-2 Options**: Not generic responses

### ❌ **DON'T:**
1. Ask for same info twice
2. Loop back to same question
3. Show generic help for specific issues
4. Leave user hanging (always escalate or resolve)
5. Repeat bot responses

---

## Conversation State Machine

```
STATE: INITIAL
  ↓
  User provides issue
  ↓
STATE: COLLECTING_INFO
  ↓
  Has all required fields?
  ├─ NO → Ask missing field (only)
  │       Loop back to COLLECTING_INFO
  │
  └─ YES → Go to ESCALATING
  ↓
STATE: ESCALATING
  ↓
  Create ticket / refund / escalate to agent
  ↓
STATE: RESOLVED
  ↓
  Confirm with user
  ↓
  END CONVERSATION
```

---

## Required Training Data Format

Instead of single sentences, train with **conversation context**:

```json
{
  "conversation_id": "conv_001",
  "messages": [
    {
      "role": "user",
      "text": "ndatumirwa mai asi haina kusvika",
      "language": "sn",
      "intent": "failed_transfer",
      "state": "initial",
      "required_fields": ["ref_number", "amount", "recipient", "city"]
    },
    {
      "role": "bot",
      "text": "Ndinogona kukubatsira. Ndapota ndiudze: Reference number, amount, recipient, and city.",
      "intent": "failed_transfer",
      "state": "collecting_info",
      "action": "ask_for_details"
    },
    {
      "role": "user",
      "text": "QA2333444, $5, 0781900173, Harare",
      "intent": "failed_transfer",
      "state": "collecting_info",
      "collected_fields": {
        "ref_number": "QA2333444",
        "amount": "$5",
        "recipient": "0781900173",
        "city": "Harare"
      }
    },
    {
      "role": "bot",
      "text": "Thank you. We're investigating your transfer. Your ticket is #T001234. You'll be contacted in 24 hours.",
      "intent": "failed_transfer",
      "state": "escalating",
      "action": "create_ticket",
      "ticket_id": "T001234"
    }
  ]
}
```

---

## Escalation & Ticket System

### Automatic Escalation Triggers:
- ❌ Failed transfer reported
- ❌ Money deducted but service not received (airtime, data, etc.)
- ❌ Same issue reported 2+ times in conversation
- ❌ Security/PIN related issues
- ❌ Loan/credit inquiries
- ❌ Technical issues after troubleshooting

### Ticket Priority:
- 🔴 **URGENT**: Money stolen, security breach
- 🟠 **HIGH**: Failed transfer/airtime, pending investigation
- 🟡 **MEDIUM**: Billing questions, statement requests
- 🟢 **LOW**: General questions, how-to requests

---

## Next Steps

1. **Retrain model** with conversation context (not just intent)
2. **Add conversation state tracking** to bot (in memory/session)
3. **Implement escalation** endpoint (create tickets)
4. **Add field validation** (extract ref, amount, phone from user input)
5. **Build feedback loop** (mark incorrect responses for retraining)
