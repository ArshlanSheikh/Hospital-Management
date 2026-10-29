import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Users, Calendar, Clock, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import apiClient from "../../api/client";

const DoctorDashboard = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [appRes, docRes] = await Promise.all([
          apiClient.get("/appointments?limit=10"),
          apiClient.get("/doctors/me"),
        ]);
        setAppointments(appRes.data?.appointments || []);
        setDoctorProfile(docRes.data || null);
      } catch (err) {
        console.error("Dashboard fetch error", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const confirmedAppts = appointments.filter((a) => a.appointment_status === "confirmed");
  const isVerified = doctorProfile?.verification_status === "verified";

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--primary)", marginBottom: "0.4rem" }}>
          Doctor Workspace: {doctorProfile?.full_name || user?.name || user?.email?.split("@")[0]}
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
          Specialization: <strong>{doctorProfile?.specialization || "General Medicine"}</strong> • Manage your patient queue, configure weekly consultation hours, and manage availability.
        </p>
      </div>

      {/* Verification Notice Banner */}
      {doctorProfile && !isVerified && (
        <div style={{
          backgroundColor: "var(--warning-light)",
          border: "1.5px solid var(--warning-border)",
          color: "var(--warning)",
          padding: "1.25rem 1.5rem",
          borderRadius: "var(--radius-md)",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "2rem"
        }}>
          <AlertTriangle size={24} style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: "1rem" }}>Account Verification Pending</div>
            <div style={{ fontSize: "0.88rem", marginTop: "0.2rem" }}>
              Your doctor account is currently under review by our platform administrator. Once verified, your profile and available consultation time slots will become publicly bookable.
            </div>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "1.25rem",
        marginBottom: "2.5rem"
      }}>
        <div className="card" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: "3rem", height: "3rem", borderRadius: "var(--radius-sm)", backgroundColor: "var(--primary-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>
            <Calendar size={22} />
          </div>
          <div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800 }}>{confirmedAppts.length}</div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Active Confirmed</div>
          </div>
        </div>

        <div className="card" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: "3rem", height: "3rem", borderRadius: "var(--radius-sm)", backgroundColor: "var(--success-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--success)" }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800 }}>{appointments.length}</div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Recent Bookings</div>
          </div>
        </div>

        <div className="card" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: "3rem", height: "3rem", borderRadius: "var(--radius-sm)", backgroundColor: "var(--accent-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--secondary)" }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800 }}>₹{doctorProfile?.consultation_fee || 500}</div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Consultation Fee</div>
          </div>
        </div>
      </div>

      {/* Upcoming Appointments Queue */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)" }}>
            Recent Appointment Queue
          </h2>
          <Link to="/doctor/appointments" style={{ fontSize: "0.88rem", color: "var(--primary)", fontWeight: 600 }}>
            View All Appointments
          </Link>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <div className="spinner" style={{ color: "var(--primary)" }} />
          </div>
        ) : appointments.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-muted)" }}>
            <Calendar size={40} style={{ margin: "0 auto 0.75rem", opacity: 0.5 }} />
            <p>No appointments scheduled yet.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-light)", borderBottom: "1px solid var(--border)" }}>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "left" }}>Patient Name</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "left" }}>Date</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "left" }}>Time Slot</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "left" }}>Type</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "left" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appt) => {
                  const status = appt.appointment_status?.toLowerCase();
                  return (
                    <tr key={appt.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>{appt.patient_name || "Patient"}</td>
                      <td style={{ padding: "0.75rem 1rem" }}>{appt.appointment_date}</td>
                      <td style={{ padding: "0.75rem 1rem" }}>{appt.start_time} - {appt.end_time}</td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <span className="badge badge-primary">{appt.consultation_type?.replace("_", " ")}</span>
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <span className={`badge ${
                          status === "confirmed"
                            ? "badge-success"
                            : status === "completed"
                            ? "badge-info"
                            : "badge-danger"
                        }`}>
                          {status?.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorDashboard;
