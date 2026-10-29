import os
from flask import Flask
import click
from app.config import config_by_name
from app.extensions import mongo, jwt, cors, get_db
from app.common.errors import register_error_handlers
from app.common.responses import success_response


def create_app(config_name=None):
    """
    Application factory for the Doctor Consultation and Appointment Booking Platform.
    Initializes PyMongo, JWT authentication, CORS, feature Blueprints, and error handlers.
    """
    if config_name is None:
        config_name = os.getenv("FLASK_ENV", "development")

    app = Flask(__name__)
    app.config.from_object(config_by_name.get(config_name, config_by_name["default"]))

    # Initialize PyMongo database & indexes
    mongo.init_app(app)

    # Initialize JWT Manager
    jwt.init_app(app)

    # Configure CORS explicitly
    allowed_origin = app.config.get("FRONTEND_ORIGIN", "http://localhost:5173")
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": [allowed_origin, "http://localhost:5173", "http://127.0.0.1:5173"]}},
        supports_credentials=True
    )

    # Register error handlers
    register_error_handlers(app)

    # Register feature Blueprints
    from app.auth.routes import auth_bp
    from app.doctors.routes import doctors_bp
    from app.patients.routes import patients_bp
    from app.appointments.routes import appointments_bp
    from app.admin.routes import admin_bp

    app.register_blueprint(auth_bp, url_prefix="/api/v1/auth")
    app.register_blueprint(doctors_bp, url_prefix="/api/v1/doctors")
    app.register_blueprint(patients_bp, url_prefix="/api/v1/patients")
    app.register_blueprint(appointments_bp, url_prefix="/api/v1/appointments")
    app.register_blueprint(admin_bp, url_prefix="/api/v1/admin")

    # Health check route
    @app.route("/api/v1/health", methods=["GET"])
    def health_check():
        return success_response(
            data={"status": "healthy", "service": "Doctor Consultation API", "version": "1.0.0"},
            message="Service is operational"
        )

    # CLI command: create first platform admin securely
    @app.cli.command("create-admin")
    @click.option("--email", prompt="Admin Email", help="Email for platform administrator")
    @click.option("--password", prompt=True, hide_input=True, confirmation_prompt=True, help="Admin password")
    def create_admin(email, password):
        """Create the first platform administrator securely in MongoDB."""
        from datetime import datetime, timezone
        from app.auth.service import hash_password
        from app.common.constants import UserRole, AccountStatus

        with app.app_context():
            db = get_db()
            clean_email = email.strip().lower()
            existing = db.users.find_one({"email": clean_email})
            if existing:
                click.echo(f"Account for {clean_email} already exists.")
                return

            now = datetime.now(timezone.utc)
            admin_doc = {
                "email": clean_email,
                "name": "Administrator",
                "password_hash": hash_password(password),
                "role": UserRole.ADMIN.value,
                "account_status": AccountStatus.ACTIVE.value,
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            }
            db.users.insert_one(admin_doc)
            click.echo(f"Platform administrator created successfully for {clean_email}")

    # CLI command: seed demo data for V1 testing
    @app.cli.command("seed-v1")
    def seed_v1():
        """Seed verified doctors, demo patient, schedules, and admin into MongoDB for V1 testing."""
        from app.seed import seed_database
        with app.app_context():
            seed_database()
            click.echo("V1 MongoDB database seeded successfully.")

    return app
