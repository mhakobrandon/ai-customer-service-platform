# Fine-Tuning Dataset: Learning from Real Errors

This dataset shows what went WRONG in your chat logs and how to fix it.

## Error #1: Failed Transfer Loop (Shona)

### ❌ WRONG - What Actually Happened:
```
User:     "ndatumirwa mai asi haina kusvika"
          (I sent money but it didn't arrive)
Intent:   GENERIC_SUPPORT or SEND_MONEY (WRONG)

Bot Response: "Ndapota ndiudze chimwe chinhu chimwe chete kuti ndigadzirise nemazvo: 
              reference yetransaction, mari, account/wallet yawashandisa, kana guta/nzvimbo."

User:     "QA2333444, $5, 0781900173, Harare"
          (Provided all details)

Bot Response: "Ndinogona kukubatsira. Ndapota ndiudze chimwe chinhu chimwe chete..."
              (REPEATS SAME QUESTION) ← LOOP

User:     "QA2333444, $5, 0781900173, Harare" (repeats)

Bot Response: Same repeating response ← BROKEN
```

### ✅ CORRECT - How to Fix It:

```json
{
  "error_id": "ERROR_001_TRANSFER_LOOP",
  "language": "sn",
  "category": "failed_transfer",
  "root_cause": [
    "Intent misclassified as GENERIC_SUPPORT instead of FAILED_TRANSFER_DISPUTE",
    "No conversation state tracking - bot doesn't remember details were provided",
    "No escalation logic - should create ticket after collecting info"
  ],
  "training_examples": [
    {
      "input": "ndatumirwa mai asi haina kusvika",
      "correct_intent": "failed_transfer_dispute",
      "correct_intent_id": 5,
      "keywords": ["ndatumirwa", "haina kusvika", "transfer failed", "money didn't arrive"],
      "expected_bot_action": "collect_transaction_details"
    },
    {
      "input": "ndatumirwa mari asi haina kusvika",
      "correct_intent": "failed_transfer_dispute",
      "correct_intent_id": 5,
      "keywords": ["ndatumirwa", "mari", "haina kusvika"],
      "expected_bot_action": "collect_transaction_details"
    }
  ],
  "conversation_template": {
    "step_1": {
      "user_says": "ndatumirwa mai asi haina kusvika",
      "bot_should": "Acknowledge + ask for transaction details",
      "bot_response": "Ndinoyeurera. Kuti ndikubatsire, ndapota ndiudze: (1) Reference number, (2) Amount, (3) Recipient number, (4) Your city",
      "next_step": "listen for user response",
      "store_in_session": {"issue_type": "failed_transfer"}
    },
    "step_2": {
      "user_says": "QA2333444, $5, 0781900173, Harare",
      "bot_should": "Store details + create escalation ticket (NOT ask again)",
      "bot_response": "Ndatora kwekenyu: Ref# QA2333444, $5, muMuzvare 0781900173. Tikuchera ichizvi nechikamu chedu. Kete yenyu: #T001234. Munhu wedu achasangana nenyu mumaawa 24.",
      "next_step": "escalate_to_support_ticket",
      "store_in_session": {
        "ref": "QA2333444",
        "amount": "$5",
        "recipient": "0781900173",
        "city": "Harare",
        "ticket_id": "T001234"
      }
    },
    "step_3_if_user_repeats": {
      "user_says": "QA2333444, $5, 0781900173, Harare",
      "bot_should": "NOT ask again - reference existing ticket",
      "bot_response": "Tave muticket #T001234. Tinochekurombedzana nepamusoro kwayo. Chingani murume/mai.",
      "next_step": "wait_or_close_conversation"
    }
  }
}
```

---

## Error #2: Airtime Not Arriving (Misclassified)

### ❌ WRONG - What Actually Happened:
```
User:     "ndatenga airtime mari yabviswa muakaundi asi hakuna airtime yasvika"
          (I bought airtime, money deducted but airtime didn't arrive)

Bot Response: Shows GENERAL BILL PAYMENT OPTIONS
          "1 = ZESA, 2 = Water, 3 = Internet..."
          (COMPLETELY WRONG - user didn't ask about bills)
          
Intent Classification: Probably BILL_PAYMENT or GENERAL_HELP (WRONG)
```

### ✅ CORRECT - How to Fix It:

