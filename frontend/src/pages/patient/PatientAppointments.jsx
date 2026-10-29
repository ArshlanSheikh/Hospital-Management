import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, Stethoscope, XCircle, AlertCircle, CheckCircle2 } from "lucide-react";
import apiClient from "../../api/client";
import { useToast } from "../../context/ToastContext";

const PatientAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [cancellingAppt, setCancellingAppt] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [submittingCancel, setSubmittingCancel] = useState(false);
  const { showSuccess, showError } = useToast();

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const url = activeTab === "all" ? "/appointments?limit=50" : `/appointments?status=${activeTab}&limit=50`;
      const res = await apiClient.get(url);
      setAppointments(res.data?.appointments || []);
    } catch (err) {
      showError(err.message || "Failed to fetch appointments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [activeTab]);

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      showError("Please provide a reason for cancellation");
      return;
    }

    setSubmittingCancel(true);
    try {
      await apiClient.post(`/appointments/${cancellingAppt.id}/cancel`, {
        reason: cancelReason.trim(),
      });
      showSuccess("Appointment cancelled successfully");
      setCancellingAppt(null);
      setCancelReason("");
      fetchAppointments();
    } catch (err) {
      showError(err.message || "Failed to cancel appointment");
    } finally {
      setSubmittingCancel(false);
    }
  };

  return (
    <div>
      {/* Cancellation Modal */}
      {cancellingAppt && (
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
          <div className="card" style={{ maxWidth: "460px", width: "100%", padding: "2rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <div style={{ width: "2.5rem", height: "2.5rem", borderRadius: "50%", backgroundColor: "var(--danger-light)", color: "var(--danger)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <XCircle size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Cancel Appointment</h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  {cancellingAppt.doctor_name}
                </p>
              </div>
            </div>

            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "1.25rem", lineHeight: 1.5 }}>
              Are you sure you want to cancel your visit with <strong>{cancellingAppt.doctor_name}</strong> on <strong>{cancellingAppt.appointment_date}</strong> at <strong>{cancellingAppt.start_time}</strong>?
            </p>

            <form onSubmit={handleCancelSubmit}>
              <div className="form-group" style={{ marginBottom: "1.25rem" }}>
                <label className="form-label">Reason for Cancellation *</label>
                <textarea
                  rows={3}
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Schedule conflict, feeling better, need to reschedule..."
                  className="form-control"
                />
              </div>

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => { setCancellingAppt(null); setCancelReason(""); }}
                  className="btn btn-outline"
                >
                  Keep Appointment
                </button>
                <button
                  type="submit"
                  disabled={submittingCancel}
                  className="btn btn-danger"
                >
                  {submittingCancel ? <div className="spinner" /> : "Confirm Cancellation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--primary)", marginBottom: "0.3rem" }}>
            My Appointments
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            Track your appointment history, view doctor info, or cancel upcoming visits.
          </p>
        </div>
        <Link to="/doctors" className="btn btn-primary">
          Book New Appointment
        </Link>
      </div>

      {/* Status Filter Tabs */}
      <div style={{
        display: "flex",
        gap: "0.5rem",
        marginBottom: "1.5rem",
        borderBottom: "1px solid var(--border)",
        paddingBottom: "0.5rem"
      }}>
        {["all", "confirmed", "completed", "cancelled"].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "0.45rem 1rem",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.85rem",
              fontWeight: 600,
              border: "none",
              backgroundColor: activeTab === tab ? "var(--primary-light)" : "transparent",
              color: activeTab === tab ? "var(--primary)" : "var(--text-secondary)",
              transition: "all 0.15s ease",
              cursor: "pointer"
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem 0" }}>
          <div className="spinner" style={{ color: "var(--primary)", width: "2.5rem", height: "2.5rem" }} />
        </div>
      ) : appointments.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "4rem 2rem" }}>
          <Calendar size={48} color="var(--text-muted)" style={{ margin: "0 auto 1rem" }} />
          <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>No Appointments in this tab</h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
            You do not have any {activeTab} appointments.
          </p>
          <Link to="/doctors" className="btn btn-primary">
            Find and Book a Doctor
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {appointments.map((appt) => {
            const status = appt.appointment_status?.toLowerCase();
            return (
              <div key={appt.id} className="card" style={{ padding: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
                      <span style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)" }}>
                        {appt.doctor_name || "Doctor"}
                      </span>
                      <span className={`badge ${
                        status === "confirmed"
                          ? "badge-success"
                          : status === "completed"
                          ? "badge-info"
                          : "badge-danger"
                      }`}>
                        {status?.toUpperCase()}
                      </span>
                      <span className="badge badge-primary">{appt.consultation_type?.replace("_", " ")}</span>
                    </div>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>
                      Specialization: {appt.doctor_specialization || "General Medicine"}
                    </p>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Fee</span>
                    <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--primary)" }}>₹{appt.consultation_fee}</span>
                  </div>
                </div>

                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "1rem",
                  padding: "1rem",
                  backgroundColor: "var(--bg-page)",
                  borderRadius: "var(--radius-sm)",
                  marginBottom: "1rem",
                  fontSize: "0.88rem"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Calendar size={16} color="var(--primary)" />
                    <span><strong>Date:</strong> {appt.appointment_date}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Clock size={16} color="var(--secondary)" />
                    <span><strong>Time:</strong> {appt.start_time} - {appt.end_time}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Stethoscope size={16} color="var(--text-muted)" />
                    <span><strong>Duration:</strong> {appt.duration_minutes || 30} mins</span>
                  </div>
                </div>

                {appt.reason && (
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                    <strong>Reason for Visit:</strong> {appt.reason}
                  </div>
                )}

                {appt.cancellation_reason && (
                  <div style={{
                    backgroundColor: "var(--danger-light)",
                    border: "1px solid var(--danger-border)",
                    color: "var(--danger)",
                    padding: "0.6rem 0.9rem",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "0.85rem",
                    marginBottom: "1rem"
                  }}>
                    <strong>Cancellation Reason:</strong> {appt.cancellation_reason}
                  </div>
                )}

                {status === "confirmed" && (
                  <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid var(--border)", paddingTop: "0.75rem" }}>
                    <button
                      onClick={() => setCancellingAppt(appt)}
                      className="btn btn-outline"
                      style={{ fontSize: "0.85rem", color: "var(--danger)", borderColor: "var(--danger-border)" }}
                    >
                      Cancel Appointment
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PatientAppointments;
