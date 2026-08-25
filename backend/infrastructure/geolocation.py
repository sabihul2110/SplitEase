# backend/infrastructure/geolocation.py
"""
Coarse, IP-based geolocation for admin signup notifications.

Deliberately NOT device GPS location — this only resolves what any web
server already sees (the request's source IP) to a rough city/region/
country. No permission prompt, no device data, nothing beyond what's
already implicit in "a request arrived from this IP."
"""

import ipaddress
import logging
import requests

logger = logging.getLogger("splitease.geolocation")


def _is_public_ip(ip: str) -> bool:
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return False
    return not (addr.is_private or addr.is_loopback or addr.is_link_local or addr.is_reserved)


def get_ip_location(ip: str) -> str | None:
    """
    Returns a short "City, Region, Country" string for a public IP, or
    None if the IP is local/private (dev/testing) or the lookup fails.
    Never raises — a broken lookup should never block signup.
    """
    if not ip or not _is_public_ip(ip):
        return None

    try:
        resp = requests.get(f"https://ipapi.co/{ip}/json/", timeout=4)
        resp.raise_for_status()
        data = resp.json()
        if data.get("error"):
            return None
        parts = [p for p in (data.get("city"), data.get("region"), data.get("country_name")) if p]
        return ", ".join(parts) if parts else None
    except requests.exceptions.RequestException as e:
        logger.warning("IP geolocation lookup failed for %s: %s", ip, str(e))
        return None