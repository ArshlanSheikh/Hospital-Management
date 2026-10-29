import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, Stethoscope, User, ArrowRight, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import apiClient from "../../api/client";

const PatientDashboard = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const res = await apiClient.get("/appointments?limit=5");
        setAppointments(res.data?.appointments || []);
      } catch (err) {
        console.error("Failed to load appointments", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAppointments();
  }, []);

  const upcoming = appointments.filter((a) => a.appointment_status?.toLowerCase() === "confirmed");
  const nextAppt = upcoming[0];

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--primary)", marginBottom: "0.4rem" }}>
          Welcome back, {user?.name || user?.email?.split("@")[0]}
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
          Manage your upcoming consultations, view doctor appointments, and book new medical visits.
        </p>
      </div>

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
            <div style={{ fontSize: "1.4rem", fontWeight: 800 }}>{upcoming.length}</div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Upcoming Visits</div>
          </div>
        </div>

        <div className="card" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: "3rem", height: "3rem", borderRadius: "var(--radius-sm)", backgroundColor: "var(--success-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--success)" }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800 }}>{appointments.length}</div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Total Bookings</div>
          </div>
        </div>

        <div className="card" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: "3rem", height: "3rem", borderRadius: "var(--radius-sm)", backgroundColor: "var(--accent-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--secondary)" }}>
            <Stethoscope size={22} />
          </div>
          <div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800 }}>Active</div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Verified Platform</div>
          </div>
        </div>
      </div>

      {/* Next Appointment Card */}
      {nextAppt && (
        <div className="card" style={{
          backgroundColor: "#FFFFFF",
          border: "2px solid var(--primary)",
          marginBottom: "2.5rem",
          padding: "1.75rem"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
            <span className="badge badge-primary">Next Confirmed Consultation</span>
            <span className="badge badge-success">{nextAppt.consultation_type?.replace("_", " ")}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1.5rem" }}>
            <div>
              <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--primary)" }}>
                {nextAppt.doctor_name || "Doctor"}
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.2rem" }}>
                Specialization: {nextAppt.doctor_specialization || "General Medicine"}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", marginTop: "0.75rem", fontSize: "0.9rem", fontWeight: 600 }}>
                <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--primary)" }}>
                  <Calendar size={16} />
                  {nextAppt.appointment_date}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--secondary)" }}>
                  <Clock size={16} />
                  {nextAppt.start_time} - {nextAppt.end_time}
                </span>
              </div>
            </div>

            <div>
              <Link to="/patient/appointments" className="btn btn-primary" style={{ gap: "0.5rem" }}>
                <span>Manage Appointment</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Recent Appointments */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)" }}>
            Recent Appointments
          </h2>
          <Link to="/patient/appointments" style={{ fontSize: "0.88rem", color: "var(--primary)", fontWeight: 600 }}>
            View All
          </Link>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <div className="spinner" style={{ color: "var(--primary)" }} />
          </div>
        ) : appointments.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-muted)" }}>
            <Calendar size={40} style={{ margin: "0 auto 0.75rem", opacity: 0.5 }} />
            <p>You have not booked any appointments yet.</p>
            <Link to="/doctors" className="btn btn-primary" style={{ marginTop: "1rem" }}>
              Find a Doctor
            </Link>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-light)", borderBottom: "1px solid var(--border)" }}>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "left" }}>Doctor</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "left" }}>Specialization</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "left" }}>Date & Time</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "left" }}>Fee</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "left" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appt) => {
                  const status = appt.appointment_status?.toLowerCase();
                  return (
                    <tr key={appt.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>{appt.doctor_name || "Doctor"}</td>
                      <td style={{ padding: "0.75rem 1rem" }}>{appt.doctor_specialization || "General Medicine"}</td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <div>{appt.appointment_date}</div>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{appt.start_time} - {appt.end_time}</div>
                      </td>
                      <td style={{ padding: "0.75rem 1rem", fontWeight: 700 }}>₹{appt.consultation_fee}</td>
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

export default PatientDashboard;
