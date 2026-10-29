from datetime import datetime, timezone
from bson import ObjectId
from app.extensions import mongo


class NotificationRepository:
    """Data access repository for in-app user notifications."""

    @staticmethod
    def _collection():
        return mongo.get_database().notifications

    @classmethod
    def create(cls, user_id, title, message, notification_type="system", reference_id=None):
        """Insert a notification document, suppressing duplicates within 5 minutes."""
        now = datetime.now(timezone.utc)
        col = cls._collection()

        # Check for duplicate notification within the last 5 minutes to avoid spam on retries
        recent = col.find_one({
            "user_id": str(user_id),
            "title": title,
            "message": message,
            "reference_id": str(reference_id) if reference_id else None,
            "created_at": {"$gte": datetime.fromtimestamp(now.timestamp() - 300, timezone.utc)}
        })
        if recent:
            return cls._serialize(recent)

        doc = {
            "user_id": str(user_id),
            "title": title,
            "message": message,
            "type": notification_type,
            "reference_id": str(reference_id) if reference_id else None,
            "is_read": False,
            "created_at": now,
            "read_at": None
        }
        res = col.insert_one(doc)
        doc["_id"] = res.inserted_id
        return cls._serialize(doc)

    @classmethod
    def get_by_user(cls, user_id, limit=50, skip=0, unread_only=False):
        """Fetch notifications for a given user ordered from newest to oldest."""
        col = cls._collection()
        query = {"user_id": str(user_id)}
        if unread_only:
            query["is_read"] = False

        cursor = col.find(query).sort("created_at", -1).skip(skip).limit(limit)
        return [cls._serialize(doc) for doc in cursor]

    @classmethod
    def get_unread_count(cls, user_id):
        """Return total unread count for user."""
        return cls._collection().count_documents({"user_id": str(user_id), "is_read": False})

    @classmethod
    def mark_read(cls, notification_id, user_id):
        """Mark a single notification as read if it belongs to the user."""
        if not ObjectId.is_valid(notification_id):
            return False
        res = cls._collection().update_one(
            {"_id": ObjectId(notification_id), "user_id": str(user_id)},
            {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc)}}
        )
        return res.modified_count > 0

    @classmethod
    def mark_all_read(cls, user_id):
        """Mark all unread notifications as read for a user."""
        res = cls._collection().update_many(
            {"user_id": str(user_id), "is_read": False},
            {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc)}}
        )
        return res.modified_count

    @staticmethod
    def _serialize(doc):
        if not doc:
            return None
        return {
            "id": str(doc["_id"]),
            "user_id": str(doc.get("user_id")),
            "title": doc.get("title"),
            "message": doc.get("message"),
            "type": doc.get("type", "system"),
            "reference_id": doc.get("reference_id"),
            "is_read": doc.get("is_read", False),
            "created_at": doc.get("created_at").isoformat() if doc.get("created_at") else None,
            "read_at": doc.get("read_at").isoformat() if doc.get("read_at") else None
        }
