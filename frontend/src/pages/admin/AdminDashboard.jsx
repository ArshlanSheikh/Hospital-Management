import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Users, Calendar, ShieldCheck, Clock, ArrowRight, UserCheck, ClipboardList } from "lucide-react";
import apiClient from "../../api/client";

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await apiClient.get("/admin/stats");
        setStats(res.data);
      } catch (err) {
        console.error("Failed to load admin stats", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

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
        <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--primary)", marginBottom: "0.4rem" }}>
          Platform Master Administration
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
          Doctor credential verification, user account management, and platform-wide appointment oversight.
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "1.25rem",
        marginBottom: "2.5rem"
      }}>
        <div className="card" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: "3rem", height: "3rem", borderRadius: "var(--radius-sm)", backgroundColor: "var(--primary-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>{stats?.total_patients ?? 0}</div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Registered Patients</div>
          </div>
        </div>

        <div className="card" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: "3rem", height: "3rem", borderRadius: "var(--radius-sm)", backgroundColor: "var(--success-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--success)" }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>{stats?.verified_doctors ?? 0}</div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Verified Doctors ({stats?.pending_doctors ?? 0} pending)
            </div>
          </div>
        </div>

        <div className="card" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: "3rem", height: "3rem", borderRadius: "var(--radius-sm)", backgroundColor: "var(--warning-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--warning)" }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>{stats?.pending_doctors ?? 0}</div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Pending Verifications</div>
          </div>
        </div>

        <div className="card" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: "3rem", height: "3rem", borderRadius: "var(--radius-sm)", backgroundColor: "var(--accent-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--secondary)" }}>
            <Calendar size={22} />
          </div>
          <div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>{stats?.total_appointments ?? 0}</div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Total Appointments</div>
          </div>
        </div>
      </div>

      {/* Action Queues */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "1.5rem"
      }}>
        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Doctor Verification</h2>
              <span className={`badge ${stats?.pending_doctors > 0 ? "badge-warning" : "badge-success"}`}>
                {stats?.pending_doctors ?? 0} Pending
              </span>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.5, marginBottom: "1.5rem" }}>
              Review credentials, medical qualifications, and approve or reject practicing physicians.
            </p>
          </div>
          <Link to="/admin/doctors" className="btn btn-primary" style={{ justifyContent: "space-between" }}>
            <span>Review Doctor Approvals</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Patient Management</h2>
              <span className="badge badge-info">{stats?.total_patients ?? 0} Registered</span>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.5, marginBottom: "1.5rem" }}>
              View registered patients, emergency details, and manage active or suspended account statuses.
            </p>
          </div>
          <Link to="/admin/patients" className="btn btn-outline" style={{ justifyContent: "space-between" }}>
            <span>Manage Patients</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Appointment Oversight</h2>
              <span className="badge badge-primary">{stats?.active_appointments ?? 0} Active</span>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.5, marginBottom: "1.5rem" }}>
              Platform-wide oversight of bookings, consultations, statuses, and cancellation history.
            </p>
          </div>
          <Link to="/admin/appointments" className="btn btn-outline" style={{ justifyContent: "space-between" }}>
            <span>View All Appointments</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
