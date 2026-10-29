from app.notifications.repository import NotificationRepository
from app.common.constants import NotificationType


class NotificationService:
    """Service handling in-app notifications and event dispatching."""

    @staticmethod
    def get_user_notifications(user_id, limit=50, skip=0, unread_only=False):
        notifications = NotificationRepository.get_by_user(user_id, limit=limit, skip=skip, unread_only=unread_only)
        unread_count = NotificationRepository.get_unread_count(user_id)
        return {"notifications": notifications, "unread_count": unread_count}

    @staticmethod
    def mark_as_read(notification_id, user_id):
        return NotificationRepository.mark_read(notification_id, user_id)

    @staticmethod
    def mark_all_read(user_id):
        return NotificationRepository.mark_all_read(user_id)

    @staticmethod
    def send(user_id, title, message, notification_type=NotificationType.SYSTEM.value, reference_id=None):
        return NotificationRepository.create(
            user_id=user_id,
            title=title,
            message=message,
            notification_type=notification_type,
            reference_id=reference_id
        )

    # High-level domain notification triggers
    @classmethod
    def notify_appointment_booked(cls, doctor_user_id, patient_user_id, appointment):
        appt_num = appointment.get("appointment_number", "Appointment")
        date_str = appointment.get("appointment_date")
        time_str = appointment.get("start_time")
        appt_id = appointment.get("id")

        # Notify Patient
        cls.send(
            user_id=patient_user_id,
            title="Appointment Request Received",
            message=f"Your appointment request ({appt_num}) for {date_str} at {time_str} has been submitted.",
            notification_type=NotificationType.BOOKING.value,
            reference_id=appt_id
        )

        # Notify Doctor
        cls.send(
            user_id=doctor_user_id,
            title="New Appointment Scheduled",
            message=f"A new appointment ({appt_num}) is scheduled for {date_str} at {time_str}.",
            notification_type=NotificationType.BOOKING.value,
            reference_id=appt_id
        )

    @classmethod
    def notify_appointment_confirmed(cls, doctor_user_id, patient_user_id, appointment):
        appt_num = appointment.get("appointment_number", "Appointment")
        date_str = appointment.get("appointment_date")
        time_str = appointment.get("start_time")
        appt_id = appointment.get("id")

        cls.send(
            user_id=patient_user_id,
            title="Appointment Confirmed",
            message=f"Your appointment ({appt_num}) on {date_str} at {time_str} is confirmed.",
            notification_type=NotificationType.CONFIRMATION.value,
            reference_id=appt_id
        )
        cls.send(
            user_id=doctor_user_id,
            title="Appointment Confirmed",
            message=f"Appointment ({appt_num}) on {date_str} at {time_str} is confirmed.",
            notification_type=NotificationType.CONFIRMATION.value,
            reference_id=appt_id
        )

    @classmethod
    def notify_appointment_cancelled(cls, doctor_user_id, patient_user_id, appointment, cancelled_by, reason=None):
        appt_num = appointment.get("appointment_number", "Appointment")
        date_str = appointment.get("appointment_date")
        appt_id = appointment.get("id")
        reason_txt = f" Reason: {reason}" if reason else ""

        target_user = doctor_user_id if cancelled_by == "patient" else patient_user_id
        initiator = "The patient" if cancelled_by == "patient" else "Dr."

        cls.send(
            user_id=target_user,
            title="Appointment Cancelled",
            message=f"{initiator} has cancelled appointment {appt_num} on {date_str}.{reason_txt}",
            notification_type=NotificationType.CANCELLATION.value,
            reference_id=appt_id
        )

    @classmethod
    def notify_appointment_rescheduled(cls, doctor_user_id, patient_user_id, appointment, old_date, old_time):
        appt_num = appointment.get("appointment_number", "Appointment")
        new_date = appointment.get("appointment_date")
        new_time = appointment.get("start_time")
        appt_id = appointment.get("id")

        msg = f"Appointment {appt_num} has been rescheduled from {old_date} {old_time} to {new_date} at {new_time}."

        cls.send(
            user_id=patient_user_id,
            title="Appointment Rescheduled",
            message=msg,
            notification_type=NotificationType.RESCHEDULE.value,
            reference_id=appt_id
        )
        cls.send(
            user_id=doctor_user_id,
            title="Appointment Rescheduled",
            message=msg,
            notification_type=NotificationType.RESCHEDULE.value,
            reference_id=appt_id
        )

    @classmethod
    def notify_payment_status(cls, patient_user_id, appointment, amount, status):
        appt_num = appointment.get("appointment_number", "Appointment")
        appt_id = appointment.get("id")

        if status == "completed":
            title = "Payment Successful"
            msg = f"Payment of ₹{amount} for appointment {appt_num} was successfully processed."
        else:
            title = "Payment Update"
            msg = f"Payment status for appointment {appt_num} is now {status}."

        cls.send(
            user_id=patient_user_id,
            title=title,
            message=msg,
            notification_type=NotificationType.PAYMENT.value,
            reference_id=appt_id
        )

    @classmethod
    def notify_prescription_issued(cls, patient_user_id, doctor_name, prescription_id, appointment_number):
        cls.send(
            user_id=patient_user_id,
            title="New Prescription Available",
            message=f"{doctor_name} has issued a digital prescription for consultation {appointment_number}.",
            notification_type=NotificationType.PRESCRIPTION.value,
            reference_id=prescription_id
        )
