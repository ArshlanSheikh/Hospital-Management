from flask import jsonify


def success_response(data=None, message="Success", status_code=200, meta=None):
    """
    Standard successful JSON response envelope.
    """
    payload = {
        "success": True,
        "message": message,
        "data": data if data is not None else {}
    }
    if meta is not None:
        payload["meta"] = meta
    return jsonify(payload), status_code


def error_response(message="An error occurred", errors=None, status_code=400):
    """
    Standard error JSON response envelope.
    """
    payload = {
        "success": False,
        "message": message,
        "errors": errors if errors is not None else []
    }
    return jsonify(payload), status_code
