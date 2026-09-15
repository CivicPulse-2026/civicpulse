"""MongoDB (Motor) async connection and helpers."""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import settings


class _Mongo:
    client: AsyncIOMotorClient | None = None
    db: AsyncIOMotorDatabase | None = None


mongo = _Mongo()


async def connect_to_mongo() -> None:
    mongo.client = AsyncIOMotorClient(settings.mongodb_url, serverSelectionTimeoutMS=5000)
    mongo.db = mongo.client[settings.database_name]
    await mongo.client.admin.command("ping")
    await _ensure_indexes(mongo.db)


async def close_mongo_connection() -> None:
    if mongo.client is not None:
        mongo.client.close()


def get_database() -> AsyncIOMotorDatabase:
    if mongo.db is None:
        raise RuntimeError("Database connection has not been initialised.")
    return mongo.db


async def _ensure_indexes(db: AsyncIOMotorDatabase) -> None:
    await db.users.create_index("email", unique=True)
    await db.complaints.create_index("ticket_id", unique=True)
    await db.complaints.create_index("status")
    await db.complaints.create_index("category")
    await db.comments.create_index("complaint_id")
    await db.audit_events.create_index("complaint_id")
