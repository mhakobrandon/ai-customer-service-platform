"""
BANKING77 adapter
Maps HuggingFace BANKING77 intents into local chatbot intents.
"""

from collections import defaultdict
from typing import Dict, List

from app.services.intent_catalog import INTENT_LABELS


BANKING77_TO_LOCAL_INTENT: Dict[str, str] = {
    "balance_not_updated_after_cheque_or_bank_transfer": "balance_inquiry",
    "beneficiary_not_allowed": "transfer_money",
    "beneficiary_not_verified": "transfer_money",
    "cash_withdrawal": "mobile_money",
    "cash_withdrawal_charge": "mobile_wallet_fees",
    "cash_withdrawal_not_recognised": "transaction_dispute",
    "cash_withdrawal_not_recognized": "transaction_dispute",
    "change_phone_number": "update_profile",
    "compromised_card": "security_pin",
    "contactless_not_working": "network_connectivity",
    "declined_bank_transfer": "transfer_money",
    "declined_cash_withdrawal": "mobile_money",
    "declined_transfer": "transfer_money",
    "direct_debit_not_recognised": "transaction_dispute",
    "direct_debit_not_recognized": "transaction_dispute",
    "exchange_fee": "mobile_wallet_fees",
    "extra_charge_on_statement": "transaction_dispute",
    "forgotten_password": "password_reset",
    "pending_bank_transfer": "transfer_money",
    "pending_cash_withdrawal": "mobile_money",
    "pending_transfer": "transfer_money",
    "refund_not_showing_up": "transaction_dispute",
    "request_refund": "transaction_dispute",
    "supported_cards_and_currencies": "card_request",
    "top_up_by_bank_card": "bill_payment",
    "top_up_by_bank_transfer": "bill_payment",
    "transfer_not_received": "transaction_dispute",
    "verify_identity": "security_pin",
    "verify_source_of_funds": "security_pin",
    "virtual_card": "card_request",
    "wrong_exchange_rate_for_cash_withdrawal": "transaction_dispute",
    "wrong_exchange_rate_for_bank_transfer": "transaction_dispute",
}


def build_banking77_examples(max_per_intent: int = 120) -> List[Dict]:
    try:
        from datasets import load_dataset
    except Exception:
        return []

    dataset = load_dataset("banking77")
    train_split = dataset["train"]
    label_names = train_split.features["label"].names

    grouped: Dict[str, List[Dict]] = defaultdict(list)

    for row in train_split:
        source_intent = label_names[row["label"]]
        target_intent = BANKING77_TO_LOCAL_INTENT.get(source_intent)
        if not target_intent:
            continue
        if target_intent not in INTENT_LABELS:
            continue

        text = (row.get("text") or "").strip()
        if not text:
            continue

        grouped[target_intent].append(
            {
                "text": text,
                "intent": target_intent,
                "language": "en",
            }
        )

    examples: List[Dict] = []
    for intent, rows in grouped.items():
        examples.extend(rows[:max_per_intent])

    return examples
