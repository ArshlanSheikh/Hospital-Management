import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, Clock, CheckCircle, XCircle, User, Video, FileText, Plus, PhoneCall } from "lucide-react";
import apiClient from "../../api/client";
import { useToast } from "../../context/ToastContext";
import IssuePrescriptionModal from "../../components/prescriptions/IssuePrescriptionModal";
import PrescriptionCard from "../../components/prescriptions/PrescriptionCard";

const DoctorAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");

  // Phase V2 State
  const [prescribingAppt, setPrescribingAppt] = useState(null);
  const [viewingRx, setViewingRx] = useState(null);
  const [editingRx, setEditingRx] = useState(null);

  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const handleStartCall = async (appt) => {
    try {
      await apiClient.post(`/consultations/${appt.id}/initiate-call`);
      navigate(`/consultation/${appt.id}`);
    } catch (err) {
      showError(err.message || "Failed to initiate call");
    }
  };

  const fetchAppointments = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const url = filterStatus === "all" ? "/appointments?limit=50" : `/appointments?status=${filterStatus}&limit=50`;
      const res = await apiClient.get(url);
      setAppointments(res.data?.data?.appointments || res.data?.appointments || []);
    } catch (err) {
      if (showSpinner) showError(err.message || "Failed to fetch appointments");
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments(true);
    const interval = setInterval(() => {
      fetchAppointments(false);
    }, 4000);
    return () => clearInterval(interval);
  }, [filterStatus]);

  const handleUpdateStatus = async (apptId, newStatus) => {
    try {
      await apiClient.patch(`/appointments/${apptId}/status`, { status: newStatus });
      showSuccess(`Appointment marked as ${newStatus}`);
      fetchAppointments();
    } catch (err) {
      showError(err.message || "Failed to update appointment status");
    }
  };

  const handleViewPrescription = async (appt) => {
    try {
      const res = await apiClient.get(`/prescriptions/appointment/${appt.id}`);
      const rx = res.data?.prescription || res.prescription || res.data;
      if (rx && rx.id) {
        setViewingRx(rx);
      } else {
        showError("No prescription found for this appointment.");
      }
    } catch (err) {
      showError(err.message || "Failed to load prescription");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--primary)", marginBottom: "0.3rem" }}>
            Patient Appointments & Consultations
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            Manage scheduled patient visits, start live telehealth video calls, and issue digital prescriptions.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex",
        gap: "0.5rem",
        marginBottom: "1.5rem",
        borderBottom: "1px solid var(--border)",
        paddingBottom: "0.5rem"
      }}>
        {["all", "confirmed", "completed", "cancelled"].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            style={{
              padding: "0.45rem 1rem",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.85rem",
              fontWeight: 600,
              border: "none",
              backgroundColor: filterStatus === status ? "var(--primary-light)" : "transparent",
              color: filterStatus === status ? "var(--primary)" : "var(--text-secondary)",
              transition: "all 0.15s ease",
              cursor: "pointer"
            }}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
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
          <h3>No Appointments Found</h3>
          <p style={{ color: "var(--text-secondary)" }}>No consultations found under this status tab.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {appointments.map((appt) => {
            const status = appt.appointment_status?.toLowerCase();
            const isOnline = appt.consultation_type === "video" || appt.consultation_type === "online";
            const isPaid = appt.payment_status === "completed";

            return (
              <div key={appt.id} className="card" style={{ padding: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "1.15rem", fontWeight: 700 }}>
                        Patient: {appt.patient_name || "Patient"}
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
                      <span className="badge badge-primary">
                        {isOnline ? "Video Call" : "In-Person"}
                      </span>
                      <span className={`badge ${isPaid ? "badge-success" : "badge-warning"}`}>
                        {isPaid ? "PAID" : "UNPAID"}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      Ref: <code style={{ fontSize: "0.85rem" }}>{appt.appointment_number}</code> &bull; Email: {appt.patient_email || "N/A"}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--primary)" }}>
                      ₹{appt.consultation_fee}
                    </span>
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
                    <User size={16} color="var(--text-muted)" />
                    <span><strong>Phone:</strong> {appt.patient_phone || "Not provided"}</span>
                  </div>
                </div>

                {appt.reason && (
                  <div style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                    <strong>Symptoms / Reason for Visit:</strong> {appt.reason}
                  </div>
                )}

                {/* Actions */}
                <div style={{
                  display: "flex",
                  gap: "0.75rem",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderTop: "1px solid var(--border)",
                  paddingTop: "0.75rem",
                  flexWrap: "wrap"
                }}>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    {/* Video Consultation Start / Rejoin Button */}
                    {isOnline && status !== "cancelled" && status !== "rejected" && (
                      <button
                        type="button"
                        onClick={() => handleStartCall(appt)}
                        className="btn"
                        style={{
                          background: appt.consultation_status === "in_progress" ? "#088395" : "#10b981",
                          color: "white",
                          fontSize: "0.85rem",
                          padding: "0.45rem 1rem",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.4rem",
                          border: "none",
                          cursor: "pointer",
                          fontWeight: 600
                        }}
                      >
                        <PhoneCall size={15} />
                        <span>
                          {appt.consultation_status === "in_progress"
                            ? "Rejoin Consultation Room"
                            : status === "completed"
                            ? "Call Again (Restart Video)"
                            : "Call Patient (Start Video)"}
                        </span>
                      </button>
                    )}

                    {/* Issue Prescription */}
                    {status === "confirmed" && (
                      <button
                        onClick={() => setPrescribingAppt(appt)}
                        className="btn btn-outline"
                        style={{
                          borderColor: "#7c3aed",
                          color: "#7c3aed",
                          fontSize: "0.85rem",
                          padding: "0.45rem 1rem",
                          gap: "0.35rem"
                        }}
                      >
                        <FileText size={16} />
                        <span>Issue Prescription (Rx)</span>
                      </button>
                    )}

                    {/* View Prescription if completed */}
                    {status === "completed" && (
                      <button
                        onClick={() => handleViewPrescription(appt)}
                        className="btn btn-outline"
                        style={{
                          borderColor: "#7c3aed",
                          color: "#7c3aed",
                          fontSize: "0.85rem",
                          padding: "0.45rem 1rem",
                          gap: "0.35rem"
                        }}
                      >
                        <FileText size={16} />
                        <span>View Prescription</span>
                      </button>
                    )}
                  </div>

                  {status === "confirmed" && (
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        onClick={() => handleUpdateStatus(appt.id, "completed")}
                        className="btn btn-secondary"
                        style={{ fontSize: "0.85rem", padding: "0.45rem 1rem", gap: "0.35rem" }}
                      >
                        <CheckCircle size={15} />
                        <span>Conclude</span>
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(appt.id, "rejected")}
                        className="btn btn-outline"
                        style={{ fontSize: "0.85rem", padding: "0.45rem 0.85rem", color: "var(--danger)" }}
                      >
                        <XCircle size={15} />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Prescription Modal */}
      {prescribingAppt && (
        <IssuePrescriptionModal
          appointment={prescribingAppt}
          onClose={() => setPrescribingAppt(null)}
          onPrescriptionIssued={(rx) => {
            showSuccess(`Prescription ${rx.prescription_number} issued successfully!`);
            fetchAppointments();
          }}
        />
      )}

      {/* Prescription View Card */}
      {viewingRx && (
        <PrescriptionCard
          prescription={viewingRx}
          onClose={() => setViewingRx(null)}
          onEdit={(rx) => {
            setViewingRx(null);
            setEditingRx(rx);
          }}
        />
      )}

      {/* Edit Prescription Modal */}
      {editingRx && (
        <IssuePrescriptionModal
          existingPrescription={editingRx}
          onClose={() => setEditingRx(null)}
          onPrescriptionIssued={(rx) => {
            showSuccess(`Prescription ${rx.prescription_number || ""} updated successfully!`);
            fetchAppointments(false);
          }}
        />
      )}
    </div>
  );
};

export default DoctorAppointments;
