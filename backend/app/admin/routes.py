from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from app.admin.service import AdminService
from app.appointments.repository import AppointmentRepository
from app.common.permissions import role_required
from app.common.constants import UserRole
from app.common.responses import success_response

admin_bp = Blueprint("admin", __name__)


@admin_bp.route("/stats", methods=["GET"])
@jwt_required()
@role_required(UserRole.ADMIN.value)
def get_stats():
    data = AdminService.get_stats()
    return success_response(data=data, message="Platform statistics retrieved successfully")


@admin_bp.route("/doctors", methods=["GET"])
@jwt_required()
@role_required(UserRole.ADMIN.value)
def list_doctors():
    status = request.args.get("status")
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 10))
    result = AdminService.list_doctors(verification_status=status, page=page, limit=limit)
    return success_response(data=result, message="Doctors retrieved successfully")


@admin_bp.route("/doctors/<doctor_id>/verification", methods=["PATCH"])
@jwt_required()
@role_required(UserRole.ADMIN.value)
def verify_doctor(doctor_id):
    body = request.get_json() or {}
    status = body.get("status", "verified")
    updated = AdminService.verify_doctor(doctor_id, status)
    return success_response(data=updated, message=f"Doctor verification status updated to '{status}'")


@admin_bp.route("/patients", methods=["GET"])
@jwt_required()
@role_required(UserRole.ADMIN.value)
def list_patients():
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 10))
    result = AdminService.list_patients(page=page, limit=limit)
    return success_response(data=result, message="Patients retrieved successfully")


@admin_bp.route("/users/<user_id>/status", methods=["PATCH"])
@jwt_required()
@role_required(UserRole.ADMIN.value)
def update_user_status(user_id):
    body = request.get_json() or {}
    status = body.get("status", "active")
    updated = AdminService.update_user_status(user_id, status)
    return success_response(data=updated, message=f"User status updated to '{status}'")


@admin_bp.route("/appointments", methods=["GET"])
@jwt_required()
@role_required(UserRole.ADMIN.value)
def list_appointments():
    status = request.args.get("status")
    date_str = request.args.get("date")
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 20))
    items, total = AppointmentRepository.find_all(status=status, date_str=date_str, page=page, limit=limit)
    pages = (total + limit - 1) // limit if total > 0 else 1
    result = {"appointments": items, "total": total, "page": page, "pages": pages, "limit": limit}
    return success_response(data=result, message="All appointments retrieved successfully")
