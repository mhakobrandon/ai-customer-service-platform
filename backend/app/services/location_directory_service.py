"""
Persistent location directory service for admin-managed location records.
Stores data in backend/generated/location_directory.json.
"""

from __future__ import annotations

from pathlib import Path
from typing import Dict, List, Optional
import json
import uuid

from app.services.location_fallback_data import LOCATION_FALLBACK_DATA


LOCATION_TYPES = {"atm", "bank", "econet_shop", "netone_shop", "cashout_agent", "innbucks_outlet", "telecash_shop", "agency_banking"}


class LocationDirectoryService:
    def __init__(self) -> None:
        backend_root = Path(__file__).resolve().parents[2]
        self.data_file = backend_root / "generated" / "location_directory.json"
        self.data_file.parent.mkdir(parents=True, exist_ok=True)
        self._ensure_seeded()

    def _ensure_seeded(self) -> None:
        if self.data_file.exists():
            return

        seeded: Dict[str, List[Dict]] = {"items": []}
        for location_type, rows in LOCATION_FALLBACK_DATA.items():
            for row in rows:
                seeded["items"].append(
                    {
                        "id": str(uuid.uuid4()),
                        "location_type": location_type,
                        "name": row.get("name"),
                        "address": row.get("address"),
                        "contact": row.get("contact"),
                        "opening_hours": row.get("opening_hours"),
                        "latitude": row.get("latitude"),
                        "longitude": row.get("longitude"),
                        "provider": row.get("provider"),
                        "is_active": True,
                    }
                )
        self._write_all(seeded)

    def _read_all(self) -> Dict[str, List[Dict]]:
        try:
            with self.data_file.open("r", encoding="utf-8") as handle:
                data = json.load(handle)
                if isinstance(data, dict) and isinstance(data.get("items"), list):
                    return data
        except Exception:
            pass
        return {"items": []}

    def _write_all(self, data: Dict[str, List[Dict]]) -> None:
        with self.data_file.open("w", encoding="utf-8") as handle:
            json.dump(data, handle, ensure_ascii=False, indent=2)

    @staticmethod
    def _to_bool(value) -> bool:
        if isinstance(value, bool):
            return value
        if value is None:
            return True
        text = str(value).strip().lower()
        return text in {"1", "true", "yes", "y", "active"}

    def list_items(self, location_type: Optional[str] = None, active_only: bool = False) -> List[Dict]:
        data = self._read_all()
        items = data.get("items", [])

        if location_type:
            items = [item for item in items if item.get("location_type") == location_type]
        if active_only:
            items = [item for item in items if item.get("is_active", True)]

        return items

    def get_item(self, item_id: str) -> Optional[Dict]:
        items = self._read_all().get("items", [])
        for item in items:
            if item.get("id") == item_id:
                return item
        return None

    def create_item(self, payload: Dict) -> Dict:
        data = self._read_all()
        item = {
            "id": str(uuid.uuid4()),
            "location_type": payload["location_type"],
            "name": payload["name"],
            "address": payload.get("address"),
            "contact": payload.get("contact"),
            "opening_hours": payload.get("opening_hours"),
            "latitude": float(payload["latitude"]),
            "longitude": float(payload["longitude"]),
            "provider": payload.get("provider"),
            "is_active": self._to_bool(payload.get("is_active", True)),
        }
        data["items"].append(item)
        self._write_all(data)
        return item

    def update_item(self, item_id: str, payload: Dict) -> Optional[Dict]:
        data = self._read_all()
        items = data.get("items", [])

        for item in items:
            if item.get("id") == item_id:
                for field in [
                    "location_type",
                    "name",
                    "address",
                    "contact",
                    "opening_hours",
                    "provider",
                    "is_active",
                ]:
                    if field in payload and payload[field] is not None:
                        item[field] = payload[field]
                if "latitude" in payload and payload["latitude"] is not None:
                    item["latitude"] = float(payload["latitude"])
                if "longitude" in payload and payload["longitude"] is not None:
                    item["longitude"] = float(payload["longitude"])

                self._write_all(data)
                return item

        return None

    def delete_item(self, item_id: str) -> bool:
        data = self._read_all()
        items = data.get("items", [])
        initial_len = len(items)
        items = [item for item in items if item.get("id") != item_id]

        if len(items) == initial_len:
            return False

        data["items"] = items
        self._write_all(data)
        return True

    def upsert_items(self, incoming_items: List[Dict]) -> Dict:
        data = self._read_all()
        items = data.get("items", [])

        created = 0
        updated = 0
        skipped = 0

        index = {}
        for item in items:
            key = (
                str(item.get("location_type", "")).strip().lower(),
                str(item.get("name", "")).strip().lower(),
                str(item.get("address", "")).strip().lower(),
            )
            index[key] = item

        validation = self.validate_rows(incoming_items)
        skipped = validation["invalid_count"]

        for normalized in validation["valid_items"]:
            location_type = normalized["location_type"]
            name = normalized["name"]
            address = normalized["address"] or ""

            key = (location_type.lower(), name.lower(), address.lower())
            existing = index.get(key)

            if existing:
                for field, value in normalized.items():
                    existing[field] = value
                updated += 1
            else:
                new_item = {
                    "id": str(uuid.uuid4()),
                    **normalized,
                }
                items.append(new_item)
                index[key] = new_item
                created += 1

        data["items"] = items
        self._write_all(data)

        return {
            "created": created,
            "updated": updated,
            "skipped": skipped,
            "total_after": len(items),
        }

    def validate_rows(self, incoming_items: List[Dict]) -> Dict:
        valid_items: List[Dict] = []
        invalid_rows: List[Dict] = []

        for idx, payload in enumerate(incoming_items, start=1):
            location_type = str(payload.get("location_type", "")).strip()
            name = str(payload.get("name", "")).strip()
            address = str(payload.get("address", "")).strip()

            row_errors = []

            if not location_type:
                row_errors.append("location_type is required")
            elif location_type not in LOCATION_TYPES:
                row_errors.append(f"location_type must be one of {sorted(LOCATION_TYPES)}")

            if not name:
                row_errors.append("name is required")

            try:
                latitude = float(payload.get("latitude"))
                longitude = float(payload.get("longitude"))
            except (TypeError, ValueError):
                latitude = None
                longitude = None
                row_errors.append("latitude and longitude must be valid numbers")

            if row_errors:
                invalid_rows.append(
                    {
                        "row": idx,
                        "errors": row_errors,
                        "data": payload,
                    }
                )
                continue

            valid_items.append(
                {
                    "location_type": location_type,
                    "name": name,
                    "address": address or None,
                    "contact": payload.get("contact") or None,
                    "opening_hours": payload.get("opening_hours") or None,
                    "latitude": latitude,
                    "longitude": longitude,
                    "provider": payload.get("provider") or None,
                    "is_active": self._to_bool(payload.get("is_active", True)),
                }
            )

        return {
            "valid_items": valid_items,
            "invalid_rows": invalid_rows,
            "valid_count": len(valid_items),
            "invalid_count": len(invalid_rows),
            "total_count": len(incoming_items),
        }


location_directory_service = LocationDirectoryService()
