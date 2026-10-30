import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Calendar,
  Clock,
  CheckCircle2,
  Award,
  Video,
  UserCheck,
  AlertCircle
} from "lucide-react";
import { format, addDays } from "date-fns";
import apiClient from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

const DoctorDetail = () => {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const { user, isPatient, isAuthenticated } = useAuth();
  const { showSuccess, showError } = useToast();

  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);

  // Booking state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [consultationType, setConsultationType] = useState("in_person");
  const [reasonForVisit, setReasonForVisit] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // Available dates for booking strip (next 10 days)
  const availableDates = Array.from({ length: 10 }, (_, i) => addDays(new Date(), i));

  // Load doctor details
  useEffect(() => {
    const fetchDoctor = async () => {
      try {
        const res = await apiClient.get(`/doctors/${doctorId}`);
        setDoctor(res.data);
      } catch (err) {
        showError("Failed to load doctor profile");
      } finally {
        setLoading(false);
      }
    };
    fetchDoctor();
  }, [doctorId]);

  // Load available slots whenever selectedDate changes
  useEffect(() => {
    const fetchSlots = async () => {
      if (!doctorId) return;
      setSlotsLoading(true);
      setSelectedSlot(null);
      try {
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const res = await apiClient.get(`/doctors/${doctorId}/availability?date=${dateStr}&available_only=true`);
        const slotsArray = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
        setSlots(slotsArray.filter((s) => s.is_available !== false));
      } catch (err) {
        console.error("Failed to fetch slots", err);
        setSlots([]);
      } finally {
        setSlotsLoading(false);
      }
    };

    fetchSlots();
  }, [doctorId, selectedDate]);

  const handleBookingSubmit = async (e) => {
    e.preventDefault();

    if (!isAuthenticated) {
      showError("Please log in as a patient to book an appointment");
      navigate("/login");
      return;
    }

    if (!isPatient) {
      showError("Only patient accounts can book appointments");
      return;
    }

    if (!selectedSlot) {
      showError("Please select an available time slot");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        doctor_id: doctor.id,
        consultation_type: consultationType,
        appointment_date: format(selectedDate, "yyyy-MM-dd"),
        start_time: selectedSlot.start_time,
        reason: reasonForVisit,
      };

      const res = await apiClient.post("/appointments", payload);
      setConfirmedBooking(res.data);
      showSuccess("Appointment booked and confirmed successfully!");
    } catch (err) {
      showError(err.message || "Failed to book appointment");
      // Refresh slots in case slot was just taken
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const slotsRes = await apiClient.get(`/doctors/${doctorId}/availability?date=${dateStr}&available_only=true`);
      const freshSlots = Array.isArray(slotsRes.data) ? slotsRes.data : (Array.isArray(slotsRes) ? slotsRes : []);
      setSlots(freshSlots.filter((s) => s.is_available !== false));
      setSelectedSlot(null);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "6rem 0" }}>
        <div className="spinner" style={{ width: "3rem", height: "3rem", color: "var(--primary)" }} />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="container" style={{ padding: "5rem 0", textAlign: "center" }}>
        <h2>Doctor Not Found</h2>
        <Link to="/doctors" className="btn btn-primary" style={{ marginTop: "1rem" }}>
          Back to Doctor Directory
        </Link>
      </div>
    );
  }

  const qualText = Array.isArray(doctor.qualifications)
    ? doctor.qualifications.join(", ")
    : doctor.qualifications || "";

  return (
    <div style={{ padding: "3rem 0 5rem" }}>
      <div className="container">
        {/* Success Modal */}
        {confirmedBooking && (
          <div style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "1rem"
          }}>
            <div className="card" style={{ maxWidth: "480px", width: "100%", padding: "2.5rem", textAlign: "center" }}>
              <div style={{
                width: "4.5rem",
                height: "4.5rem",
                borderRadius: "50%",
                backgroundColor: "var(--success-light)",
                color: "var(--success)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.5rem"
              }}>
                <CheckCircle2 size={36} />
              </div>
              <h2 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--primary)", marginBottom: "0.5rem" }}>
                Appointment Confirmed!
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginBottom: "1.5rem" }}>
                Your appointment has been successfully scheduled with {doctor.full_name}.
              </p>

              <div style={{
                backgroundColor: "var(--bg-page)",
                borderRadius: "var(--radius-sm)",
                padding: "1rem",
                textAlign: "left",
                marginBottom: "2rem",
                fontSize: "0.9rem"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Doctor:</span>
                  <span style={{ fontWeight: 700, color: "var(--primary)" }}>{doctor.full_name}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Date:</span>
                  <span style={{ fontWeight: 600 }}>{confirmedBooking.appointment_date}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Time:</span>
                  <span style={{ fontWeight: 600 }}>{confirmedBooking.start_time} - {confirmedBooking.end_time}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Consultation Fee:</span>
                  <span style={{ fontWeight: 700, color: "var(--success)" }}>₹{confirmedBooking.consultation_fee}</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "1rem" }}>
                <Link to="/patient/appointments" className="btn btn-primary" style={{ flex: 1 }}>
                  View My Appointments
                </Link>
                <button
                  onClick={() => setConfirmedBooking(null)}
                  className="btn btn-outline"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "2.5rem", alignItems: "flex-start" }}>
          {/* Left Column: Doctor Profile Info */}
          <div>
            <div className="card" style={{ marginBottom: "2rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                <div>
                  <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-primary)" }}>
                    {doctor.full_name}
                  </h1>
                  <p style={{ fontSize: "1rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                    {qualText}
                  </p>
                </div>
                <span className="badge badge-success" style={{ gap: "0.25rem" }}>
                  <CheckCircle2 size={14} />
                  <span>Verified Specialist</span>
                </span>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <span className="badge badge-primary" style={{ fontSize: "0.85rem", padding: "0.35rem 0.75rem" }}>
                  {doctor.specialization}
                </span>
              </div>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "1rem",
                padding: "1rem",
                backgroundColor: "var(--bg-page)",
                borderRadius: "var(--radius-sm)",
                marginBottom: "1.5rem"
              }}>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Experience</span>
                  <span style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    {doctor.experience_years}+ Years
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Consultation Rate</span>
                  <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--primary)" }}>
                    ₹{doctor.consultation_fee}
                  </span>
                </div>
              </div>

              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem" }}>About the Doctor</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "1.5rem" }}>
                {doctor.bio || "Dedicated healthcare professional providing comprehensive clinical medical examinations, diagnostics, and patient-centered treatments."}
              </p>
            </div>
          </div>

          {/* Right Column: Live Booking Widget */}
          <div>
            <div className="card" style={{ position: "sticky", top: "6rem", boxShadow: "var(--shadow-md)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--primary)" }}>
                  Book an Appointment
                </h2>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Consultation Fee</span>
                  <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--primary)" }}>
                    ₹{doctor.consultation_fee}
                  </span>
                </div>
              </div>

              <form onSubmit={handleBookingSubmit}>
                {/* Consultation Type Selector */}
                <div className="form-group" style={{ marginBottom: "1.25rem" }}>
                  <label className="form-label">Consultation Type</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                    <button
                      type="button"
                      onClick={() => setConsultationType("in_person")}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.4rem",
                        padding: "0.65rem",
                        borderRadius: "var(--radius-sm)",
                        border: `1.5px solid ${consultationType === "in_person" ? "var(--primary)" : "var(--border)"}`,
                        backgroundColor: consultationType === "in_person" ? "var(--primary-light)" : "transparent",
                        color: consultationType === "in_person" ? "var(--primary)" : "var(--text-secondary)",
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        cursor: "pointer"
                      }}
                    >
                      <UserCheck size={16} />
                      <span>In-Person Visit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConsultationType("video")}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.4rem",
                        padding: "0.65rem",
                        borderRadius: "var(--radius-sm)",
                        border: `1.5px solid ${consultationType === "video" ? "var(--primary)" : "var(--border)"}`,
                        backgroundColor: consultationType === "video" ? "var(--primary-light)" : "transparent",
                        color: consultationType === "video" ? "var(--primary)" : "var(--text-secondary)",
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        cursor: "pointer"
                      }}
                    >
                      <Video size={16} />
                      <span>Online Video</span>
                    </button>
                  </div>
                </div>

                {/* Date Selector Horizontal Strip */}
                <div className="form-group" style={{ marginBottom: "1.25rem" }}>
                  <label className="form-label">Select Date</label>
                  <div style={{
                    display: "flex",
                    gap: "0.5rem",
                    overflowX: "auto",
                    paddingBottom: "0.5rem"
                  }}>
                    {availableDates.map((d, index) => {
                      const isSelected = format(selectedDate, "yyyy-MM-dd") === format(d, "yyyy-MM-dd");
                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setSelectedDate(d)}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            minWidth: "64px",
                            padding: "0.6rem 0.4rem",
                            borderRadius: "var(--radius-sm)",
                            border: `1.5px solid ${isSelected ? "var(--primary)" : "var(--border)"}`,
                            backgroundColor: isSelected ? "var(--primary)" : "#FFFFFF",
                            color: isSelected ? "#FFFFFF" : "var(--text-primary)",
                            transition: "all 0.15s ease",
                            cursor: "pointer"
                          }}
                        >
                          <span style={{ fontSize: "0.72rem", textTransform: "uppercase", fontWeight: 600 }}>
                            {format(d, "EEE")}
                          </span>
                          <span style={{ fontSize: "1.1rem", fontWeight: 800 }}>
                            {format(d, "d")}
                          </span>
                          <span style={{ fontSize: "0.7rem", opacity: 0.8 }}>
                            {format(d, "MMM")}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Live Available Slots */}
                <div className="form-group" style={{ marginBottom: "1.25rem" }}>
                  <label className="form-label">Available Time Slots</label>
                  {slotsLoading ? (
                    <div style={{ textAlign: "center", padding: "1.5rem" }}>
                      <div className="spinner" style={{ color: "var(--primary)" }} />
                    </div>
                  ) : slots.length === 0 ? (
                    <div style={{
                      backgroundColor: "var(--bg-page)",
                      padding: "1rem",
                      borderRadius: "var(--radius-sm)",
                      textAlign: "center",
                      color: "var(--text-muted)",
                      fontSize: "0.88rem"
                    }}>
                      No consulting hours scheduled on this date.
                    </div>
                  ) : (
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "0.5rem"
                    }}>
                      {slots.map((slot, index) => {
                        const isChosen = selectedSlot?.start_time === slot.start_time;
                        return (
                          <button
                            key={index}
                            type="button"
                            disabled={!slot.is_available}
                            onClick={() => setSelectedSlot(slot)}
                            style={{
                              padding: "0.55rem 0.2rem",
                              borderRadius: "var(--radius-sm)",
                              fontSize: "0.82rem",
                              fontWeight: 600,
                              textAlign: "center",
                              border: isChosen
                                ? "2px solid var(--primary)"
                                : slot.is_available
                                ? "1px solid var(--border)"
                                : "1px dashed #CBD5E1",
                              backgroundColor: isChosen
                                ? "var(--primary)"
                                : slot.is_available
                                ? "#FFFFFF"
                                : "#F1F5F9",
                              color: isChosen
                                ? "#FFFFFF"
                                : slot.is_available
                                ? "var(--text-primary)"
                                : "var(--text-muted)",
                              cursor: slot.is_available ? "pointer" : "not-allowed",
                              textDecoration: slot.is_available ? "none" : "line-through",
                              transition: "all 0.15s ease"
                            }}
                          >
                            {slot.start_time}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Reason for visit */}
                <div className="form-group" style={{ marginBottom: "1.25rem" }}>
                  <label className="form-label">Symptoms / Reason for Visit (Optional)</label>
                  <textarea
                    rows={2}
                    value={reasonForVisit}
                    onChange={(e) => setReasonForVisit(e.target.value)}
                    placeholder="Briefly describe your health concern..."
                    className="form-control"
                  />
                </div>

                {/* Submit CTA */}
                <button
                  type="submit"
                  disabled={submitting || !selectedSlot}
                  className="btn btn-primary"
                  style={{ width: "100%", padding: "0.85rem", fontSize: "0.95rem" }}
                >
                  {submitting ? (
                    <div className="spinner" />
                  ) : !selectedSlot ? (
                    "Select a Time Slot to Book"
                  ) : (
                    `Confirm Appointment (₹${doctor.consultation_fee})`
                  )}
                </button>

                {!isAuthenticated && (
                  <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", textAlign: "center", marginTop: "0.75rem" }}>
                    You will be prompted to log in or create an account to finalize your booking.
                  </p>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorDetail;
