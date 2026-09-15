"""Seed the CivicPulse database with realistic sample data.

Run from the backend/ directory:
    python seed.py

Creates three demo accounts and a spread of complaints across NYC wards,
statuses, categories and ages so the analytics / map views have something
meaningful to show. Safe to re-run: it wipes the collections first.
"""

import asyncio
import random
from datetime import datetime, timedelta, timezone

from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.core.security import hash_password
from app.models.enums import CATEGORY_DEPARTMENT, Category, Status
from app.services.priority_engine import band_for_score, score_complaint

random.seed(42)


def now():
    return datetime.now(timezone.utc)


LOCATIONS = [
    (40.7580, -73.9855, "Times Square, Manhattan", "Manhattan-5"),
    (40.6782, -73.9442, "Bedford Ave, Brooklyn", "Brooklyn-8"),
    (40.7282, -73.7949, "Main St, Flushing, Queens", "Queens-7"),
    (40.8448, -73.8648, "Grand Concourse, Bronx", "Bronx-4"),
    (40.5795, -74.1502, "Richmond Ave, Staten Island", "Staten Island-2"),
    (40.7061, -74.0087, "Wall St, Manhattan", "Manhattan-1"),
    (40.6892, -74.0445, "Liberty View, Brooklyn", "Brooklyn-6"),
    (40.7420, -73.9890, "Flatiron District, Manhattan", "Manhattan-5"),
]

SAMPLE_COMPLAINTS = [
    (Category.WATER.value, "Major water main leak flooding the street near the bus stop, sewage smell reported.", 0.1),
    (Category.POTHOLE.value, "Deep pothole on the main road, several cars have been damaged.", 3),
    (Category.STREETLIGHT.value, "Street light out for a week, the whole block is dark at night and feels unsafe.", 7),
    (Category.TRAFFIC.value, "Traffic signal not working at a busy intersection, near accident this morning.", 0.5),
    (Category.GARBAGE.value, "Garbage has not been collected in two weeks, bins overflowing onto the sidewalk.", 14),
    (Category.GRAFFITI.value, "Graffiti on the park wall, needs cleaning.", 5),
    (Category.NOISE.value, "Loud construction noise starting before 6am every day.", 2),
    (Category.PARKS.value, "Fallen tree branch blocking the playground entrance after the storm.", 1),
    (Category.WATER.value, "Storm drain blocked, water pooling and flooding the corner.", 4),
    (Category.POTHOLE.value, "Cracked pavement widening near the school crossing.", 6),
    (Category.STREETLIGHT.value, "Flickering lamp post outside the community center.", 9),
    (Category.GARBAGE.value, "Illegal dumping of construction waste in the alley.", 10),
]

# Public placeholder images (Unsplash) so seeded complaints show a photo in the
# UI even before Cloudinary is configured. Real uploads replace these.
SAMPLE_PHOTOS = {
    Category.WATER.value: [
        "https://images.unsplash.com/photo-1583795128727-6ec3642408f8?w=800&q=80",
    ],
    Category.POTHOLE.value: [
        "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?w=800&q=80",
    ],
    Category.STREETLIGHT.value: [
        "https://images.unsplash.com/photo-1508233620467-f79f1e317a05?w=800&q=80",
    ],
    Category.GARBAGE.value: [
        "https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=800&q=80",
    ],
}

REPORTERS = [
    ("Maria Gonzalez", "maria.g@example.com"),
    ("James Carter", "j.carter@example.com"),
    ("Aisha Khan", "aisha.k@example.com"),
    ("David Chen", "d.chen@example.com"),
    ("Priya Nair", "priya.n@example.com"),
]


async def main():
    client = AsyncIOMotorClient(settings.mongodb_url)
    db = client[settings.database_name]

    for col in ["users", "complaints", "comments", "audit_events", "notes"]:
        await db[col].delete_many({})

    users = [
        {"name": "City Admin", "email": "admin@civicpulse.gov", "role": "admin",
         "city": "New York", "password": hash_password("admin123"), "created_at": now()},
        {"name": "Field Officer", "email": "officer@civicpulse.gov", "role": "officer",
         "city": "New York", "password": hash_password("officer123"), "created_at": now()},
        {"name": "Maria Gonzalez", "email": "citizen@civicpulse.gov", "role": "citizen",
         "city": "Brooklyn", "password": hash_password("citizen123"), "phone": "555-0101", "created_at": now()},
    ]
    await db.users.insert_many(users)
    print("Seeded users: admin@civicpulse.gov / officer@civicpulse.gov / citizen@civicpulse.gov")

    statuses = [Status.NEW.value, Status.ASSIGNED.value, Status.IN_PROGRESS.value, Status.RESOLVED.value]
    year = now().year
    seq = 0
    first_id = None

    for i, (category, description, age_days) in enumerate(SAMPLE_COMPLAINTS):
        lat, lng, address, ward = LOCATIONS[i % len(LOCATIONS)]
        lat += random.uniform(-0.004, 0.004)
        lng += random.uniform(-0.004, 0.004)
        created = now() - timedelta(days=age_days, hours=random.randint(0, 12))
        reporter = REPORTERS[i % len(REPORTERS)]

        similar = sum(1 for c, _, _ in SAMPLE_COMPLAINTS if c == category) - 1
        breakdown = score_complaint(
            category=category, description=description,
            created_at=created, similar_count=similar,
        )
        status = random.choice(statuses)
        seq += 1
        priority, sla_hours = band_for_score(breakdown["score"])
        resolved_at = created + timedelta(hours=random.randint(4, 96)) if status == Status.RESOLVED.value else None

        doc = {
            "ticket_id": f"CP-{year}-{seq:06d}",
            "category": category,
            "description": description,
            "status": status,
            "priority": breakdown["priority"],
            "priority_score": breakdown["score"],
            "department": CATEGORY_DEPARTMENT.get(category, "General Services"),
            "location": {"lat": lat, "lng": lng, "address": address, "ward": ward},
            "photos": SAMPLE_PHOTOS.get(category, []),
            "reporter_name": reporter[0],
            "reporter_contact": reporter[1],
            "assigned_to": "Field Officer" if status in (Status.ASSIGNED.value, Status.IN_PROGRESS.value) else None,
            "cluster_id": None,
            "sla_due_at": created + timedelta(hours=sla_hours),
            "similar_count": similar,
            "factors": breakdown["factors"],
            "created_at": created,
            "updated_at": created,
            "resolved_at": resolved_at,
        }
        res = await db.complaints.insert_one(doc)
        if first_id is None:
            first_id = str(res.inserted_id)

        await db.audit_events.insert_one({
            "complaint_id": str(res.inserted_id),
            "action": "created",
            "actor_name": reporter[0],
            "detail": f"Complaint submitted (priority {breakdown['priority']}).",
            "created_at": created,
        })

    await db.comments.insert_one({
        "complaint_id": first_id,
        "author_name": "Field Officer",
        "author_role": "officer",
        "text": "Crew dispatched, closing the lane while we repair the main.",
        "created_at": now() - timedelta(hours=2),
    })
    await db.notes.insert_one({
        "complaint_id": first_id,
        "text": "Coordinated with water department, high priority.",
        "type": "internal",
        "author_name": "City Admin",
        "created_at": now() - timedelta(hours=1),
    })

    total = await db.complaints.count_documents({})
    print(f"Seeded {total} complaints with audit trail, a comment and a note.")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
