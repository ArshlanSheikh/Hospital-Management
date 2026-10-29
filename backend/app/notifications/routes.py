from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from app.common.permissions import get_current_user
from app.common.responses import success_response, error_response
from app.notifications.service import NotificationService

notifications_bp = Blueprint("notifications", __name__, url_prefix="/api/v1/notifications")


@notifications_bp.route("", methods=["GET"])
@jwt_required()
def get_notifications():
    """Retrieve in-app notifications for the authenticated user."""
    user = get_current_user()
    limit = int(request.args.get("limit", 50))
    skip = int(request.args.get("skip", 0))
    unread_only = request.args.get("unread_only", "false").lower() == "true"

    data = NotificationService.get_user_notifications(
        user_id=user["_id"],
        limit=min(limit, 100),
        skip=skip,
        unread_only=unread_only
    )
    return success_response(data=data, message="Notifications retrieved successfully")


@notifications_bp.route("/<notification_id>/read", methods=["PATCH"])
@jwt_required()
def mark_notification_read(notification_id):
    """Mark a single notification as read."""
    user = get_current_user()
    updated = NotificationService.mark_as_read(notification_id, str(user["_id"]))
    if not updated:
        return error_response(code="NOT_FOUND", message="Notification not found", status_code=404)
    return success_response(data={"id": notification_id, "is_read": True}, message="Notification marked as read")


@notifications_bp.route("/mark-all-read", methods=["PATCH"])
@jwt_required()
def mark_all_read():
    """Mark all unread notifications as read for current user."""
    user = get_current_user()
    count = NotificationService.mark_all_read(str(user["_id"]))
    return success_response(data={"marked_read_count": count}, message=f"{count} notifications marked as read")
