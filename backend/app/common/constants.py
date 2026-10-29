from enum import Enum


class UserRole(str, Enum):
    PATIENT = "patient"
    DOCTOR = "doctor"
    ADMIN = "admin"

    @classmethod
    def list(cls):
        return [c.value for c in cls]

    @classmethod
    def normalize(cls, role_str):
        if not role_str:
            return None
        clean = role_str.strip().lower()
        if clean in ["patient", "doctor", "admin"]:
            return clean
        if clean == "platform_admin":
            return "admin"
        return clean


class AccountStatus(str, Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    PENDING_VERIFICATION = "pending_verification"

    @classmethod
    def list(cls):
        return [c.value for c in cls]


class DoctorVerificationStatus(str, Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"

    @classmethod
    def list(cls):
        return [c.value for c in cls]


class AppointmentStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    REJECTED = "rejected"
    COMPLETED = "completed"

    @classmethod
    def list(cls):
        return [c.value for c in cls]


class ConsultationType(str, Enum):
    IN_PERSON = "in_person"
    VIDEO = "video"

    @classmethod
    def list(cls):
        return [c.value for c in cls]


class PaymentStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"

    @classmethod
    def list(cls):
        return [c.value for c in cls]


class NotificationType(str, Enum):
    BOOKING = "booking"
    CONFIRMATION = "confirmation"
    CANCELLATION = "cancellation"
    RESCHEDULE = "reschedule"
    PAYMENT = "payment"
    PRESCRIPTION = "prescription"
    CONSULTATION = "consultation"
    SYSTEM = "system"

    @classmethod
    def list(cls):
        return [c.value for c in cls]


class ConsultationStatus(str, Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    MISSED = "missed"

    @classmethod
    def list(cls):
        return [c.value for c in cls]
