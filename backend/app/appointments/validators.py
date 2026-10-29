from marshmallow import Schema, fields, validate
from app.common.constants import ConsultationType, AppointmentStatus


class BookAppointmentSchema(Schema):
    doctor_id = fields.String(required=True)
    appointment_date = fields.String(required=True, validate=validate.Regexp(r"^\d{4}-\d{2}-\d{2}$"))
    start_time = fields.String(required=True, validate=validate.Regexp(r"^\d{2}:\d{2}$"))
    consultation_type = fields.String(
        load_default=ConsultationType.IN_PERSON.value,
        validate=validate.OneOf(ConsultationType.list())
    )
    reason = fields.String(allow_none=True)


class CancelAppointmentSchema(Schema):
    reason = fields.String(load_default="Cancelled by user")


class UpdateStatusSchema(Schema):
    status = fields.String(
        required=True,
        validate=validate.OneOf([
            AppointmentStatus.CONFIRMED.value,
            AppointmentStatus.REJECTED.value,
            AppointmentStatus.COMPLETED.value,
            AppointmentStatus.CANCELLED.value,
        ])
    )
