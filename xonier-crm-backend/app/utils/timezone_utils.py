from datetime import timedelta, timezone, tzinfo
import re
from typing import Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

_ALIAS_MAP = {
    "utc": "UTC",
    "gmt": "UTC",
    "z": "UTC",
    "brazil": "America/Sao_Paulo",
    "brasil": "America/Sao_Paulo",
    "brt": "America/Sao_Paulo",
    "brst": "America/Sao_Paulo",
    "sao paulo": "America/Sao_Paulo",
    "são paulo": "America/Sao_Paulo",
    "sao_paulo": "America/Sao_Paulo",
    "brasilia": "America/Sao_Paulo",
    "brasília": "America/Sao_Paulo",
    "ist": "Asia/Kolkata",
    "india": "Asia/Kolkata",
    "kolkata": "Asia/Kolkata",
    "calcutta": "Asia/Kolkata",
    "mumbai": "Asia/Kolkata",
    "new delhi": "Asia/Kolkata",
    "est": "America/New_York",
    "edt": "America/New_York",
    "cst": "America/Chicago",
    "cdt": "America/Chicago",
    "mst": "America/Denver",
    "mdt": "America/Denver",
    "pst": "America/Los_Angeles",
    "pdt": "America/Los_Angeles",
    "bst": "Europe/London",
    "cet": "Europe/Paris",
    "gst": "Asia/Dubai",
    "jst": "Asia/Tokyo",
    "sgt": "Asia/Singapore",
    "aest": "Australia/Sydney",
}

_OFFSET_RE = re.compile(
    r"^(?:(?:UTC|GMT)\s*)?([+-])\s*(\d{1,2})(?::?(\d{2}))?$",
    re.IGNORECASE,
)


def _normalize_iana_candidate(raw: str) -> str:
    cleaned = re.sub(r"\s+", " ", raw.strip())
    lowered = cleaned.lower()
    if lowered in _ALIAS_MAP:
        return _ALIAS_MAP[lowered]

    # Match UI option labels such as "(GMT-3:00) São Paulo, Brazil"
    for alias, iana in _ALIAS_MAP.items():
        if alias in lowered and len(alias) >= 4:
            return iana

    if "/" in cleaned:
        parts = [p.strip().replace(" ", "_") for p in cleaned.split("/")]
        candidate = "/".join(parts)
        # Strip accents on common city typos like "America/São_Paulo"
        if candidate.lower() in {"america/são_paulo", "america/sao_paulo"}:
            return "America/Sao_Paulo"
        return candidate

    return cleaned


def validate_timezone(value):
    """Return a clean IANA timezone name (e.g. ``America/Sao_Paulo``) or None.

    Blank values are treated as "not set". Anything that is not a valid IANA
    timezone (after normalizing common aliases and spaces) is rejected.
    """
    if value is None:
        return None
    raw = str(value).strip()
    if not raw:
        return None

    candidate = _normalize_iana_candidate(raw)
    try:
        ZoneInfo(candidate)
    except (ZoneInfoNotFoundError, ValueError, OSError):
        raise ValueError(
            "Invalid timezone. Use an IANA name such as America/Sao_Paulo or Asia/Kolkata"
        )
    return candidate


def resolve_timezone(raw: Optional[str]) -> tzinfo:
    """Resolve a stored company timezone string into a ``tzinfo`` object.

    Handles IANA names, common aliases/labels, and fixed offsets (e.g. ``GMT-3``,
    ``UTC+5:30``, ``-03:00``), safely falling back to UTC for unrecognized legacy
    values so actions are never blocked.
    """
    if raw is None:
        return timezone.utc
    text = str(raw).strip()
    if not text:
        return timezone.utc

    candidate = _normalize_iana_candidate(text)
    try:
        return ZoneInfo(candidate)
    except (ZoneInfoNotFoundError, ValueError, OSError):
        pass

    match = _OFFSET_RE.match(text)
    if match:
        sign_str, hours_str, mins_str = match.groups()
        hours = int(hours_str)
        mins = int(mins_str or 0)
        total_minutes = hours * 60 + mins
        if sign_str == "-":
            total_minutes = -total_minutes
        if -14 * 60 <= total_minutes <= 14 * 60 and 0 <= mins < 60:
            return timezone(timedelta(minutes=total_minutes))

    return timezone.utc
