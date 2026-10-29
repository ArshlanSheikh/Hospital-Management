import logging
import pymongo
from flask import current_app
from flask_jwt_extended import JWTManager
from flask_cors import CORS

logger = logging.getLogger(__name__)

jwt = JWTManager()
cors = CORS()


def init_db_indexes(db):
    """Ensure all required collection indexes exist."""
    try:
        # Users collection
        db.users.create_index("email", unique=True)
        db.users.create_index("role")
        db.users.create_index("account_status")

        # Doctor profiles collection
        db.doctor_profiles.create_index("user_id", unique=True)
        db.doctor_profiles.create_index("specialization")
        db.doctor_profiles.create_index("verification_status")

        # Patient profiles collection
        db.patient_profiles.create_index("user_id", unique=True)

        # Appointments collection
        # Partial unique compound index to strictly prevent double-booking active slots
        db.appointments.create_index(
            [
                ("doctor_id", pymongo.ASCENDING),
                ("appointment_date", pymongo.ASCENDING),
                ("start_time", pymongo.ASCENDING),
            ],
            unique=True,
            partialFilterExpression={"appointment_status": {"$in": ["pending", "confirmed"]}},
            name="unique_active_doctor_slot"
        )
        db.appointments.create_index("patient_id")
        db.appointments.create_index("doctor_id")
        db.appointments.create_index("appointment_date")
        db.appointments.create_index("appointment_status")
        logger.info("MongoDB indexes verified successfully.")
    except Exception as err:
        logger.warning("Index initialization encountered an error: %s", err)


class MongoManager:
    """Manages PyMongo client and database instances bound to Flask app."""

    def __init__(self, app=None):
        self.client = None
        self.db = None
        if app is not None:
            self.init_app(app)

    def init_app(self, app):
        uri = app.config.get("MONGODB_URI", "mongodb://localhost:27017/")
        db_name = app.config.get("MONGODB_DATABASE", "hospital_consultation")
        self.client = pymongo.MongoClient(uri, tz_aware=True, serverSelectionTimeoutMS=5000)
        self.db = self.client[db_name]
        app.mongo_client = self.client
        app.mongo_db = self.db

        with app.app_context():
            init_db_indexes(self.db)

    def get_database(self):
        if self.db is not None:
            return self.db
        if current_app and hasattr(current_app, "mongo_db"):
            return current_app.mongo_db
        raise RuntimeError("MongoManager is not initialized with an active Flask app.")


mongo = MongoManager()


def get_db():
    """Retrieve active PyMongo database handle."""
    return mongo.get_database()
