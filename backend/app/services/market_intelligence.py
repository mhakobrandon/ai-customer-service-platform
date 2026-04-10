"""
Market intelligence data for providers, fees, bundles and channels.
Reads from backend/generated/market_rates.json for live-updatable rates.
Used for customer comparison views and integration readiness endpoints.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List

logger = logging.getLogger(__name__)

_RATES_FILE = Path(__file__).resolve().parents[2] / "generated" / "market_rates.json"

SUPPORTED_PROVIDERS: List[Dict] = [
    {"provider": "EcoCash", "type": "mno"},
    {"provider": "OneMoney", "type": "mno"},
    {"provider": "InnBucks", "type": "mno"},
    {"provider": "CBZ", "type": "bank"},
    {"provider": "Steward Bank", "type": "bank"},
    {"provider": "NMB", "type": "bank"},
    {"provider": "Stanbic", "type": "bank"},
]

# Fallback values used if the JSON file is unavailable
_FALLBACK_FEES: List[Dict] = [
    {"provider": "EcoCash", "send_fee_percent": 2.5, "cashout_fee_percent": 2.0, "zipit_fee_usd": 2.0},
    {"provider": "OneMoney", "send_fee_percent": 2.2, "cashout_fee_percent": 1.9, "zipit_fee_usd": 2.0},
    {"provider": "InnBucks", "send_fee_percent": 2.0, "cashout_fee_percent": 1.8, "zipit_fee_usd": 1.8},
    {"provider": "CBZ", "send_fee_percent": 1.9, "cashout_fee_percent": 1.6, "zipit_fee_usd": 1.5},
    {"provider": "Steward Bank", "send_fee_percent": 2.1, "cashout_fee_percent": 1.7, "zipit_fee_usd": 1.5},
    {"provider": "NMB", "send_fee_percent": 1.8, "cashout_fee_percent": 1.5, "zipit_fee_usd": 1.4},
    {"provider": "Stanbic", "send_fee_percent": 1.7, "cashout_fee_percent": 1.4, "zipit_fee_usd": 1.4},
]

_FALLBACK_BUNDLES: List[Dict] = [
    {"provider": "Econet", "voice_10min_usd": 0.70, "data_1gb_usd": 2.00, "data_5gb_usd": 7.50},
    {"provider": "NetOne", "voice_10min_usd": 0.60, "data_1gb_usd": 1.80, "data_5gb_usd": 7.00},
    {"provider": "Telecel", "voice_10min_usd": 0.55, "data_1gb_usd": 1.70, "data_5gb_usd": 6.80},
]


def _read_rates() -> Dict:
    """Read current market rates from the JSON file."""
    try:
        if _RATES_FILE.exists():
            return json.loads(_RATES_FILE.read_text(encoding="utf-8"))
    except Exception as exc:
        logger.warning("Failed to read market rates file: %s", exc)
    return {}


def _write_rates(data: Dict) -> None:
    """Persist market rates to the JSON file."""
    _RATES_FILE.parent.mkdir(parents=True, exist_ok=True)
    _RATES_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def get_transaction_fees() -> List[Dict]:
    rates = _read_rates()
    return rates.get("transaction_fees") or _FALLBACK_FEES


def get_bundle_prices() -> List[Dict]:
    rates = _read_rates()
    return rates.get("bundle_prices") or _FALLBACK_BUNDLES


def get_rates_last_updated() -> str | None:
    rates = _read_rates()
    return rates.get("last_updated")


def update_transaction_fees(fees: List[Dict]) -> Dict:
    """Admin: update transaction fees and persist to file."""
    rates = _read_rates()
    rates["transaction_fees"] = fees
    rates["last_updated"] = datetime.now(timezone.utc).isoformat()
    rates["source"] = "admin-managed"
    _write_rates(rates)
    return rates


def update_bundle_prices(bundles: List[Dict]) -> Dict:
    """Admin: update bundle prices and persist to file."""
    rates = _read_rates()
    rates["bundle_prices"] = bundles
    rates["last_updated"] = datetime.now(timezone.utc).isoformat()
    rates["source"] = "admin-managed"
    _write_rates(rates)
    return rates


def get_lowest_fees_summary() -> Dict:
    fees = get_transaction_fees()
    lowest_send = min(fees, key=lambda row: row["send_fee_percent"])
    lowest_cashout = min(fees, key=lambda row: row["cashout_fee_percent"])
    lowest_zipit = min(fees, key=lambda row: row["zipit_fee_usd"])

    return {
        "lowest_send_fee": {
            "provider": lowest_send["provider"],
            "send_fee_percent": lowest_send["send_fee_percent"],
        },
        "lowest_cashout_fee": {
            "provider": lowest_cashout["provider"],
            "cashout_fee_percent": lowest_cashout["cashout_fee_percent"],
        },
        "lowest_zipit_fee": {
            "provider": lowest_zipit["provider"],
            "zipit_fee_usd": lowest_zipit["zipit_fee_usd"],
        },
    }


def get_lowest_bundle_summary() -> Dict:
    bundles = get_bundle_prices()
    lowest_voice = min(bundles, key=lambda row: row["voice_10min_usd"])
    lowest_1gb = min(bundles, key=lambda row: row["data_1gb_usd"])
    lowest_5gb = min(bundles, key=lambda row: row["data_5gb_usd"])

    return {
        "lowest_voice_bundle": {
            "provider": lowest_voice["provider"],
            "voice_10min_usd": lowest_voice["voice_10min_usd"],
        },
        "lowest_data_1gb": {
            "provider": lowest_1gb["provider"],
            "data_1gb_usd": lowest_1gb["data_1gb_usd"],
        },
        "lowest_data_5gb": {
            "provider": lowest_5gb["provider"],
            "data_5gb_usd": lowest_5gb["data_5gb_usd"],
        },
    }
