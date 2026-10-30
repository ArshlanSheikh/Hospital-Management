import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Calendar,
  ShieldCheck,
  Clock,
  ArrowRight,
  UserCheck,
  ClipboardList,
  AlertCircle,
  RefreshCw,
  Award
} from "lucide-react";
import apiClient from "../../api/client";
import styles from "../doctor/DoctorDashboard.module.css";

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/admin/stats");
      setStats(res.data);
    } catch (err) {
      console.error("Failed to load admin stats", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <div className="spinner" style={{ color: "var(--primary)", width: "2.5rem", height: "2.5rem", margin: "0 auto 12px" }} />
        <p style={{ color: "var(--text-muted)" }}>Loading platform metrics...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header Row */}
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Master Administration</h1>
          <p className={styles.subtitle}>
            Platform-wide credential verification, user account audits, and clinical appointment management
          </p>
        </div>

        <button
          type="button"
          onClick={fetchStats}
          className="btn btn-secondary btn-sm"
          title="Refresh stats"
        >
          <RefreshCw size={14} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* Hero Spotlight Banner */}
      <div className={styles.heroBanner}>
        <div className={styles.heroContent}>
          <h2>
            <span>MediPulse Health Management Platform</span>
            <span className="badge badge-success" style={{ fontSize: "0.725rem" }}>
              Live System Active
            </span>
          </h2>
          <p>
            {stats?.pending_doctors > 0
              ? `Action Required: ${stats.pending_doctors} doctor verification application(s) awaiting administrative review.`
              : "All practitioner profiles and medical credential licenses are up-to-date."}
          </p>
        </div>

        <div className={styles.heroActions}>
          <Link to="/admin/doctors" className={styles.bannerBtn}>
            <ShieldCheck size={16} />
            <span>Review Doctor Approvals</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.iconWrapper} style={{ backgroundColor: "#eff6ff", color: "#2563eb" }}>
            <Users size={22} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Registered Patients</div>
            <div className={styles.kpiValue}>{stats?.total_patients ?? 0}</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.iconWrapper} style={{ backgroundColor: "#ecfdf5", color: "#10b981" }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Verified Doctors</div>
            <div className={styles.kpiValue}>{stats?.verified_doctors ?? 0}</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.iconWrapper} style={{ backgroundColor: "#fffbeb", color: "#d97706" }}>
            <Clock size={22} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Pending Reviews</div>
            <div className={styles.kpiValue}>{stats?.pending_doctors ?? 0}</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.iconWrapper} style={{ backgroundColor: "#f0f9ff", color: "#0284c7" }}>
            <Calendar size={22} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Total Consultations</div>
            <div className={styles.kpiValue}>{stats?.total_appointments ?? 0}</div>
          </div>
        </div>
      </div>

      {/* Action Queues */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>Doctor Credential Verification</span>
            <span className="badge badge-warning">{stats?.pending_doctors ?? 0} Pending</span>
          </div>
          <div style={{ padding: "20px", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "140px" }}>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.5, margin: 0 }}>
              Audit medical council licenses, specialist certifications, and practice fees before making doctor time-slots publicly bookable.
            </p>
            <div style={{ marginTop: "16px" }}>
              <Link to="/admin/doctors" className="btn btn-primary btn-sm" style={{ width: "100%", justifyContent: "center" }}>
                <span>Manage Doctors Directory</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>

        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>Patient Health Records Oversight</span>
            <span className="badge badge-primary">{stats?.total_patients ?? 0} Active</span>
          </div>
          <div style={{ padding: "20px", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "140px" }}>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.5, margin: 0 }}>
              Monitor patient account statuses, emergency health records, and profile completion across the hospital system.
            </p>
            <div style={{ marginTop: "16px" }}>
              <Link to="/admin/patients" className="btn btn-secondary btn-sm" style={{ width: "100%", justifyContent: "center" }}>
                <span>View Patient Records</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>

        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>Appointment Booking System</span>
            <span className="badge badge-success">{stats?.total_appointments ?? 0} Total</span>
          </div>
          <div style={{ padding: "20px", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "140px" }}>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.5, margin: 0 }}>
              Live consultation tracking, telehealth session audits, fee reconciliation, and cancellation oversight.
            </p>
            <div style={{ marginTop: "16px" }}>
              <Link to="/admin/appointments" className="btn btn-secondary btn-sm" style={{ width: "100%", justifyContent: "center" }}>
                <span>Inspect Appointments</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
