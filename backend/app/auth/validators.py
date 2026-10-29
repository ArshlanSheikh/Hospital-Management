from marshmallow import Schema, fields, validate


class LoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.String(required=True, validate=validate.Length(min=6, max=100))


class RegisterPatientSchema(Schema):
    email = fields.Email(required=True)
    password = fields.String(required=True, validate=validate.Length(min=6, max=100))
    full_name = fields.String(required=True, validate=validate.Length(min=2, max=120))
    phone = fields.String(allow_none=True, validate=validate.Length(max=25))
    date_of_birth = fields.String(allow_none=True)
    gender = fields.String(allow_none=True, validate=validate.OneOf(["Male", "Female", "Other"]))
    blood_group = fields.String(allow_none=True)
    emergency_contact = fields.String(allow_none=True)


class RegisterDoctorSchema(Schema):
    email = fields.Email(required=True)
    password = fields.String(required=True, validate=validate.Length(min=6, max=100))
    full_name = fields.String(required=True, validate=validate.Length(min=2, max=120))
    specialization = fields.String(required=True, validate=validate.Length(min=2, max=100))
    qualifications = fields.Raw(required=True)  # Accepts string or list of strings
    experience_years = fields.Integer(load_default=0, validate=validate.Range(min=0, max=70))
    consultation_fee = fields.Float(load_default=500.0, validate=validate.Range(min=0))
    phone = fields.String(allow_none=True, validate=validate.Length(max=25))
    bio = fields.String(allow_none=True)
