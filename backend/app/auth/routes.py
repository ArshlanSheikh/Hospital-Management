from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from app.auth.validators import (
    LoginSchema,
    RegisterPatientSchema,
    RegisterDoctorSchema,
)
from app.auth.service import AuthService
from app.common.responses import success_response
from app.common.permissions import get_current_user

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register/patient", methods=["POST"])
def register_patient():
    schema = RegisterPatientSchema()
    data = schema.load(request.get_json() or {})
    result = AuthService.register_patient(data)
    return success_response(
        data=result,
        message="Patient registered successfully",
        status_code=201
    )


@auth_bp.route("/register/doctor", methods=["POST"])
def register_doctor():
    schema = RegisterDoctorSchema()
    data = schema.load(request.get_json() or {})
    result = AuthService.register_doctor(data)
    return success_response(
        data=result,
        message="Doctor registered successfully. Account pending administrator verification.",
        status_code=201
    )


@auth_bp.route("/login", methods=["POST"])
def login():
    schema = LoginSchema()
    data = schema.load(request.get_json() or {})
    result = AuthService.authenticate(data["email"], data["password"])
    return success_response(data=result, message="Logged in successfully")


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_me():
    user = get_current_user()
    profile = AuthService.get_user_profile(user)
    return success_response(data=profile, message="User profile retrieved successfully")


@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    return success_response(message="Logged out successfully")
