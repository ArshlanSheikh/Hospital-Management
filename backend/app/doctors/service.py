from datetime import datetime, date, timedelta, timezone
from bson import ObjectId
from app.extensions import get_db
from app.doctors.repository import DoctorRepository
from app.common.errors import NotFoundError, ValidationError, ForbiddenError
from app.common.constants import DoctorVerificationStatus, AppointmentStatus


def time_to_minutes(time_str: str) -> int:
    hours, minutes = map(int, time_str.split(":"))
    return hours * 60 + minutes


def minutes_to_time(minutes: int) -> str:
    hours = (minutes // 60) % 24
    mins = minutes % 60
    return f"{hours:02d}:{mins:02d}"


class DoctorService:
    @staticmethod
    def list_doctors(query_params: dict) -> dict:
        items, total = DoctorRepository.find_verified(query_params)
        limit = min(100, max(1, int(query_params.get("limit", 10))))
        page = max(1, int(query_params.get("page", 1)))
        pages = (total + limit - 1) // limit if total > 0 else 1
        return {
            "doctors": items,
            "total": total,
            "page": page,
            "pages": pages,
            "limit": limit
        }

    @staticmethod
    def get_doctor(doctor_id: str) -> dict:
        doc = DoctorRepository.get_by_id(doctor_id)
        if not doc:
            raise NotFoundError("Doctor profile not found")
        return doc

    @staticmethod
    def update_profile(user_id: str, data: dict) -> dict:
        db = get_db()
        updates = {}

        if "full_name" in data:
            updates["full_name"] = data["full_name"].strip()
            db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"name": data["full_name"].strip()}})
        if "specialization" in data:
            updates["specialization"] = data["specialization"].strip()
        if "qualifications" in data:
            q = data["qualifications"]
            if isinstance(q, str):
                q = [item.strip() for item in q.split(",") if item.strip()]
            updates["qualifications"] = q
        if "experience_years" in data:
            updates["experience_years"] = int(data["experience_years"])
        if "consultation_fee" in data:
            updates["consultation_fee"] = float(data["consultation_fee"])
        if "bio" in data:
            updates["bio"] = data["bio"]
        if "phone" in data:
            updates["phone"] = data["phone"]
            db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"phone": data["phone"]}})
        if "profile_image" in data:
            updates["profile_image"] = data["profile_image"]

        updates["updated_at"] = datetime.now(timezone.utc)
        result = DoctorRepository.update_by_user_id(user_id, updates)
        if not result:
            raise NotFoundError("Doctor profile not found")
        return result

    @staticmethod
    def resolve_schedule_for_date(settings: dict, target_date: date) -> dict:
        """Resolve the effective working hours, breaks, and slot duration for a specific date.
        
        Priority order:
        1. Date in unavailable_dates -> Not available
        2. Date has entry in date_overrides -> Overrides weekly schedule
        3. Day of week in weekly_schedule -> Day-specific working hours & breaks
        4. Fallback to legacy days_of_week and default hours
        """
        date_str = target_date.strftime("%Y-%m-%d")

        # 1. Check unavailable dates
        if date_str in settings.get("unavailable_dates", []):
            return {"is_available": False, "reason": "Doctor has marked this specific date as unavailable."}

        # 2. Check date-specific overrides
        date_overrides = settings.get("date_overrides", [])
        override = next((o for o in date_overrides if o.get("date") == date_str), None)
        if override:
            if not override.get("is_available", True):
                return {"is_available": False, "reason": "Doctor is not available on this date (custom override)."}
            return {
                "is_available": True,
                "start_time": override.get("start_time") or settings.get("start_time", "09:00"),
                "end_time": override.get("end_time") or settings.get("end_time", "17:00"),
                "break_start_time": override.get("break_start_time"),
                "break_end_time": override.get("break_end_time"),
                "slot_duration_minutes": int(override.get("slot_duration_minutes") or settings.get("slot_duration_minutes", 30)),
                "source": "date_override"
            }

        # 3. Check recurring weekly schedule
        weekday = target_date.isoweekday()  # 1=Monday ... 7=Sunday
        weekly = settings.get("weekly_schedule", [])
        if weekly and isinstance(weekly, list):
            day_conf = next((d for d in weekly if d.get("day_of_week") == weekday), None)
            if day_conf:
                if not day_conf.get("is_active", True):
                    return {"is_available": False, "reason": "Doctor does not consult on this weekday."}
                return {
                    "is_available": True,
                    "start_time": day_conf.get("start_time") or settings.get("start_time", "09:00"),
                    "end_time": day_conf.get("end_time") or settings.get("end_time", "17:00"),
                    "break_start_time": day_conf.get("break_start_time") or settings.get("break_start_time"),
                    "break_end_time": day_conf.get("break_end_time") or settings.get("break_end_time"),
                    "slot_duration_minutes": int(settings.get("slot_duration_minutes", 30)),
                    "source": "weekly_schedule"
                }

        # 4. Fallback to legacy days_of_week and default hours
        active_days = settings.get("days_of_week", [1, 2, 3, 4, 5])
        if weekday not in active_days:
            return {"is_available": False, "reason": "Doctor does not consult on the selected day of the week."}

        return {
            "is_available": True,
            "start_time": settings.get("start_time", "09:00"),
            "end_time": settings.get("end_time", "17:00"),
            "break_start_time": settings.get("break_start_time"),
            "break_end_time": settings.get("break_end_time"),
            "slot_duration_minutes": int(settings.get("slot_duration_minutes", 30)),
            "source": "default"
        }

    @staticmethod
    def update_availability(user_id: str, data: dict) -> dict:
        db = get_db()

        # Validate default hours if present
        start_min = time_to_minutes(data.get("start_time", "09:00"))
        end_min = time_to_minutes(data.get("end_time", "17:00"))
        if start_min >= end_min:
            raise ValidationError("Availability start time must be before end time")

        if data.get("break_start_time") and data.get("break_end_time"):
            b_start = time_to_minutes(data["break_start_time"])
            b_end = time_to_minutes(data["break_end_time"])
            if b_start >= b_end:
                raise ValidationError("Break start time must be before break end time")
            if b_start < start_min or b_end > end_min:
                raise ValidationError("Break time must be within working hours")

        # Validate weekly schedule items
        weekly_schedule = data.get("weekly_schedule", [])
        for day_item in weekly_schedule:
            if day_item.get("is_active", True):
                d_start = time_to_minutes(day_item.get("start_time", "09:00"))
                d_end = time_to_minutes(day_item.get("end_time", "17:00"))
                if d_start >= d_end:
                    raise ValidationError(f"Start time must be before end time for weekday {day_item.get('day_of_week')}")
                if day_item.get("break_start_time") and day_item.get("break_end_time"):
                    db_start = time_to_minutes(day_item["break_start_time"])
                    db_end = time_to_minutes(day_item["break_end_time"])
                    if db_start >= db_end:
                        raise ValidationError(f"Break start must be before break end for weekday {day_item.get('day_of_week')}")
                    if db_start < d_start or db_end > d_end:
                        raise ValidationError(f"Break time must be within working hours for weekday {day_item.get('day_of_week')}")

        # Validate date overrides
        date_overrides = data.get("date_overrides", [])
        for override in date_overrides:
            if override.get("is_available", True):
                o_start_str = override.get("start_time") or data.get("start_time", "09:00")
                o_end_str = override.get("end_time") or data.get("end_time", "17:00")
                o_start = time_to_minutes(o_start_str)
                o_end = time_to_minutes(o_end_str)
                if o_start >= o_end:
                    raise ValidationError(f"Start time must be before end time for date override {override.get('date')}")
                if override.get("break_start_time") and override.get("break_end_time"):
                    ob_start = time_to_minutes(override["break_start_time"])
                    ob_end = time_to_minutes(override["break_end_time"])
                    if ob_start >= ob_end:
                        raise ValidationError(f"Break start must be before break end for date override {override.get('date')}")
                    if ob_start < o_start or ob_end > o_end:
                        raise ValidationError(f"Break time must be within working hours for date override {override.get('date')}")

        settings = {
            "days_of_week": data.get("days_of_week", [1, 2, 3, 4, 5]),
            "start_time": data.get("start_time", "09:00"),
            "end_time": data.get("end_time", "17:00"),
            "slot_duration_minutes": int(data.get("slot_duration_minutes", 30)),
            "break_start_time": data.get("break_start_time"),
            "break_end_time": data.get("break_end_time"),
            "unavailable_dates": data.get("unavailable_dates", []),
            "weekly_schedule": weekly_schedule,
            "date_overrides": date_overrides,
        }

        updates = {
            "availability_settings": settings,
            "updated_at": datetime.now(timezone.utc),
        }

        result = DoctorRepository.update_by_user_id(user_id, updates)
        if not result:
            raise NotFoundError("Doctor profile not found")
        return result

    @staticmethod
    def get_available_slots(doctor_id: str, date_str: str, only_available: bool = False) -> list:
        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            raise ValidationError("Invalid date format. Expected YYYY-MM-DD.")

        today = date.today()
        if target_date < today:
            return []

        doctor = DoctorRepository.get_by_id(doctor_id)
        if not doctor:
            raise NotFoundError("Doctor profile not found")

        if doctor.get("verification_status") != DoctorVerificationStatus.VERIFIED.value:
            raise ForbiddenError("This doctor is not currently verified to accept bookings")

        settings = doctor.get("availability_settings") or {}
        schedule = DoctorService.resolve_schedule_for_date(settings, target_date)

        if not schedule.get("is_available"):
            return []

        slot_duration = schedule.get("slot_duration_minutes", 30)
        start_min = time_to_minutes(schedule.get("start_time", "09:00"))
        end_min = time_to_minutes(schedule.get("end_time", "17:00"))

        break_start = time_to_minutes(schedule["break_start_time"]) if schedule.get("break_start_time") else None
        break_end = time_to_minutes(schedule["break_end_time"]) if schedule.get("break_end_time") else None

        # Fetch all active booked appointments for this doctor on this date
        db = get_db()
        booked_cursor = db.appointments.find({
            "doctor_id": ObjectId(doctor_id) if ObjectId.is_valid(doctor_id) else doctor_id,
            "appointment_date": date_str,
            "appointment_status": {"$in": [AppointmentStatus.PENDING.value, AppointmentStatus.CONFIRMED.value]}
        })

        # Calculate booked intervals [(start_min, end_min)] to detect any overlap
        booked_intervals = []
        for appt in booked_cursor:
            a_start = time_to_minutes(appt["start_time"])
            a_dur = appt.get("duration_minutes", slot_duration)
            a_end = time_to_minutes(appt["end_time"]) if appt.get("end_time") else (a_start + a_dur)
            booked_intervals.append((a_start, a_end))

        slots = []
        current_min = start_min
        now_time = datetime.now()

        while current_min + slot_duration <= end_min:
            slot_end_min = current_min + slot_duration
            start_str = minutes_to_time(current_min)
            end_str = minutes_to_time(slot_end_min)

            # Skip break times
            is_in_break = False
            if break_start is not None and break_end is not None:
                if not (slot_end_min <= break_start or current_min >= break_end):
                    is_in_break = True

            if not is_in_break:
                # Check for interval collision with any existing active booking
                is_conflicted = any(
                    current_min < b_end and slot_end_min > b_start
                    for b_start, b_end in booked_intervals
                )

                is_past = False
                if target_date == today:
                    slot_hour, slot_minute = map(int, start_str.split(":"))
                    if now_time.hour > slot_hour or (now_time.hour == slot_hour and now_time.minute >= slot_minute):
                        is_past = True

                is_available = (not is_conflicted) and (not is_past)

                if (not only_available) or is_available:
                    slots.append({
                        "start_time": start_str,
                        "end_time": end_str,
                        "duration_minutes": slot_duration,
                        "is_available": is_available
                    })

            current_min += slot_duration

        return slots
