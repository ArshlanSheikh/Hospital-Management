from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from app.appointments.validators import (
    BookAppointmentSchema,
    CancelAppointmentSchema,
    UpdateStatusSchema,
)
from app.appointments.service import AppointmentService
from app.common.permissions import get_current_user, role_required
from app.common.constants import UserRole
from app.common.responses import success_response

appointments_bp = Blueprint("appointments", __name__)


@appointments_bp.route("", methods=["POST"])
@jwt_required()
@role_required(UserRole.PATIENT.value)
def book_appointment():
    user = get_current_user()
    schema = BookAppointmentSchema()
    data = schema.load(request.get_json() or {})
    result = AppointmentService.book_appointment(str(user["_id"]), data)
    return success_response(
        data=result,
        message="Appointment booked successfully",
        status_code=201
    )


@appointments_bp.route("", methods=["GET"])
@jwt_required()
def list_appointments():
    user = get_current_user()
    role = UserRole.normalize(user.get("role"))
    status = request.args.get("status")
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 10))

    if role == UserRole.PATIENT.value:
        result = AppointmentService.list_patient_appointments(
            str(user["_id"]), status=status, page=page, limit=limit
        )
    elif role == UserRole.DOCTOR.value:
        date_str = request.args.get("date")
        result = AppointmentService.list_doctor_appointments(
            str(user["_id"]), status=status, date_str=date_str, page=page, limit=limit
        )
    else:
        # Admin
        from app.appointments.repository import AppointmentRepository
        items, total = AppointmentRepository.find_all(status=status, page=page, limit=limit)
        pages = (total + limit - 1) // limit if total > 0 else 1
        result = {"appointments": items, "total": total, "page": page, "pages": pages, "limit": limit}

    return success_response(data=result, message="Appointments retrieved successfully")


@appointments_bp.route("/<appointment_id>", methods=["GET"])
@jwt_required()
def get_appointment(appointment_id):
    user = get_current_user()
    result = AppointmentService.get_appointment(appointment_id, user)
    return success_response(data=result, message="Appointment details retrieved successfully")


@appointments_bp.route("/<appointment_id>/cancel", methods=["POST"])
@jwt_required()
def cancel_appointment(appointment_id):
    user = get_current_user()
    schema = CancelAppointmentSchema()
    data = schema.load(request.get_json(silent=True) or {})
    result = AppointmentService.cancel_appointment(appointment_id, user, data.get("reason", "Cancelled by user"))
    return success_response(data=result, message="Appointment cancelled successfully")


@appointments_bp.route("/<appointment_id>/status", methods=["PATCH"])
@jwt_required()
def update_appointment_status(appointment_id):
    user = get_current_user()
    schema = UpdateStatusSchema()
    data = schema.load(request.get_json() or {})
    result = AppointmentService.update_status(appointment_id, user, data["status"])
    return success_response(data=result, message="Appointment status updated successfully")
