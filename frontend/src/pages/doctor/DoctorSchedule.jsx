import React, { useState, useEffect } from "react";
import { Clock, Save, Calendar, Check, CalendarOff, Plus, Trash2 } from "lucide-react";
import apiClient from "../../api/client";
import { useToast } from "../../context/ToastContext";

const WEEKDAYS = [
  { id: 1, label: "Monday" },
  { id: 2, label: "Tuesday" },
  { id: 3, label: "Wednesday" },
  { id: 4, label: "Thursday" },
  { id: 5, label: "Friday" },
  { id: 6, label: "Saturday" },
  { id: 7, label: "Sunday" },
];

const DoctorSchedule = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [daysOfWeek, setDaysOfWeek] = useState([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [slotDuration, setSlotDuration] = useState(30);
  const [breakStart, setBreakStart] = useState("13:00");
  const [breakEnd, setBreakEnd] = useState("14:00");
  const [unavailableDates, setUnavailableDates] = useState([]);
  const [newExceptionDate, setNewExceptionDate] = useState("");

  const { showSuccess, showError } = useToast();

  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get("/doctors/me");
        const settings = res.data?.availability_settings;
        if (settings) {
          setDaysOfWeek(settings.days_of_week || [1, 2, 3, 4, 5]);
          setStartTime(settings.start_time || "09:00");
          setEndTime(settings.end_time || "17:00");
          setSlotDuration(settings.slot_duration_minutes || 30);
          setBreakStart(settings.break_start_time || "");
          setBreakEnd(settings.break_end_time || "");
          setUnavailableDates(settings.unavailable_dates || []);
        }
      } catch (err) {
        showError(err.message || "Failed to load availability settings");
      } finally {
        setLoading(false);
      }
    };
    fetchAvailability();
  }, []);

  const toggleDay = (dayId) => {
    if (daysOfWeek.includes(dayId)) {
      if (daysOfWeek.length === 1) {
        showError("You must select at least one active working day");
        return;
      }
      setDaysOfWeek(daysOfWeek.filter((d) => d !== dayId));
    } else {
      setDaysOfWeek([...daysOfWeek, dayId].sort());
    }
  };

  const handleAddException = () => {
    if (!newExceptionDate) return;
    if (unavailableDates.includes(newExceptionDate)) {
      showError("Date is already marked as unavailable");
      return;
    }
    setUnavailableDates([...unavailableDates, newExceptionDate].sort());
    setNewExceptionDate("");
  };

  const handleRemoveException = (dateStr) => {
    setUnavailableDates(unavailableDates.filter((d) => d !== dateStr));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.post("/doctors/me/availability", {
        days_of_week: daysOfWeek,
        start_time: startTime,
        end_time: endTime,
        slot_duration_minutes: parseInt(slotDuration, 10),
        break_start_time: breakStart || null,
        break_end_time: breakEnd || null,
        unavailable_dates: unavailableDates,
      });
      showSuccess("Weekly schedule and availability updated successfully!");
    } catch (err) {
      showError(err.message || "Failed to save schedule settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "4rem 0" }}>
        <div className="spinner" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--primary)", marginBottom: "0.3rem" }}>
          Availability & Schedule Management
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
          Configure your consultation days, operating hours, slot intervals, and leave exceptions.
        </p>
      </div>

      <form onSubmit={handleSave}>
        {/* Working Days */}
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>Active Consulting Days</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
            Select the days of the week on which you accept appointment bookings.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            {WEEKDAYS.map((day) => {
              const isSelected = daysOfWeek.includes(day.id);
              return (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => toggleDay(day.id)}
                  style={{
                    padding: "0.6rem 1.25rem",
                    borderRadius: "var(--radius-sm)",
                    border: isSelected ? "2px solid var(--primary)" : "1px solid var(--border)",
                    backgroundColor: isSelected ? "var(--primary-light)" : "var(--bg-card)",
                    color: isSelected ? "var(--primary)" : "var(--text-main)",
                    fontWeight: isSelected ? 700 : 500,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    transition: "all 0.15s ease",
                  }}
                >
                  {isSelected && <Check size={16} />}
                  <span>{day.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Working Hours & Slot Duration */}
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1.25rem" }}>Daily Consultation Hours</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.25rem" }}>
            <div>
              <label className="form-label">Shift Start Time</label>
              <input
                type="time"
                className="form-control"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="form-label">Shift End Time</label>
              <input
                type="time"
                className="form-control"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="form-label">Appointment Duration</label>
              <select
                className="form-control"
                value={slotDuration}
                onChange={(e) => setSlotDuration(e.target.value)}
              >
                <option value={15}>15 Minutes</option>
                <option value={20}>20 Minutes</option>
                <option value={30}>30 Minutes (Recommended)</option>
                <option value={45}>45 Minutes</option>
                <option value={60}>60 Minutes</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: "1.5rem", paddingTop: "1.25rem", borderTop: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem", color: "var(--text-dark)" }}>
              Break / Lunch Interval (Optional)
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.25rem" }}>
              <div>
                <label className="form-label">Break Start</label>
                <input
                  type="time"
                  className="form-control"
                  value={breakStart}
                  onChange={(e) => setBreakStart(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">Break End</label>
                <input
                  type="time"
                  className="form-control"
                  value={breakEnd}
                  onChange={(e) => setBreakEnd(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Leave Exceptions / Unavailable Dates */}
        <div className="card" style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>Unavailable / Leave Dates</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
            Block out specific calendar days (e.g. holidays, conferences, or emergency leave).
          </p>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "1.25rem", maxWidth: "400px" }}>
            <input
              type="date"
              className="form-control"
              value={newExceptionDate}
              onChange={(e) => setNewExceptionDate(e.target.value)}
            />
            <button
              type="button"
              onClick={handleAddException}
              className="btn btn-outline"
              style={{ gap: "0.4rem", whiteSpace: "nowrap" }}
            >
              <Plus size={16} /> Block Date
            </button>
          </div>

          {unavailableDates.length > 0 ? (
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {unavailableDates.map((dateStr) => (
                <div
                  key={dateStr}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.4rem 0.8rem",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "var(--bg-light)",
                    border: "1px solid var(--border)",
                    fontSize: "0.85rem",
                  }}
                >
                  <CalendarOff size={14} color="var(--danger)" />
                  <span>{dateStr}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveException(dateStr)}
                    style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", display: "flex" }}
                    title="Remove leave date"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic" }}>
              No custom leave dates currently scheduled.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="btn btn-primary"
          style={{ padding: "0.85rem 2.25rem", gap: "0.5rem", fontSize: "1rem" }}
        >
          {saving ? (
            <div className="spinner" />
          ) : (
            <>
              <Save size={18} />
              <span>Save Schedule Settings</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default DoctorSchedule;
