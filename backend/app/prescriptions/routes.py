from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from app.common.permissions import get_current_user, role_required
from app.common.responses import success_response, error_response
from app.prescriptions.service import PrescriptionService

prescriptions_bp = Blueprint("prescriptions", __name__, url_prefix="/api/v1/prescriptions")


@prescriptions_bp.route("", methods=["POST"])
@jwt_required()
@role_required(["doctor"])
def create_prescription():
    """Issue a new digital prescription for an eligible consultation."""
    user = get_current_user()
    data = request.get_json(silent=True) or {}
    rx = PrescriptionService.create_prescription(data, user)
    return success_response(data=rx, message="Digital prescription issued successfully", status_code=201)


@prescriptions_bp.route("/patient/me", methods=["GET"])
@jwt_required()
@role_required(["patient"])
def get_my_patient_prescriptions():
    """Retrieve all prescriptions issued to the authenticated patient."""
    user = get_current_user()
    limit = int(request.args.get("limit", 50))
    skip = int(request.args.get("skip", 0))
    prescriptions = PrescriptionService.get_patient_prescriptions(user, limit=min(limit, 100), skip=skip)
    return success_response(data={"prescriptions": prescriptions}, message="Prescriptions retrieved successfully")


@prescriptions_bp.route("/doctor/me", methods=["GET"])
@jwt_required()
@role_required(["doctor"])
def get_my_doctor_prescriptions():
    """Retrieve all prescriptions issued by the authenticated doctor."""
    user = get_current_user()
    limit = int(request.args.get("limit", 50))
    skip = int(request.args.get("skip", 0))
    prescriptions = PrescriptionService.get_doctor_prescriptions(user, limit=min(limit, 100), skip=skip)
    return success_response(data={"prescriptions": prescriptions}, message="Issued prescriptions retrieved successfully")


@prescriptions_bp.route("/appointment/<appointment_id>", methods=["GET"])
@jwt_required()
def get_appointment_prescription(appointment_id):
    """Retrieve digital prescription associated with a consultation appointment."""
    user = get_current_user()
    rx = PrescriptionService.get_by_appointment(appointment_id, user)
    return success_response(data={"prescription": rx}, message="Prescription retrieved")


@prescriptions_bp.route("/<rx_id>", methods=["GET"])
@jwt_required()
def get_prescription_detail(rx_id):
    """Retrieve specific prescription details by its ID."""
    user = get_current_user()
    rx = PrescriptionService.get_by_id(rx_id, user)
    return success_response(data=rx, message="Prescription details retrieved successfully")


@prescriptions_bp.route("/<rx_id>", methods=["PUT"])
@jwt_required()
@role_required(["doctor"])
def update_prescription(rx_id):
    """Amend medicines or clinical advice in an existing prescription."""
    user = get_current_user()
    data = request.get_json(silent=True) or {}
    updated = PrescriptionService.update_prescription(rx_id, data, user)
    return success_response(data=updated, message="Prescription updated successfully")
