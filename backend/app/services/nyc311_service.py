"""
NYC 311 data ingestion and normalization service.

The NYC 311 dataset is used as a reference/demo civic-data layer
for GIS and analytics. It is intentionally kept separate from
live CivicPulse complaints.
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

import pandas as pd


# -------------------------------------------------------------------
# Category normalization
# -------------------------------------------------------------------

CATEGORY_MAP = {
    # Roads / infrastructure
    "Street Condition": "Pothole",
    "Sidewalk Condition": "Pothole",
    "Pothole": "Pothole",

    # Street lighting
    "Street Light Condition": "Street Light",

    # Water / drainage
    "WATER LEAK": "Water / Drainage",
    "Water Maintenance": "Water / Drainage",
    "Water System": "Water / Drainage",
    "Sewer": "Water / Drainage",

    # Sanitation
    "UNSANITARY CONDITION": "Garbage / Sanitation",
    "Dirty Condition": "Garbage / Sanitation",
    "Illegal Dumping": "Garbage / Sanitation",
    "Overflowing Litter Baskets": "Garbage / Sanitation",

    # Parks / trees
    "Damaged Tree": "Parks / Trees",
    "Overgrown Tree/Branches": "Parks / Trees",
    "Dead/Dying Tree": "Parks / Trees",

    # Traffic
    "Traffic Signal Condition": "Traffic",
    "Street Sign - Damaged": "Traffic",
    "Street Sign - Missing": "Traffic",
    "Blocked Driveway": "Traffic",
    "Illegal Parking": "Traffic",

    # Noise
    "Noise": "Noise",
    "Noise - Residential": "Noise",
    "Noise - Street/Sidewalk": "Noise",
    "Noise - Vehicle": "Noise",

    # Other
    "Graffiti": "Graffiti",
}


def normalize_category(complaint_type: str | None) -> str:
    """
    Convert an NYC 311 complaint type into a CivicPulse
    broad category while preserving the original type separately.
    """

    if not complaint_type:
        return "Other"

    complaint_type = complaint_type.strip()

    return CATEGORY_MAP.get(
        complaint_type,
        "Other",
    )


# -------------------------------------------------------------------
# Date handling
# -------------------------------------------------------------------

def parse_datetime(value) -> datetime | None:
    """Convert an NYC date value into a timezone-aware UTC datetime."""

    if pd.isna(value):
        return None

    parsed = pd.to_datetime(value, errors="coerce")

    if pd.isna(parsed):
        return None

    if parsed.tzinfo is None:
        parsed = parsed.tz_localize("UTC")
    else:
        parsed = parsed.tz_convert("UTC")

    return parsed.to_pydatetime()


# -------------------------------------------------------------------
# Record normalization
# -------------------------------------------------------------------

def normalize_record(row: dict) -> dict:
    """Convert one NYC 311 CSV row into a CivicPulse document."""

    complaint_type = row.get("complaint_type")

    latitude = row.get("latitude")
    longitude = row.get("longitude")

    lat = float(latitude) if pd.notna(latitude) else None
    lng = float(longitude) if pd.notna(longitude) else None

    created_at = parse_datetime(
        row.get("created_date")
    )

    closed_at = parse_datetime(
        row.get("closed_date")
    )

    return {
        "source": "NYC_311",

        "source_id": str(
            row.get("unique_key")
        ),

        # CivicPulse normalized category
        "category": normalize_category(
            complaint_type
        ),

        # Preserve original NYC category
        "subcategory": (
            str(complaint_type).strip()
            if pd.notna(complaint_type)
            else None
        ),

        "description": (
            str(row.get("descriptor")).strip()
            if pd.notna(row.get("descriptor"))
            else None
        ),

        "descriptor_2": (
            str(row.get("descriptor_2")).strip()
            if pd.notna(row.get("descriptor_2"))
            else None
        ),

        "status": (
            str(row.get("status")).strip()
            if pd.notna(row.get("status"))
            else "Unknown"
        ),

        "agency": (
            str(row.get("agency")).strip()
            if pd.notna(row.get("agency"))
            else None
        ),

        "agency_name": (
            str(row.get("agency_name")).strip()
            if pd.notna(row.get("agency_name"))
            else None
        ),

        "location_type": (
            str(row.get("location_type")).strip()
            if pd.notna(row.get("location_type"))
            else None
        ),

        "location": {
            "lat": lat,
            "lng": lng,
            "address": (
                str(row.get("incident_address")).strip()
                if pd.notna(row.get("incident_address"))
                else None
            ),
            "borough": (
                str(row.get("borough")).strip()
                if pd.notna(row.get("borough"))
                else None
            ),
            "city": (
                str(row.get("city")).strip()
                if pd.notna(row.get("city"))
                else None
            ),
            "zip": (
                str(row.get("incident_zip")).split(".")[0]
                if pd.notna(row.get("incident_zip"))
                else None
            ),
        },

        "street_name": (
            str(row.get("street_name")).strip()
            if pd.notna(row.get("street_name"))
            else None
        ),

        "created_at": created_at,
        "closed_at": closed_at,

        "resolution_description": (
            str(row.get("resolution_description")).strip()
            if pd.notna(row.get("resolution_description"))
            else None
        ),

        "ingested_at": datetime.now(
            timezone.utc
        ),
    }


# -------------------------------------------------------------------
# CSV loading
# -------------------------------------------------------------------

def load_nyc_311_csv(
    file_path: str | Path,
) -> list[dict]:
    """
    Load and normalize an NYC 311 CSV file.

    This function intentionally loads only the manageable sample
    selected for CivicPulse, not the original 14.7 GB export.
    """

    file_path = Path(file_path)

    if not file_path.exists():
        raise FileNotFoundError(
            f"NYC 311 file not found: {file_path}"
        )

    df = pd.read_csv(
        file_path,
        low_memory=False,
    )

    records = [
        normalize_record(row)
        for row in df.to_dict(
            orient="records"
        )
    ]

    return records