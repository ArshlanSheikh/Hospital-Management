from functools import wraps
from bson import ObjectId
from bson.errors import InvalidId
from flask import g
from flask_jwt_extended import verify_jwt_in_request, get_jwt, get_jwt_identity
from app.extensions import get_db
from app.common.constants import UserRole, AccountStatus, DoctorVerificationStatus
from app.common.errors import ForbiddenError, UnauthorizedError


def get_current_user():
    """Fetch the active user document from MongoDB corresponding to current JWT identity."""
    verify_jwt_in_request()
    identity = get_jwt_identity()
    try:
        user_id = ObjectId(identity)
    except (InvalidId, TypeError):
        raise UnauthorizedError("Invalid user identity in token")

    db = get_db()
    user = db.users.find_one({"_id": user_id})
    if not user:
        raise UnauthorizedError("User associated with token no longer exists")

    # Account status check
    status = user.get("account_status", AccountStatus.ACTIVE.value)
    if status == AccountStatus.SUSPENDED.value or user.get("is_active") is False:
        raise ForbiddenError("Account has been deactivated or suspended")

    return user


def role_required(*allowed_roles):
    """
    Decorator to restrict endpoint access to specific roles.
    Example: @role_required(UserRole.DOCTOR.value, UserRole.ADMIN.value)
    """
    normalized_allowed = [UserRole.normalize(r) for r in allowed_roles]

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            user_role = UserRole.normalize(claims.get("role"))
            if not user_role or user_role not in normalized_allowed:
                raise ForbiddenError(f"Access forbidden: requires one of {allowed_roles}")
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def verified_doctor_required():
    """
    Decorator verifying that the caller is an active, verified doctor.
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user = get_current_user()
            if UserRole.normalize(user.get("role")) != UserRole.DOCTOR.value:
                raise ForbiddenError("Access forbidden: requires DOCTOR role")

            db = get_db()
            profile = db.doctor_profiles.find_one({"user_id": user["_id"]})
            if not profile:
                raise ForbiddenError("Doctor profile not found")

            if profile.get("verification_status") != DoctorVerificationStatus.VERIFIED.value:
                raise ForbiddenError("Doctor account is pending administrator verification")

            g.current_doctor_profile = profile
            return fn(*args, **kwargs)
        return wrapper
    return decorator
