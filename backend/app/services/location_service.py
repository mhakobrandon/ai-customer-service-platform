"""
Location Service
Provides nearest live locations for ATMs, banks, mobile network shops, and cash-out agents.
Data source: OpenStreetMap (Nominatim + Overpass API).
"""

from __future__ import annotations

from typing import Dict, List, Optional, Tuple
import math
import re
import logging

import httpx
from app.services.location_directory_service import location_directory_service

logger = logging.getLogger(__name__)


class LocationService:
    NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
    OVERPASS_URL = "https://overpass-api.de/api/interpreter"

    def __init__(self) -> None:
        self.user_agent = "ai-customer-service-platform/1.0 (support-locations)"

    @staticmethod
    def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        radius = 6371.0
        d_lat = math.radians(lat2 - lat1)
        d_lon = math.radians(lon2 - lon1)
        a = (
            math.sin(d_lat / 2) ** 2
            + math.cos(math.radians(lat1))
            * math.cos(math.radians(lat2))
            * math.sin(d_lon / 2) ** 2
        )
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return radius * c

    @staticmethod
    def _extract_area_from_query(query: str) -> Optional[str]:
        if not query:
            return None

        text = query.strip()
        text_lower = text.lower()

        if "near me" in text_lower:
            return None

        explicit_match = re.search(r"\b(?:in|near|around|at|from)\s+([a-zA-Z0-9\s,'-]{2,})", text, flags=re.IGNORECASE)
        if explicit_match:
            candidate = explicit_match.group(1).strip(" .,!?")
            if candidate:
                return candidate

        cleaned = re.sub(
            r"\b(nearest|nearby|closest|near|around|find|where|is|the|please|show|me|location|locations|atm|bank|branch|econet|netone|shop|agent|cash\s*out|cashout|ecocash|onemoney|innbucks|inn\s*bucks|telecash|telecel|agency\s*banking|agency|simbisa)\b",
            " ",
            text_lower,
            flags=re.IGNORECASE,
        )
        cleaned = re.sub(r"\s+", " ", cleaned).strip(" .,!?")
        return cleaned or None

    async def _geocode(self, area: str) -> Optional[Tuple[float, float, str]]:
        if not area:
            return None

        query = f"{area}, Zimbabwe"
        headers = {"User-Agent": self.user_agent}
        params = {
            "q": query,
            "format": "jsonv2",
            "limit": 1,
            "addressdetails": 1,
        }

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.get(self.NOMINATIM_URL, params=params, headers=headers)
                response.raise_for_status()
                payload = response.json()
        except Exception as exc:
            logger.error(f"Geocode request failed: {exc}")
            return None

        if not payload:
            return None

        top = payload[0]
        return float(top["lat"]), float(top["lon"]), top.get("display_name", area)

    @staticmethod
    def _build_overpass_query(location_type: str, lat: float, lon: float, radius_m: int = 8000) -> str:
        selectors = {
            "atm": [
                'node["amenity"="atm"]',
                'way["amenity"="atm"]',
                'relation["amenity"="atm"]',
            ],
            "bank": [
                'node["amenity"="bank"]',
                'way["amenity"="bank"]',
                'relation["amenity"="bank"]',
            ],
            "econet_shop": [
                'node["shop"="mobile_phone"]["name"~"Econet|EcoCash",i]',
                'way["shop"="mobile_phone"]["name"~"Econet|EcoCash",i]',
                'relation["shop"="mobile_phone"]["name"~"Econet|EcoCash",i]',
            ],
            "netone_shop": [
                'node["shop"="mobile_phone"]["name"~"NetOne",i]',
                'way["shop"="mobile_phone"]["name"~"NetOne",i]',
                'relation["shop"="mobile_phone"]["name"~"NetOne",i]',
            ],
            "cashout_agent": [
                'node["amenity"="money_transfer"]',
                'way["amenity"="money_transfer"]',
                'relation["amenity"="money_transfer"]',
                'node["name"~"agent|cash\\s*out|ecocash|onemoney|innbucks",i]',
                'node["operator"~"EcoCash|OneMoney|InnBucks|Econet|NetOne",i]',
            ],
            "innbucks_outlet": [
                'node["shop"="mobile_phone"]["name"~"InnBucks|Inn Bucks|Simbisa",i]',
                'way["shop"="mobile_phone"]["name"~"InnBucks|Inn Bucks|Simbisa",i]',
                'node["operator"~"InnBucks|Simbisa",i]',
            ],
            "telecash_shop": [
                'node["shop"="mobile_phone"]["name"~"Telecash|TeleCash|Telecel",i]',
                'way["shop"="mobile_phone"]["name"~"Telecash|TeleCash|Telecel",i]',
                'node["operator"~"Telecash|Telecel",i]',
            ],
            "agency_banking": [
                'node["amenity"="bank"]["name"~"agency|agent banking",i]',
                'way["amenity"="bank"]["name"~"agency|agent banking",i]',
                'node["name"~"OK\\s+Zimbabwe|TM\\s+Pick|Spar",i]["amenity"="money_transfer"]',
            ],
        }

        query_selectors = selectors.get(location_type, selectors["bank"])
        body = "\n".join(
            f"  {selector}(around:{radius_m},{lat},{lon});" for selector in query_selectors
        )

        return f"""
[out:json][timeout:25];
(
{body}
);
out center tags;
""".strip()

    @staticmethod
    def _format_address(tags: Dict) -> Optional[str]:
        address_parts = [
            tags.get("addr:housenumber"),
            tags.get("addr:street"),
            tags.get("addr:suburb"),
            tags.get("addr:city") or tags.get("addr:town") or tags.get("addr:village"),
        ]
        formatted = ", ".join(part for part in address_parts if part)
        return formatted or tags.get("addr:full")

    async def _search_overpass(self, location_type: str, lat: float, lon: float) -> List[Dict]:
        query = self._build_overpass_query(location_type, lat, lon)
        headers = {"User-Agent": self.user_agent}

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(self.OVERPASS_URL, data={"data": query}, headers=headers)
                response.raise_for_status()
                payload = response.json()
        except Exception as exc:
            logger.error(f"Overpass request failed: {exc}")
            return []

        elements = payload.get("elements", [])
        results: List[Dict] = []

        for element in elements:
            tags = element.get("tags", {})
            item_lat = element.get("lat") or (element.get("center") or {}).get("lat")
            item_lon = element.get("lon") or (element.get("center") or {}).get("lon")

            if item_lat is None or item_lon is None:
                continue

            distance_km = self._haversine_km(lat, lon, float(item_lat), float(item_lon))
            results.append(
                {
                    "name": tags.get("name") or tags.get("brand") or "Unnamed location",
                    "type": location_type,
                    "distance_km": round(distance_km, 2),
                    "address": self._format_address(tags),
                    "contact": tags.get("phone") or tags.get("contact:phone"),
                    "opening_hours": tags.get("opening_hours"),
                    "latitude": float(item_lat),
                    "longitude": float(item_lon),
                    "map_url": f"https://www.openstreetmap.org/?mlat={item_lat}&mlon={item_lon}#map=17/{item_lat}/{item_lon}",
                }
            )

        results.sort(key=lambda row: row["distance_km"])

        deduped: List[Dict] = []
        seen = set()
        for result in results:
            key = (result["name"].lower(), result["latitude"], result["longitude"])
            if key in seen:
                continue
            seen.add(key)
            deduped.append(result)

        return deduped

    def _fallback_candidates(self, location_type: str, lat: float, lon: float) -> List[Dict]:
        entries = location_directory_service.list_items(location_type=location_type, active_only=True)
        results: List[Dict] = []

        for entry in entries:
            entry_lat = float(entry["latitude"])
            entry_lon = float(entry["longitude"])
            distance_km = self._haversine_km(lat, lon, entry_lat, entry_lon)
            results.append(
                {
                    "name": entry["name"],
                    "type": location_type,
                    "distance_km": round(distance_km, 2),
                    "address": entry.get("address"),
                    "contact": entry.get("contact"),
                    "opening_hours": entry.get("opening_hours"),
                    "latitude": entry_lat,
                    "longitude": entry_lon,
                    "map_url": f"https://www.openstreetmap.org/?mlat={entry_lat}&mlon={entry_lon}#map=17/{entry_lat}/{entry_lon}",
                    "source": "curated_fallback",
                }
            )

        results.sort(key=lambda row: row["distance_km"])
        return results

    def _merge_live_and_fallback(self, live_results: List[Dict], fallback_results: List[Dict], limit: int) -> List[Dict]:
        combined = []

        for row in live_results:
            enriched = dict(row)
            enriched["source"] = enriched.get("source") or "openstreetmap"
            combined.append(enriched)

        combined.extend(fallback_results)

        combined.sort(key=lambda row: row["distance_km"])

        deduped: List[Dict] = []
        seen = set()
        for row in combined:
            key = (row["name"].strip().lower(), round(float(row["latitude"]), 4), round(float(row["longitude"]), 4))
            if key in seen:
                continue
            seen.add(key)
            deduped.append(row)

        # Prefer entries with richer details for top responses
        deduped.sort(
            key=lambda row: (
                row["distance_km"],
                0 if row.get("address") else 1,
                0 if row.get("contact") else 1,
                0 if row.get("opening_hours") else 1,
            )
        )

        return deduped[: max(1, min(limit, 10))]

    async def find_nearest_locations(self, query: str, location_type: str, limit: int = 5) -> Dict:
        area = self._extract_area_from_query(query)
        if not area:
            return {
                "status": "missing_area",
                "message": "Please provide a suburb, town, or city.",
                "results": [],
            }

        geocoded = await self._geocode(area)
        if not geocoded:
            return {
                "status": "location_not_found",
                "message": "Could not resolve location from your query.",
                "results": [],
            }

        lat, lon, resolved_location = geocoded
        nearby = await self._search_overpass(location_type, lat, lon)
        fallback = self._fallback_candidates(location_type, lat, lon)
        sliced = self._merge_live_and_fallback(nearby, fallback, limit)

        return {
            "status": "ok",
            "query": query,
            "location_type": location_type,
            "resolved_location": resolved_location,
            "center": {"lat": lat, "lon": lon},
            "count": len(sliced),
            "results": sliced,
            "source": "OpenStreetMap (Nominatim + Overpass) + curated fallback",
        }


location_service = LocationService()
