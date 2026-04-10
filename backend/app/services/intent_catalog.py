from typing import Dict, List


INTENT_LABELS: List[str] = [
    "balance_inquiry",
    "transaction_history",
    "transfer_money",
    "account_statement",
    "password_reset",
    "update_profile",
    "loan_inquiry",
    "bill_payment",
    "mobile_money",
    "transaction_dispute",
    "security_pin",
    "network_connectivity",
    "mobile_wallet_fees",
    "account_closure",
    "account_opening",
    "card_request",
    "atm_location",
    "branch_location",
    "escalation_request",
    "general_inquiry",
    "greeting",
    "goodbye",
    "complaint",
]


INTENT_ALIASES: Dict[str, str] = {
    "pay_bill": "bill_payment",
    "new_account": "account_opening",
}


def normalize_intent(intent: str) -> str:
    cleaned_intent = (intent or "").strip()
    return INTENT_ALIASES.get(cleaned_intent, cleaned_intent)