```json
{
  "error_id": "ERROR_002_AIRTIME_MISMATCH",
  "language": "sn",
  "category": "airtime_failed",
  "root_cause": [
    "Intent misclassified as BILL_PAYMENT instead of AIRTIME_FAILED_DISPUTE",
    "Keywords not recognized: 'ndatenga airtime' (I bought airtime)",
    "No money_deducted + service_not_received rule"
  ],
  "training_examples": [
    {
      "input": "ndatenga airtime mari yabviswa muakaundi asi hakuna airtime yasvika",
      "correct_intent": "airtime_failed_dispute",
      "correct_intent_id": 7,
      "keywords": ["ndatenga airtime", "mari yabviswa", "hakuna airtime", "deduction without service"],
      "expected_bot_action": "collect_airtime_details_and_escalate",
      "should_NOT_trigger": "bill_payment, airtime_topup_help"
    },
    {
      "input": "I bought airtime but money was deducted and no airtime arrived",
      "correct_intent": "airtime_failed_dispute",
      "correct_intent_id": 7,
      "keywords": ["bought airtime", "money deducted", "no airtime", "didn't arrive"],
      "expected_bot_action": "collect_airtime_details_and_escalate"
    }
  ],
  "conversation_template": {
    "step_1": {
      "user_says": "ndatenga airtime mari yabviswa muakaundi asi hakuna airtime yasvika",
      "bot_should": "Acknowledge SPECIFIC issue + offer refund or investigation",
      "bot_response": "Ndinoyeurera! Kune vamwe munhu aino-zvikarura izvi. Ndinotaura: (1) Nhamba yefoni yayakutenga airtime yayo, (2) Zviyero zvemari, (3) Zuva rakatengwira",
      "next_step": "collect_details",
      "store_in_session": {"issue_type": "airtime_failed_dispute", "money_deducted": True}
    },
    "step_2": {
      "user_says": "Econet 0784556677, $1.50, Today 2:30pm",
      "bot_should": "Offer immediate resolution (refund or ticket)",
      "bot_response": "Nhamba yenyu: 0784556677, Mari: $1.50, Zuva: Nhasi. Tinokuda kukubatsira. Pindura: (1) Refund immediately + create ticket, or (2) Just create ticket for investigation?",
      "next_step": "offer_resolution_options",
      "store_in_session": {"phone": "0784556677", "amount": "$1.50"}
    },
    "step_3": {
      "user_says": "Refund",
      "bot_should": "Process immediately + create ticket",
      "bot_response": "Refund yenyu ichapinda muakaundi enyu munhau 30. Kete: #T001256. Isu tichechera ichi.",
      "next_step": "process_refund_create_ticket"
    }
  }
}
```

---

## Error #3: Network Issue (Wrong Category)

### ❌ WRONG:
```
User:     "network yangu haisi kubatidza data"
          (My network isn't loading data)

Expected: Should trigger TECHNICAL_ISSUE or NETWORK_PROBLEM
Actual:   (No response in chat, or wrong category)
```

### ✅ CORRECT:

```json
{
  "error_id": "ERROR_003_NETWORK_ISSUE",
  "language": "sn",
  "category": "technical_support",
  "root_cause": [
    "Intent not recognized or not in training data",
    "Network/technical issues need special handling"
  ],
  "training_examples": [
    {
      "input": "network yangu haisi kubatidza data",
      "correct_intent": "network_technical_issue",
      "correct_intent_id": 11,
      "keywords": ["network", "haisi kubatidza", "data not loading", "connection problem"]
    },
    {
      "input": "app yakabata, haina kubuza",
      "correct_intent": "network_technical_issue",
      "correct_intent_id": 11,
      "keywords": ["app crashed", "not responding"]
    }
  ],
  "conversation_template": {
    "step_1": {
      "user_says": "network yangu haisi kubatidza data",
      "bot_should": "Offer troubleshooting steps",
      "bot_response": "Ndinoyeurera! Tita ndiri: (1) Off data/wifi, wait 10 seconds, turn on. (2) Mushaisa app. (3) Try again. Zvinogara here?",
      "next_step": "wait_for_user_response"
    },
    "step_2_if_fixed": {
      "user_says": "Ah, zvinogara dzamwi!",
      "bot_should": "Confirm fix + close",
      "bot_response": "Ndinovuite! Muninga. Kana zvikabata zvakare, tipige support."
    },
    "step_2_if_NOT_fixed": {
      "user_says": "Still not working",
      "bot_should": "Escalate to technical support",
      "bot_response": "Tine server issue. Tirikushanda kuzireva. Tichashandisa mumaawa 1. Kete: #TECH001. Chingani."
    }
  }
}
```

---

## General Rules for Fix

### 🔴 **Avoid These:**
1. Don't ask for same info twice
2. Don't show generic help when user has specific issue
3. Don't leave user hanging - always escalate or resolve
4. Don't repeat bot responses
5. Don't misclassify money-related disputes

### 🟢 **Always Do This:**
1. Identify if it's a DISPUTE (money involved)
2. Collect details ONCE
3. Create ticket immediately after collecting
4. Track conversation state
5. Offer resolution, don't ask questions

---

## New Training Data to Add to Dataset

Add these to `retraining_dataset_FINAL_CONSOLIDATED.json`:

```json
[
  {
    "text": "ndatumirwa mai asi haina kusvika",
    "intent": "failed_transfer_dispute",
    "language": "sn",
    "category": "dispute_resolution",
    "severity": "high"
  },
  {
    "text": "ndatenga airtime mari yabviswa muakaundi asi hakuna airtime yasvika",
    "intent": "airtime_failed_dispute",
    "language": "sn",
    "category": "dispute_resolution",
    "severity": "high"
  },
  {
    "text": "network yangu haisi kubatidza data",
    "intent": "network_technical_issue",
    "language": "sn",
    "category": "technical_support",
    "severity": "medium"
  },
  {
    "text": "money deducted but airtime didn't arrive",
    "intent": "airtime_failed_dispute",
    "language": "en",
    "category": "dispute_resolution",
    "severity": "high"
  },
  {
    "text": "I sent money but it didn't arrive",
    "intent": "failed_transfer_dispute",
    "language": "en",
    "category": "dispute_resolution",
    "severity": "high"
  }
]
```
