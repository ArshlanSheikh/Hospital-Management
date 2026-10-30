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


class DayScheduleSchema(Schema):
    day_of_week = fields.Integer(required=True, validate=validate.Range(min=1, max=7))
    is_active = fields.Boolean(load_default=True)
    start_time = fields.String(load_default="09:00", validate=validate.Regexp(r"^\d{2}:\d{2}$"))
    end_time = fields.String(load_default="17:00", validate=validate.Regexp(r"^\d{2}:\d{2}$"))
    break_start_time = fields.String(allow_none=True, validate=validate.Regexp(r"^\d{2}:\d{2}$"))
    break_end_time = fields.String(allow_none=True, validate=validate.Regexp(r"^\d{2}:\d{2}$"))


class DateOverrideSchema(Schema):
    date = fields.String(required=True, validate=validate.Regexp(r"^\d{4}-\d{2}-\d{2}$"))
    is_available = fields.Boolean(load_default=True)
    start_time = fields.String(allow_none=True, validate=validate.Regexp(r"^\d{2}:\d{2}$"))
    end_time = fields.String(allow_none=True, validate=validate.Regexp(r"^\d{2}:\d{2}$"))
    break_start_time = fields.String(allow_none=True, validate=validate.Regexp(r"^\d{2}:\d{2}$"))
    break_end_time = fields.String(allow_none=True, validate=validate.Regexp(r"^\d{2}:\d{2}$"))
    slot_duration_minutes = fields.Integer(allow_none=True, validate=validate.OneOf([15, 20, 30, 45, 60]))


class UpdateAvailabilitySchema(Schema):
    days_of_week = fields.List(fields.Integer(validate=validate.Range(min=1, max=7)), load_default=[1, 2, 3, 4, 5])
    start_time = fields.String(load_default="09:00", validate=validate.Regexp(r"^\d{2}:\d{2}$"))
    end_time = fields.String(load_default="17:00", validate=validate.Regexp(r"^\d{2}:\d{2}$"))
    slot_duration_minutes = fields.Integer(load_default=30, validate=validate.OneOf([15, 20, 30, 45, 60]))
    break_start_time = fields.String(allow_none=True, validate=validate.Regexp(r"^\d{2}:\d{2}$"))
    break_end_time = fields.String(allow_none=True, validate=validate.Regexp(r"^\d{2}:\d{2}$"))
    unavailable_dates = fields.List(fields.String(), load_default=[])
    weekly_schedule = fields.List(fields.Nested(DayScheduleSchema), load_default=[])
    date_overrides = fields.List(fields.Nested(DateOverrideSchema), load_default=[])


class DoctorQuerySchema(Schema):
    search = fields.String(load_default="")
    specialization = fields.String(load_default="")
    min_fee = fields.Float(load_default=None)
    max_fee = fields.Float(load_default=None)
    page = fields.Integer(load_default=1, validate=validate.Range(min=1))
    limit = fields.Integer(load_default=10, validate=validate.Range(min=1, max=100))
