from marshmallow import Schema, fields, validate


class UpdateDoctorProfileSchema(Schema):
    full_name = fields.String(validate=validate.Length(min=2, max=120))
    specialization = fields.String(validate=validate.Length(min=2, max=100))
    qualifications = fields.Raw()  # string or list of strings
    experience_years = fields.Integer(validate=validate.Range(min=0, max=70))
    consultation_fee = fields.Float(validate=validate.Range(min=0))
    bio = fields.String(allow_none=True)
    phone = fields.String(allow_none=True, validate=validate.Length(max=25))
    profile_image = fields.String(allow_none=True)


class UpdateAvailabilitySchema(Schema):
    days_of_week = fields.List(fields.Integer(validate=validate.Range(min=1, max=7)), required=True)
    start_time = fields.String(required=True, validate=validate.Regexp(r"^\d{2}:\d{2}$"))
    end_time = fields.String(required=True, validate=validate.Regexp(r"^\d{2}:\d{2}$"))
    slot_duration_minutes = fields.Integer(load_default=30, validate=validate.OneOf([15, 20, 30, 45, 60]))
    break_start_time = fields.String(allow_none=True, validate=validate.Regexp(r"^\d{2}:\d{2}$"))
    break_end_time = fields.String(allow_none=True, validate=validate.Regexp(r"^\d{2}:\d{2}$"))
    unavailable_dates = fields.List(fields.String(), load_default=[])


class DoctorQuerySchema(Schema):
    search = fields.String(load_default="")
    specialization = fields.String(load_default="")
    min_fee = fields.Float(load_default=None)
    max_fee = fields.Float(load_default=None)
    page = fields.Integer(load_default=1, validate=validate.Range(min=1))
    limit = fields.Integer(load_default=10, validate=validate.Range(min=1, max=100))
