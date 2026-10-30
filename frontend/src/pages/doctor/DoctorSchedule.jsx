import React, { useState, useEffect } from "react";
import {
  Clock,
  Save,
  Calendar,
  Check,
  CalendarOff,
  Plus,
  Trash2,
  CalendarDays,
  Sliders,
  AlertCircle,
  CheckCircle2,
  Coffee,
  X
} from "lucide-react";
import apiClient from "../../api/client";
import { useToast } from "../../context/ToastContext";

const WEEKDAYS = [
  { id: 1, label: "Monday", short: "Mon" },
  { id: 2, label: "Tuesday", short: "Tue" },
  { id: 3, label: "Wednesday", short: "Wed" },
  { id: 4, label: "Thursday", short: "Thu" },
  { id: 5, label: "Friday", short: "Fri" },
  { id: 6, label: "Saturday", short: "Sat" },
  { id: 7, label: "Sunday", short: "Sun" },
];

const DoctorSchedule = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Default / Global availability settings
  const [daysOfWeek, setDaysOfWeek] = useState([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [slotDuration, setSlotDuration] = useState(30);
  const [breakStart, setBreakStart] = useState("13:00");
  const [breakEnd, setBreakEnd] = useState("14:00");

  // Day-specific weekly schedule customizations
  const [weeklySchedule, setWeeklySchedule] = useState([]);

  // Date-specific overrides
  const [dateOverrides, setDateOverrides] = useState([]);
  const [newOverrideDate, setNewOverrideDate] = useState("");
  const [newOverrideAvailable, setNewOverrideAvailable] = useState(true);
  const [newOverrideStart, setNewOverrideStart] = useState("09:00");
  const [newOverrideEnd, setNewOverrideEnd] = useState("17:00");
  const [newOverrideSlotDuration, setNewOverrideSlotDuration] = useState(30);

  // Unavailable / Leave dates
  const [unavailableDates, setUnavailableDates] = useState([]);
  const [newExceptionDate, setNewExceptionDate] = useState("");

  const { showSuccess, showError } = useToast();

  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get("/doctors/me");
        const profile = res.data?.data || res.data || {};
        const settings = profile.availability_settings || {};

        setDaysOfWeek(settings.days_of_week || [1, 2, 3, 4, 5]);
        setStartTime(settings.start_time || "09:00");
        setEndTime(settings.end_time || "17:00");
        setSlotDuration(settings.slot_duration_minutes || 30);
        setBreakStart(settings.break_start_time || "");
        setBreakEnd(settings.break_end_time || "");
        setUnavailableDates(settings.unavailable_dates || []);
        setDateOverrides(settings.date_overrides || []);

        const existingWeekly = settings.weekly_schedule || [];
        const initialWeekly = WEEKDAYS.map((w) => {
          const found = existingWeekly.find((e) => e.day_of_week === w.id);
          if (found) {
            return {
              day_of_week: w.id,
              is_active: found.is_active ?? (settings.days_of_week || [1, 2, 3, 4, 5]).includes(w.id),
              start_time: found.start_time || settings.start_time || "09:00",
              end_time: found.end_time || settings.end_time || "17:00",
            };
          }
          return {
            day_of_week: w.id,
            is_active: (settings.days_of_week || [1, 2, 3, 4, 5]).includes(w.id),
            start_time: settings.start_time || "09:00",
            end_time: settings.end_time || "17:00",
          };
        });
        setWeeklySchedule(initialWeekly);
      } catch (err) {
        showError(err.message || "Failed to load availability settings");
      } finally {
        setLoading(false);
      }
    };
    fetchAvailability();
  }, []);

  const toggleDay = (dayId) => {
    let nextDays;
    if (daysOfWeek.includes(dayId)) {
      if (daysOfWeek.length === 1) {
        showError("You must select at least one active working day");
        return;
      }
      nextDays = daysOfWeek.filter((d) => d !== dayId);
    } else {
      nextDays = [...daysOfWeek, dayId].sort();
    }
    setDaysOfWeek(nextDays);

    setWeeklySchedule((prev) =>
      prev.map((item) =>
        item.day_of_week === dayId ? { ...item, is_active: nextDays.includes(dayId) } : item
      )
    );
  };

  // Add Date Override
  const handleAddDateOverride = () => {
    if (!newOverrideDate) {
      showError("Please pick a date for the override");
      return;
    }

    if (dateOverrides.some((o) => o.date === newOverrideDate)) {
      showError(`An override for ${newOverrideDate} already exists. Remove it first to re-add.`);
      return;
    }

    const overrideObj = {
      date: newOverrideDate,
      is_available: newOverrideAvailable,
      start_time: newOverrideAvailable ? newOverrideStart : null,
      end_time: newOverrideAvailable ? newOverrideEnd : null,
      slot_duration_minutes: newOverrideAvailable ? parseInt(newOverrideSlotDuration, 10) : null,
    };

    setDateOverrides([...dateOverrides, overrideObj].sort((a, b) => a.date.localeCompare(b.date)));
    setNewOverrideDate("");
    showSuccess(`Date override added for ${newOverrideDate}`);
  };

  const handleRemoveDateOverride = (dateStr) => {
    setDateOverrides(dateOverrides.filter((o) => o.date !== dateStr));
  };

  // Add Leave Date
  const handleAddException = () => {
    if (!newExceptionDate) return;
    if (unavailableDates.includes(newExceptionDate)) {
      showError("Date is already marked as leave");
      return;
    }
    setUnavailableDates([...unavailableDates, newExceptionDate].sort());
    setNewExceptionDate("");
  };

  const handleRemoveException = (dateStr) => {
    setUnavailableDates(unavailableDates.filter((d) => d !== dateStr));
  };

  // Save Settings
  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const cleanWeekly = weeklySchedule.map((w) => ({
        day_of_week: w.day_of_week,
        is_active: daysOfWeek.includes(w.day_of_week),
        start_time: w.start_time || startTime,
        end_time: w.end_time || endTime,
      }));

      await apiClient.post("/doctors/me/availability", {
        days_of_week: daysOfWeek,
        start_time: startTime,
        end_time: endTime,
        slot_duration_minutes: parseInt(slotDuration, 10),
        break_start_time: breakStart || null,
        break_end_time: breakEnd || null,
        weekly_schedule: cleanWeekly,
        date_overrides: dateOverrides,
        unavailable_dates: unavailableDates,
      });

      showSuccess("Availability schedule updated successfully!");
    } catch (err) {
      showError(err.message || "Failed to update availability");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <div className="spinner" style={{ color: "var(--primary)", width: "2.5rem", height: "2.5rem", margin: "0 auto 12px" }} />
        <p style={{ color: "var(--text-muted)" }}>Loading consultation schedule...</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Top Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-main)", letterSpacing: "-0.02em", margin: 0 }}>
            Availability Management
          </h1>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "4px 0 0" }}>
            Configure weekly clinic hours, consultation time-slots, specific date overrides, and vacation days.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary"
          style={{ minWidth: "160px" }}
        >
          {saving ? (
            <div className="spinner" style={{ width: "1.1rem", height: "1.1rem", color: "white" }} />
          ) : (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
              <Save size={16} />
              <span>Save Schedule</span>
            </span>
          )}
        </button>
      </div>

      {/* 1. Weekly Consultation Days */}
      <div className="sectionCard">
        <div className="sectionHeader">
          <div>
            <h3 className="sectionTitle">Weekly Consultation Days</h3>
            <p style={{ fontSize: "0.825rem", color: "var(--text-muted)", margin: "2px 0 0" }}>
              Select the recurring days of the week when your clinic is open for patient bookings.
            </p>
          </div>
          <span className="badge badge-primary">
            {daysOfWeek.length} Days Active
          </span>
        </div>

        <div style={{ padding: "20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px" }}>
            {WEEKDAYS.map((day) => {
              const isActive = daysOfWeek.includes(day.id);
              return (
                <button
                  type="button"
                  key={day.id}
                  onClick={() => toggleDay(day.id)}
                  style={{
                    padding: "16px 14px",
                    borderRadius: "var(--radius-md)",
                    border: isActive ? "2px solid var(--primary)" : "1px solid var(--border)",
                    backgroundColor: isActive ? "var(--primary-subtle)" : "#ffffff",
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "all 0.15s ease-in-out",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "var(--radius-full)",
                      backgroundColor: isActive ? "var(--primary)" : "#f1f5f9",
                      color: isActive ? "#ffffff" : "#94a3b8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      fontWeight: 700
                    }}
                  >
                    {isActive ? <Check size={16} /> : day.id}
                  </div>
                  <span style={{ fontSize: "0.9rem", fontWeight: 700, color: isActive ? "var(--primary)" : "var(--text-main)" }}>
                    {day.label}
                  </span>
                  <span style={{ fontSize: "0.725rem", color: isActive ? "var(--primary)" : "var(--text-muted)", fontWeight: 600 }}>
                    {isActive ? "AVAILABLE" : "OFF-DUTY"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Standard Daily Consultation Hours */}
      <div className="sectionCard">
        <div className="sectionHeader">
          <div>
            <h3 className="sectionTitle">Standard Practice Hours &amp; Slot Sizing</h3>
            <p style={{ fontSize: "0.825rem", color: "var(--text-muted)", margin: "2px 0 0" }}>
              Define when your consultations begin, conclude, and the duration allocated to each patient appointment.
            </p>
          </div>
        </div>

        <div style={{ padding: "20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                Consultation Start Time <span className="required">*</span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                Consultation End Time <span className="required">*</span>
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                Slot Duration <span className="required">*</span>
              </label>
              <select
                value={slotDuration}
                onChange={(e) => setSlotDuration(Number(e.target.value))}
                className="form-select"
              >
                <option value={15}>15 Minutes per Slot</option>
                <option value={20}>20 Minutes per Slot</option>
                <option value={30}>30 Minutes per Slot (Standard)</option>
                <option value={45}>45 Minutes per Slot</option>
                <option value={60}>60 Minutes per Slot (In-depth)</option>
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                Daily Break Period
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <input
                  type="time"
                  value={breakStart}
                  onChange={(e) => setBreakStart(e.target.value)}
                  className="form-input"
                  title="Break Start"
                />
                <input
                  type="time"
                  value={breakEnd}
                  onChange={(e) => setBreakEnd(e.target.value)}
                  className="form-input"
                  title="Break End"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Date-Specific Overrides */}
      <div className="sectionCard">
        <div className="sectionHeader">
          <div>
            <h3 className="sectionTitle">Date-Specific Schedule Overrides</h3>
            <p style={{ fontSize: "0.825rem", color: "var(--text-muted)", margin: "2px 0 0" }}>
              Custom hours or special availability for specific dates (overrides regular weekly rules).
            </p>
          </div>
        </div>

        <div style={{ padding: "20px" }}>
          {/* Add Override Form */}
          <div
            style={{
              background: "var(--bg-muted)",
              padding: "16px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              marginBottom: "16px"
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr)) auto", gap: "12px", alignItems: "flex-end" }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Pick Target Date</label>
                <input
                  type="date"
                  value={newOverrideDate}
                  onChange={(e) => setNewOverrideDate(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Custom Status</label>
                <select
                  value={newOverrideAvailable ? "true" : "false"}
                  onChange={(e) => setNewOverrideAvailable(e.target.value === "true")}
                  className="form-select"
                >
                  <option value="true">Available with Custom Hours</option>
                  <option value="false">Off-duty / Blocked</option>
                </select>
              </div>

              {newOverrideAvailable && (
                <>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Start Time</label>
                    <input
                      type="time"
                      value={newOverrideStart}
                      onChange={(e) => setNewOverrideStart(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">End Time</label>
                    <input
                      type="time"
                      value={newOverrideEnd}
                      onChange={(e) => setNewOverrideEnd(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </>
              )}

              <button
                type="button"
                onClick={handleAddDateOverride}
                className="btn btn-secondary"
                style={{ height: "38px" }}
              >
                <Plus size={16} />
                <span>Add Override</span>
              </button>
            </div>
          </div>

          {/* List of active date overrides */}
          {dateOverrides.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)", fontSize: "0.85rem" }}>
              No date overrides configured. Your standard weekly schedule applies every day.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Custom Working Hours</th>
                    <th>Slot Size</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dateOverrides.map((ovr) => (
                    <tr key={ovr.date}>
                      <td style={{ fontWeight: 700 }}>{ovr.date}</td>
                      <td>
                        <span className={`badge ${ovr.is_available ? "badge-success" : "badge-danger"}`}>
                          {ovr.is_available ? "Available" : "Off-Duty"}
                        </span>
                      </td>
                      <td>
                        {ovr.is_available ? `${ovr.start_time} - ${ovr.end_time}` : "Whole Day Closed"}
                      </td>
                      <td>{ovr.is_available ? `${ovr.slot_duration_minutes || slotDuration} min` : "—"}</td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveDateOverride(ovr.date)}
                          className="btn btn-danger btn-sm"
                          title="Remove override"
                        >
                          <Trash2 size={13} />
                          <span>Remove</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 4. Leaves & Vacation Days */}
      <div className="sectionCard">
        <div className="sectionHeader">
          <div>
            <h3 className="sectionTitle">Doctor Leaves &amp; Holidays</h3>
            <p style={{ fontSize: "0.825rem", color: "var(--text-muted)", margin: "2px 0 0" }}>
              Mark vacation days or personal leaves. Booking will be locked for these dates.
            </p>
          </div>
        </div>

        <div style={{ padding: "20px" }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "flex-end", maxWidth: "420px", marginBottom: "16px" }}>
            <div className="form-group" style={{ margin: 0, flex: 1 }}>
              <label className="form-label">Add Leave Date</label>
              <input
                type="date"
                value={newExceptionDate}
                onChange={(e) => setNewExceptionDate(e.target.value)}
                className="form-input"
              />
            </div>
            <button
              type="button"
              onClick={handleAddException}
              className="btn btn-secondary"
              style={{ height: "38px" }}
            >
              <Plus size={16} />
              <span>Mark Leave</span>
            </button>
          </div>

          {unavailableDates.length === 0 ? (
            <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
              No leave dates on record.
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {unavailableDates.map((d) => (
                <div
                  key={d}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "var(--danger-subtle)",
                    color: "var(--danger)",
                    border: "1px solid var(--danger-border)",
                    padding: "6px 12px",
                    borderRadius: "var(--radius-full)",
                    fontSize: "0.825rem",
                    fontWeight: 600
                  }}
                >
                  <CalendarOff size={14} />
                  <span>{d}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveException(d)}
                    style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", display: "flex", padding: "2px" }}
                    title="Remove leave date"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Save Button Footer */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary btn-lg"
          style={{ minWidth: "220px" }}
        >
          {saving ? (
            <div className="spinner" style={{ width: "1.2rem", height: "1.2rem", color: "white" }} />
          ) : (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
              <Save size={18} />
              <span>Save Schedule Settings</span>
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default DoctorSchedule;
