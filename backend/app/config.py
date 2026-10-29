import os
from datetime import timedelta
from dotenv import load_dotenv

# Load .env if present
basedir = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(basedir, "..", ".env"))


class Config:
    """Base configuration with secure defaults."""
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-doctor-insecure")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret-insecure")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        minutes=int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES_MINUTES", "120"))
    )
    MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
    MONGODB_DATABASE = os.getenv("MONGODB_DATABASE", "hospital_consultation")
    FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

    # Razorpay Payment Gateway
    RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "rzp_test_medipulse_sample")
    RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "sample_secret_medipulse_2026")
    RAZORPAY_CURRENCY = os.getenv("RAZORPAY_CURRENCY", "INR")


class DevelopmentConfig(Config):
    """Development configuration using local or Atlas MongoDB."""
    DEBUG = True
    MONGODB_DATABASE = os.getenv("MONGODB_DATABASE", "hospital_consultation_dev")


class TestingConfig(Config):
    """Testing configuration with dedicated isolated test database."""
    TESTING = True
    DEBUG = True
    MONGODB_DATABASE = os.getenv("MONGODB_DATABASE_TEST", "hospital_consultation_test")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)


class ProductionConfig(Config):
    """Production configuration requiring explicit environment variables."""
    DEBUG = False
    TESTING = False
    MONGODB_URI = os.getenv("MONGODB_URI")
    MONGODB_DATABASE = os.getenv("MONGODB_DATABASE", "hospital_consultation_prod")

    @classmethod
    def init_app(cls, app):
        assert cls.MONGODB_URI, "MONGODB_URI must be configured in production"
        assert cls.SECRET_KEY != "dev-secret-doctor-insecure", "SECRET_KEY must be configured in production"
        assert cls.JWT_SECRET_KEY != "dev-jwt-secret-insecure", "JWT_SECRET_KEY must be configured in production"


config_by_name = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
