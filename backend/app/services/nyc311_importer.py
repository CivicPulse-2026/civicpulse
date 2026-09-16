"""
Import normalized NYC 311 records into MongoDB.

NYC 311 is stored separately from live CivicPulse complaints.
"""

from __future__ import annotations

from pathlib import Path

from app.services.nyc311_service import load_nyc_311_csv


async def import_nyc_311(
    db,
    file_path: str | Path,
    batch_size: int = 500,
) -> dict:
    """
    Load the NYC 311 CSV, normalize it, and insert it into
    the demo_service_requests collection.
    """

    records = load_nyc_311_csv(file_path)

    collection = db.demo_service_requests

    inserted = 0
    skipped = 0

    # Avoid duplicate imports based on the official NYC key.
    existing_ids = set()

    cursor = collection.find(
        {},
        {"source_id": 1},
    )

    async for document in cursor:
        source_id = document.get("source_id")

        if source_id:
            existing_ids.add(source_id)

    batch = []

    for record in records:
        source_id = record.get("source_id")

        if not source_id:
            skipped += 1
            continue

        if source_id in existing_ids:
            skipped += 1
            continue

        batch.append(record)
        existing_ids.add(source_id)

        if len(batch) >= batch_size:
            result = await collection.insert_many(
                batch,
                ordered=False,
            )

            inserted += len(result.inserted_ids)
            batch = []

    if batch:
        result = await collection.insert_many(
            batch,
            ordered=False,
        )

        inserted += len(result.inserted_ids)

    # Useful indexes for map and analytics queries.
    await collection.create_index(
        "source_id",
        unique=True,
    )

    await collection.create_index(
        "category",
    )

    await collection.create_index(
        "status",
    )

    await collection.create_index(
        "agency",
    )

    await collection.create_index(
        "created_at",
    )

    await collection.create_index(
        [
            ("location.lat", 1),
            ("location.lng", 1),
        ],
    )

    return {
        "total_records": len(records),
        "inserted": inserted,
        "skipped": skipped,
        "collection": "demo_service_requests",
    }