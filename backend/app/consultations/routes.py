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


@consultations_bp.route("/<appointment_id>/initiate-call", methods=["POST"])
@jwt_required()
def initiate_consultation_call(appointment_id):
    """Doctor initiates video call to patient, ringing patient screen."""
    user = get_current_user()
    result = ConsultationService.initiate_call(appointment_id, user)
    return success_response(data=result, message="Call initiated. Ringing patient...")


@consultations_bp.route("/incoming", methods=["GET"])
@jwt_required()
def get_incoming_consultation_call():
    """Poll for active incoming call from doctor (for patient alert popup)."""
    user = get_current_user()
    result = ConsultationService.get_active_incoming_call(user)
    return success_response(data=result, message="Incoming call status retrieved")


@consultations_bp.route("/<appointment_id>/accept-call", methods=["POST"])
@jwt_required()
def accept_consultation_call(appointment_id):
    """Patient accepts incoming call and prepares video session."""
    user = get_current_user()
    result = ConsultationService.accept_call(appointment_id, user)
    return success_response(data=result, message="Call accepted")


@consultations_bp.route("/<appointment_id>/decline-call", methods=["POST"])
@jwt_required()
def decline_consultation_call(appointment_id):
    """Patient declines or doctor cancels ringing call."""
    user = get_current_user()
    result = ConsultationService.decline_call(appointment_id, user)
    return success_response(data=result, message="Call declined")


@consultations_bp.route("/<appointment_id>/complete", methods=["POST"])
@jwt_required()
def complete_consultation(appointment_id):
    """Officially conclude video consultation session."""
    user = get_current_user()
    data = request.get_json(silent=True) or {}
    notes = data.get("notes")
    result = ConsultationService.complete_consultation(appointment_id, user, notes=notes)
    return success_response(data=result, message="Consultation session concluded successfully")


@consultations_bp.route("/<appointment_id>/signal", methods=["POST"])
@jwt_required()
def send_consultation_signal(appointment_id):
    """Send WebRTC signal to peer (offer, answer, candidate, join, leave)."""
    user = get_current_user()
    data = request.get_json(silent=True) or {}
    result = ConsultationService.send_signal(appointment_id, user, data)
    return success_response(data=result, message="Signal sent successfully")


@consultations_bp.route("/<appointment_id>/signals", methods=["GET"])
@jwt_required()
def get_consultation_signals(appointment_id):
    """Retrieve WebRTC signals sent by the other participant."""
    user = get_current_user()
    since_ms = request.args.get("since", 0)
    result = ConsultationService.get_signals(appointment_id, user, since_ms=since_ms)
    return success_response(data=result, message="Signals retrieved successfully")


@consultations_bp.route("/<appointment_id>/signal/reset", methods=["POST"])
@jwt_required()
def reset_consultation_signals(appointment_id):
    """Reset signaling buffer for fresh session."""
    user = get_current_user()
    result = ConsultationService.reset_signals(appointment_id, user)
    return success_response(data=result, message="Signals reset successfully")


@consultations_bp.route("/<appointment_id>/missed", methods=["POST"])
@jwt_required()
def mark_consultation_missed(appointment_id):
    """Mark consultation as missed."""
    user = get_current_user()
    data = request.get_json(silent=True) or {}
    reason = data.get("reason")
    result = ConsultationService.mark_missed(appointment_id, user, reason=reason)
    return success_response(data=result, message="Consultation marked as missed")
