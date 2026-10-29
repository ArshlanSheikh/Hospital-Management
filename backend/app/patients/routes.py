from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from app.patients.validators import UpdatePatientProfileSchema
from app.patients.service import PatientService
from app.common.permissions import get_current_user, role_required
from app.common.constants import UserRole
from app.common.responses import success_response

patients_bp = Blueprint("patients", __name__)


@patients_bp.route("/me", methods=["GET"])
@jwt_required()
@role_required(UserRole.PATIENT.value)
def get_my_profile():
    user = get_current_user()
    profile = PatientService.get_profile(str(user["_id"]))
    return success_response(data=profile, message="Patient profile retrieved successfully")


@patients_bp.route("/me", methods=["PATCH"])
@jwt_required()
@role_required(UserRole.PATIENT.value)
def update_my_profile():
    user = get_current_user()
    schema = UpdatePatientProfileSchema()
    data = schema.load(request.get_json() or {})
    updated = PatientService.update_profile(str(user["_id"]), data)
    return success_response(data=updated, message="Patient profile updated successfully")
