import React, { useState, useEffect } from "react";
import { Calendar, Search, Filter, Clock, CheckCircle2, XCircle } from "lucide-react";
import apiClient from "../../api/client";
import { useToast } from "../../context/ToastContext";

const AdminAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const { showError } = useToast();

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      if (dateFilter) params.append("date", dateFilter);
      params.append("limit", "50");

      const res = await apiClient.get(`/admin/appointments?${params.toString()}`);
      setAppointments(res.data?.appointments || []);
    } catch (err) {
      showError(err.message || "Failed to load platform appointments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [statusFilter, dateFilter]);

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case "confirmed":
        return <span className="badge badge-success">Confirmed</span>;
      case "pending":
        return <span className="badge badge-warning">Pending</span>;
      case "completed":
        return <span className="badge badge-primary">Completed</span>;
      case "cancelled":
        return <span className="badge badge-danger">Cancelled</span>;
      default:
        return <span className="badge badge-secondary">{status}</span>;
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--text-dark)", marginBottom: "0.25rem" }}>
          Manage Appointments
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
          Platform-wide oversight of bookings, consultations, and statuses.
        </p>
      </div>

      <div className="card" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ minWidth: "180px" }}>
            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "0.25rem" }}>
              Filter by Status
            </label>
            <select
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div style={{ minWidth: "180px" }}>
            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "0.25rem" }}>
              Filter by Date
            </label>
            <input
              type="date"
              className="form-control"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>

          {(statusFilter || dateFilter) && (
            <div style={{ alignSelf: "flex-end" }}>
              <button
                onClick={() => {
                  setStatusFilter("");
                  setDateFilter("");
                }}
                className="btn btn-outline"
                style={{ fontSize: "0.85rem", padding: "0.55rem 1rem" }}
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center" }}>
            <div className="spinner" style={{ color: "var(--primary)", width: "2rem", height: "2rem", margin: "0 auto" }} />
          </div>
        ) : appointments.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
            <Calendar size={40} style={{ opacity: 0.4, marginBottom: "0.5rem" }} />
            <p>No appointments match the selected criteria.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-light)", borderBottom: "1px solid var(--border-color)" }}>
                  <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.85rem", fontWeight: 600 }}>Doctor</th>
                  <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.85rem", fontWeight: 600 }}>Patient</th>
                  <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.85rem", fontWeight: 600 }}>Date & Time</th>
                  <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.85rem", fontWeight: 600 }}>Fee / Type</th>
                  <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.85rem", fontWeight: 600 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((a) => (
                  <tr key={a.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <td style={{ padding: "1rem" }}>
                      <div style={{ fontWeight: 600, color: "var(--text-dark)" }}>{a.doctor_name || "Doctor"}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{a.doctor_specialization}</div>
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <div style={{ fontWeight: 600, color: "var(--text-dark)" }}>{a.patient_name || "Patient"}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{a.patient_phone || a.patient_email}</div>
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <div style={{ fontWeight: 600, color: "var(--text-dark)" }}>{a.appointment_date}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        <Clock size={12} /> {a.start_time} - {a.end_time}
                      </div>
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <div style={{ fontWeight: 600, color: "var(--text-dark)" }}>₹{a.consultation_fee}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "capitalize" }}>
                        {a.consultation_type?.replace("_", " ")}
                      </div>
                    </td>
                    <td style={{ padding: "1rem" }}>
                      {getStatusBadge(a.appointment_status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAppointments;
