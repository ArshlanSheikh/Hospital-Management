from flask import jsonify
from marshmallow import ValidationError as MarshmallowValidationError
from jwt.exceptions import PyJWTError
from app.common.responses import error_response


class AppError(Exception):
    """Base application exception."""
    def __init__(self, message="Application error", status_code=400, errors=None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.errors = errors or []


class NotFoundError(AppError):
    def __init__(self, message="Resource not found"):
        super().__init__(message, status_code=404)


class ConflictError(AppError):
    def __init__(self, message="Resource conflict or duplicate slot"):
        super().__init__(message, status_code=409)


class ForbiddenError(AppError):
    def __init__(self, message="Permission denied for this resource"):
        super().__init__(message, status_code=403)


class UnauthorizedError(AppError):
    def __init__(self, message="Authentication required or invalid token"):
        super().__init__(message, status_code=401)


class ValidationError(AppError):
    def __init__(self, message="Validation failed", errors=None):
        super().__init__(message, status_code=422, errors=errors)


def register_error_handlers(app):
    """Register uniform JSON error handlers on the Flask application."""

    @app.errorhandler(AppError)
    def handle_app_error(err):
        return error_response(
            message=err.message,
            errors=err.errors,
            status_code=err.status_code
        )

    @app.errorhandler(MarshmallowValidationError)
    def handle_marshmallow_error(err):
        return error_response(
            message="Invalid request data",
            errors=err.messages,
            status_code=422
        )

    @app.errorhandler(400)
    def handle_bad_request(err):
        return error_response(
            message=str(err.description) if hasattr(err, "description") else "Bad request",
            status_code=400
        )

    @app.errorhandler(401)
    def handle_unauthorized(err):
        return error_response(
            message="Unauthorized access",
            status_code=401
        )

    @app.errorhandler(403)
    def handle_forbidden(err):
        return error_response(
            message="Forbidden: You do not have permission to access this resource",
            status_code=403
        )

    @app.errorhandler(404)
    def handle_not_found(err):
        return error_response(
            message="Resource not found",
            status_code=404
        )

    @app.errorhandler(405)
    def handle_method_not_allowed(err):
        return error_response(
            message="HTTP method not allowed for this endpoint",
            status_code=405
        )

    @app.errorhandler(500)
    def handle_server_error(err):
        app.logger.exception("Internal Server Error: %s", err)
        return error_response(
            message="An unexpected server error occurred. Please try again later.",
            status_code=500
        )
