from marshmallow import Schema, fields, validate


class UpdatePatientProfileSchema(Schema):
    full_name = fields.String(validate=validate.Length(min=2, max=120))
    phone = fields.String(allow_none=True, validate=validate.Length(max=25))
    date_of_birth = fields.String(allow_none=True)
    gender = fields.String(allow_none=True, validate=validate.OneOf(["Male", "Female", "Other"]))
    blood_group = fields.String(allow_none=True)
    emergency_contact = fields.String(allow_none=True)
    allergies = fields.List(fields.String(), load_default=[])
