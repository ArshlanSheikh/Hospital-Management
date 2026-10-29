from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from app.common.permissions import get_current_user
from app.common.responses import success_response, error_response
from app.payments.service import PaymentService

payments_bp = Blueprint("payments", __name__, url_prefix="/api/v1/payments")


@payments_bp.route("/create-order", methods=["POST"])
@jwt_required()
def create_payment_order():
    """Create a Razorpay payment order for an appointment."""
    user = get_current_user()
    data = request.get_json(silent=True) or {}
    appointment_id = data.get("appointment_id")
    if not appointment_id:
        return error_response(code="VALIDATION_ERROR", message="appointment_id is required", status_code=400)

    result = PaymentService.create_payment_order(appointment_id=appointment_id, user=user)
    return success_response(data=result, message="Payment order created successfully", status_code=201)


@payments_bp.route("/verify", methods=["POST"])
@jwt_required()
def verify_payment():
    """Verify cryptographic payment signature and update appointment confirmation."""
    user = get_current_user()
    data = request.get_json(silent=True) or {}
    order_id = data.get("razorpay_order_id")
    payment_id = data.get("razorpay_payment_id")
    signature = data.get("razorpay_signature")

    if not order_id or not payment_id or not signature:
        return error_response(
            code="VALIDATION_ERROR",
            message="razorpay_order_id, razorpay_payment_id, and razorpay_signature are required",
            status_code=400
        )

    payment = PaymentService.verify_payment(
        order_id=order_id,
        payment_id=payment_id,
        signature=signature,
        user=user
    )
    return success_response(data=payment, message="Payment verified and appointment confirmed successfully")


@payments_bp.route("/history", methods=["GET"])
@jwt_required()
def get_payment_history():
    """List payment transactions scoped to authenticated user role."""
    user = get_current_user()
    limit = int(request.args.get("limit", 50))
    skip = int(request.args.get("skip", 0))

    history = PaymentService.get_user_payment_history(user=user, limit=min(limit, 100), skip=skip)
    return success_response(data={"payments": history}, message="Payment history retrieved successfully")


@payments_bp.route("/receipt/<receipt_id>", methods=["GET"])
@jwt_required()
def get_payment_receipt(receipt_id):
    """Retrieve receipt details for an authenticated patient or doctor."""
    user = get_current_user()
    receipt = PaymentService.get_payment_receipt(receipt_id, user=user)
    return success_response(data=receipt, message="Receipt retrieved successfully")
