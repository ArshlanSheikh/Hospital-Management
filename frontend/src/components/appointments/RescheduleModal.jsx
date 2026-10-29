import React, { useState, useEffect } from "react";
import { X, Calendar, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import apiClient from "../../api/client";

const RescheduleModal = ({ appointment, onClose, onRescheduleSuccess }) => {
  const [newDate, setNewDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Set default minimum date (tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDateStr = tomorrow.toISOString().split("T")[0];

  useEffect(() => {
    // Default to minimum date
    setNewDate(minDateStr);
  }, []);

  useEffect(() => {
    if (!newDate || !appointment?.doctor_id) return;

    const fetchSlots = async () => {
      setLoadingSlots(true);
      setError(null);
      setSelectedSlot("");
      try {
        const res = await apiClient.get(`/doctors/${appointment.doctor_id}/availability?date=${newDate}`);
        if (res.data?.success) {
          const slots = res.data.data.slots || [];
          setAvailableSlots(slots.filter((s) => s.is_available));
        }
      } catch (err) {
        setError(err.response?.data?.error?.message || "Failed to load slots for this date");
        setAvailableSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [newDate, appointment]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newDate || !selectedSlot) {
      setError("Please select both a date and an available time slot");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const apptId = appointment.id || appointment._id;
      const res = await apiClient.post(`/appointments/${apptId}/reschedule`, {
        appointment_date: newDate,
        start_time: selectedSlot
      });

      if (res.data?.success) {
        if (onRescheduleSuccess) {
          onRescheduleSuccess(res.data.data);
        }
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to reschedule appointment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1100,
        padding: "1rem"
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "white",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "500px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#f8fafc"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "rgba(10, 77, 104, 0.1)",
                color: "var(--primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Calendar size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>
                Reschedule Appointment
              </h3>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>
                Select a new consultation date and time
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px" }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} style={{ padding: "1.5rem" }}>
          {error && (
            <div
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                display: "flex",
                gap: "0.5rem",
                alignItems: "center",
                fontSize: "0.85rem",
                marginBottom: "1rem"
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Current Booking Info */}
          <div
            style={{
              padding: "0.85rem 1rem",
              background: "#f1f5f9",
              borderRadius: "8px",
              marginBottom: "1.25rem",
              fontSize: "0.85rem"
            }}
          >
            <div style={{ color: "#64748b" }}>Currently Scheduled:</div>
            <div style={{ fontWeight: 600, color: "#0f172a", marginTop: "2px" }}>
              {appointment?.doctor_name} &bull; {appointment?.appointment_date} at {appointment?.start_time}
            </div>
          </div>

          {/* Date Picker */}
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }}>
              New Consultation Date
            </label>
            <input
              type="date"
              min={minDateStr}
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="form-control"
              style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
              required
            />
          </div>

          {/* Slots Picker */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }}>
              Available Time Slots
            </label>

            {loadingSlots ? (
              <div style={{ padding: "1.5rem", textAlign: "center", color: "#64748b" }}>
                <div className="spinner" style={{ width: "1.5rem", height: "1.5rem", color: "var(--primary)", margin: "0 auto 0.5rem" }} />
                <span>Checking doctor availability...</span>
              </div>
            ) : availableSlots.length === 0 ? (
              <div
                style={{
                  padding: "1rem",
                  background: "#f8fafc",
                  border: "1px dashed #cbd5e1",
                  borderRadius: "8px",
                  textAlign: "center",
                  color: "#64748b",
                  fontSize: "0.85rem"
                }}
              >
                No available slots for this date. Please pick another date.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "0.5rem",
                  maxHeight: "160px",
                  overflowY: "auto",
                  padding: "2px"
                }}
              >
                {availableSlots.map((slot) => {
                  const isSelected = selectedSlot === slot.start_time;
                  return (
                    <button
                      key={slot.start_time}
                      type="button"
                      onClick={() => setSelectedSlot(slot.start_time)}
                      style={{
                        padding: "0.5rem",
                        borderRadius: "8px",
                        border: isSelected ? "2px solid var(--primary)" : "1px solid #e2e8f0",
                        background: isSelected ? "rgba(10, 77, 104, 0.08)" : "white",
                        color: isSelected ? "var(--primary)" : "#334155",
                        fontWeight: isSelected ? 700 : 500,
                        fontSize: "0.85rem",
                        cursor: "pointer",
                        transition: "all 0.15s"
                      }}
                    >
                      {slot.start_time}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} className="btn btn-outline">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedSlot}
              className="btn btn-primary"
              style={{ minWidth: "140px", justifyContent: "center" }}
            >
              {submitting ? (
                <div className="spinner" style={{ width: "1.2rem", height: "1.2rem", color: "white" }} />
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RescheduleModal;
