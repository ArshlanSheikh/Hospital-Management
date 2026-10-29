from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from app.common.permissions import get_current_user
from app.common.responses import success_response, error_response
from app.consultations.service import ConsultationService

consultations_bp = Blueprint("consultations", __name__, url_prefix="/api/v1/consultations")


@consultations_bp.route("/<appointment_id>/session", methods=["GET"])
@jwt_required()
def get_consultation_session(appointment_id):
    """Retrieve secure video room credentials for authorized patient or doctor."""
    user = get_current_user()
    session_data = ConsultationService.get_or_create_session(appointment_id, user)
    return success_response(data=session_data, message="Consultation session authorized")


@consultations_bp.route("/<appointment_id>/complete", methods=["POST"])
@jwt_required()
def complete_consultation(appointment_id):
    """Officially conclude video consultation session."""
    user = get_current_user()
    data = request.get_json(silent=True) or {}
    notes = data.get("notes")
    result = ConsultationService.complete_consultation(appointment_id, user, notes=notes)
    return success_response(data=result, message="Consultation session concluded successfully")


@consultations_bp.route("/<appointment_id>/missed", methods=["POST"])
@jwt_required()
def mark_consultation_missed(appointment_id):
    """Mark consultation as missed."""
    user = get_current_user()
    data = request.get_json(silent=True) or {}
    reason = data.get("reason")
    result = ConsultationService.mark_missed(appointment_id, user, reason=reason)
    return success_response(data=result, message="Consultation marked as missed")
