from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from app.doctors.validators import (
    DoctorQuerySchema,
    UpdateDoctorProfileSchema,
    UpdateAvailabilitySchema
)
from app.doctors.service import DoctorService
from app.doctors.repository import DoctorRepository
from app.common.permissions import get_current_user, role_required
from app.common.constants import UserRole
from app.common.responses import success_response
from app.common.errors import ValidationError

doctors_bp = Blueprint("doctors", __name__)


@doctors_bp.route("", methods=["GET"])
def list_doctors():
    schema = DoctorQuerySchema()
    query_params = schema.load(request.args.to_dict())
    result = DoctorService.list_doctors(query_params)
    return success_response(data=result, message="Doctors retrieved successfully")


@doctors_bp.route("/<doctor_id>", methods=["GET"])
def get_doctor(doctor_id):
    result = DoctorService.get_doctor(doctor_id)
    return success_response(data=result, message="Doctor profile retrieved successfully")


@doctors_bp.route("/<doctor_id>/availability", methods=["GET"])
def get_doctor_availability(doctor_id):
    date_str = request.args.get("date")
    if not date_str:
        raise ValidationError("Query parameter 'date' (YYYY-MM-DD) is required")
    slots = DoctorService.get_available_slots(doctor_id, date_str)
    return success_response(data=slots, message="Available slots retrieved successfully")


@doctors_bp.route("/me", methods=["GET"])
@jwt_required()
@role_required(UserRole.DOCTOR.value)
def get_my_profile():
    user = get_current_user()
    doctor = DoctorRepository.get_by_user_id(str(user["_id"]))
    return success_response(data=doctor, message="Doctor workspace profile retrieved")


@doctors_bp.route("/me", methods=["PATCH"])
@jwt_required()
@role_required(UserRole.DOCTOR.value)
def update_my_profile():
    user = get_current_user()
    schema = UpdateDoctorProfileSchema()
    data = schema.load(request.get_json() or {})
    updated = DoctorService.update_profile(str(user["_id"]), data)
    return success_response(data=updated, message="Doctor profile updated successfully")


@doctors_bp.route("/me/availability", methods=["POST", "PUT"])
@jwt_required()
@role_required(UserRole.DOCTOR.value)
def update_my_availability():
    user = get_current_user()
    schema = UpdateAvailabilitySchema()
    data = schema.load(request.get_json() or {})
    updated = DoctorService.update_availability(str(user["_id"]), data)
    return success_response(data=updated, message="Availability settings updated successfully")
