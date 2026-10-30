import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Calendar,
  Clock,
  Stethoscope,
  User,
  ArrowRight,
  CheckCircle2,
  FileText,
  Video,
  ShieldCheck,
  Heart,
  Phone,
  PhoneCall,
  Search,
  Eye,
  PlusCircle,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import apiClient from "../../api/client";
import PrescriptionCard from "../../components/prescriptions/PrescriptionCard";
import { useToast } from "../../context/ToastContext";
import styles from "../doctor/DoctorDashboard.module.css";

const PatientDashboard = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedRx, setSelectedRx] = useState(null);

  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [appRes, rxRes, profRes] = await Promise.all([
        apiClient.get("/appointments?limit=50"),
        apiClient.get("/prescriptions/patient/me").catch(() => ({ data: { prescriptions: [] } })),
        apiClient.get("/patients/me").catch(() => ({ data: null }))
      ]);

      const appList = appRes.data?.appointments || appRes.appointments || appRes.data || [];
      setAppointments(Array.isArray(appList) ? appList : []);

      const rxList = rxRes.data?.prescriptions || rxRes.prescriptions || rxRes.data || [];
      setPrescriptions(Array.isArray(rxList) ? rxList : []);

      setProfile(profRes.data || profRes || null);
    } catch (err) {
      console.error("Failed to load patient dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const todayStr = new Date().toISOString().split("T")[0];

  // Derived live statistics
  const upcoming = appointments.filter(
    (a) => a.appointment_status?.toLowerCase() === "confirmed" && a.appointment_date >= todayStr
  );
  const completed = appointments.filter(
    (a) => a.appointment_status?.toLowerCase() === "completed"
  );
  const nextAppt = upcoming[0];

  const handleJoinCall = (appt) => {
    navigate(`/consultation/${appt.id}`);
  };

  const handleViewRxForAppointment = async (appt) => {
    try {
      const res = await apiClient.get(`/prescriptions/appointment/${appt.id}`);
      const rx = res.data?.prescription || res.prescription || res.data;
      if (rx && rx.id) {
        setSelectedRx(rx);
      } else {
        showError("No prescription on file for this appointment.");
      }
    } catch (err) {
      showError(err.message || "Failed to load prescription");
    }
  };

  const filteredAppointments = appointments.filter((appt) => {
    const status = appt.appointment_status?.toLowerCase();
    if (activeTab === "upcoming") {
      return status === "confirmed" && appt.appointment_date >= todayStr;
    }
    if (activeTab === "completed") {
      return status === "completed";
    }
    if (activeTab === "cancelled") {
      return status === "cancelled" || status === "rejected";
    }
    return true;
  });

  return (
    <div className={styles.container}>
      {/* Header Row */}
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Patient Health Portal</h1>
          <p className={styles.subtitle}>
            Welcome back, {profile?.full_name || user?.name || "Patient"} &bull; Manage your medical visits and health records
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            onClick={fetchDashboardData}
            className="btn btn-secondary btn-sm"
            title="Refresh dashboard"
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
          <Link to="/doctors" className="btn btn-primary btn-sm">
            <PlusCircle size={15} />
            <span>Book Doctor Consultation</span>
          </Link>
        </div>
      </div>

      {/* Hero Spotlight Banner */}
      {nextAppt ? (
        <div className={styles.heroBanner}>
          <div className={styles.heroContent}>
            <h2>
              <span>Next Consultation: Dr. {nextAppt.doctor_name || "Doctor"}</span>
              <span className="badge badge-success" style={{ fontSize: "0.725rem" }}>
                {nextAppt.consultation_type === "video" ? "Video Telehealth Call" : "In-Person Clinic"}
              </span>
            </h2>
            <p>
              Specialization: <strong>{nextAppt.doctor_specialization || "General Medicine"}</strong> &bull; Slot: {nextAppt.appointment_date} at {nextAppt.start_time} - {nextAppt.end_time} &bull; Ref: {nextAppt.appointment_number}
            </p>
          </div>

          <div className={styles.heroActions}>
            {nextAppt.consultation_type === "video" && (
              <button
                type="button"
                onClick={() => handleJoinCall(nextAppt)}
                className={styles.bannerBtn}
                style={{ background: "linear-gradient(135deg, #10b981, #059669)", boxShadow: "0 4px 14px rgba(16, 185, 129, 0.4)" }}
              >
                <PhoneCall size={16} />
                <span>Join Video Room</span>
              </button>
            )}
            <Link to="/patient/appointments" className={`${styles.bannerBtn} ${styles.bannerBtnSecondary}`}>
              <span>Manage Booking</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      ) : (
        <div className={styles.heroBanner}>
          <div className={styles.heroContent}>
            <h2>Ready to consult with a specialist physician?</h2>
            <p>Browse certified doctors, real-time consultation slots, and instant booking confirmation.</p>
          </div>
          <div className={styles.heroActions}>
            <Link to="/doctors" className={styles.bannerBtn}>
              <PlusCircle size={16} />
              <span>Find &amp; Book Doctor</span>
            </Link>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.iconWrapper} style={{ backgroundColor: "#eff6ff", color: "#2563eb" }}>
            <Calendar size={22} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Upcoming Visits</div>
            <div className={styles.kpiValue}>{upcoming.length}</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.iconWrapper} style={{ backgroundColor: "#ecfdf5", color: "#10b981" }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Completed Visits</div>
            <div className={styles.kpiValue}>{completed.length}</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.iconWrapper} style={{ backgroundColor: "#f0f9ff", color: "#0284c7" }}>
            <FileText size={22} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Digital Prescriptions</div>
            <div className={styles.kpiValue}>{prescriptions.length}</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.iconWrapper} style={{ backgroundColor: "#fef2f2", color: "#ef4444" }}>
            <Heart size={22} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Blood Group</div>
            <div className={styles.kpiValue}>{profile?.blood_group || "Record Set"}</div>
          </div>
        </div>
      </div>

      {/* 2-Column Layout: History on Left, Rx & Profile on Right */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "20px" }}>
        {/* Left Column: Appointments */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <span className={styles.sectionTitle}>Consultation History</span>
              <div className={styles.tabPills}>
                {[
                  { id: "all", label: `All (${appointments.length})` },
                  { id: "upcoming", label: `Upcoming (${upcoming.length})` },
                  { id: "completed", label: `Completed (${completed.length})` }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`${styles.tabPill} ${activeTab === tab.id ? styles.tabPillActive : ""}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            <Link to="/patient/appointments" style={{ fontSize: "0.825rem", color: "var(--primary)", fontWeight: 700 }}>
              View All
            </Link>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <div className="spinner" style={{ color: "var(--primary)" }} />
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className={styles.emptyState}>
              <Calendar size={36} style={{ margin: "0 auto 8px", opacity: 0.4 }} />
              <p style={{ margin: "0 0 12px", fontSize: "0.875rem" }}>No appointments found in this view.</p>
              <Link to="/doctors" className="btn btn-primary btn-sm">
                Book Consultation
              </Link>
            </div>
          ) : (
            <div className="table-responsive" style={{ border: "none", borderRadius: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Doctor</th>
                    <th>Date &amp; Slot</th>
                    <th>Fee</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppointments.slice(0, 5).map((appt) => {
                    const status = appt.appointment_status?.toLowerCase();
                    return (
                      <tr key={appt.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: "var(--text-main)" }}>
                            Dr. {appt.doctor_name || "Doctor"}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            {appt.doctor_specialization || "General Medicine"}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{appt.appointment_date}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            {appt.start_time} - {appt.end_time}
                          </div>
                        </td>
                        <td style={{ fontWeight: 700 }}>₹{appt.consultation_fee}</td>
                        <td>
                          <span
                            className={`badge ${
                              status === "confirmed"
                                ? "badge-success"
                                : status === "completed"
                                ? "badge-info"
                                : "badge-danger"
                            }`}
                          >
                            {status}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {status === "completed" && (
                            <button
                              type="button"
                              onClick={() => handleViewRxForAppointment(appt)}
                              className="btn btn-outline btn-sm"
                              title="View doctor's prescription"
                            >
                              <FileText size={13} />
                              <span>Rx</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Prescriptions & Health Profile */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Digital Prescriptions Card */}
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>Recent Prescriptions (Rx)</span>
              <Link to="/patient/prescriptions" style={{ fontSize: "0.825rem", color: "var(--primary)", fontWeight: 700 }}>
                View All ({prescriptions.length})
              </Link>
            </div>

            <div style={{ padding: "16px 20px" }}>
              {prescriptions.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  <FileText size={28} style={{ margin: "0 auto 6px", opacity: 0.4 }} />
                  <p style={{ margin: 0 }}>No prescriptions issued yet.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {prescriptions.slice(0, 3).map((rx) => (
                    <div
                      key={rx.id}
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-md)",
                        padding: "12px 14px",
                        backgroundColor: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "10px"
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontWeight: 700,
                              fontSize: "0.75rem",
                              background: "var(--primary-subtle)",
                              color: "var(--primary)",
                              padding: "2px 6px",
                              borderRadius: "4px"
                            }}
                          >
                            {rx.prescription_number}
                          </span>
                          <span style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--text-main)" }}>
                            Dr. {rx.doctor_name || "Doctor"}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.775rem", color: "var(--text-muted)", marginTop: "3px" }}>
                          Diagnosis: <strong>{rx.diagnosis || "Consultation"}</strong> &bull; {rx.medicines?.length || 0} meds
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedRx(rx)}
                        className="btn btn-outline btn-sm"
                      >
                        <Eye size={13} />
                        <span>View</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Health Profile Card */}
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <User size={16} color="var(--primary)" />
                <span className={styles.sectionTitle}>Personal Health Record</span>
              </div>
              <Link to="/patient/profile" style={{ fontSize: "0.825rem", color: "var(--primary)", fontWeight: 700 }}>
                Edit Details
              </Link>
            </div>

            <div style={{ padding: "16px 20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "0.825rem" }}>
                <div style={{ background: "var(--bg-muted)", padding: "10px 12px", borderRadius: "var(--radius-md)" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.725rem", display: "block", textTransform: "uppercase", fontWeight: 600 }}>Blood Group</span>
                  <strong style={{ color: "var(--text-main)", fontSize: "0.95rem" }}>{profile?.blood_group || "Not Set"}</strong>
                </div>
                <div style={{ background: "var(--bg-muted)", padding: "10px 12px", borderRadius: "var(--radius-md)" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.725rem", display: "block", textTransform: "uppercase", fontWeight: 600 }}>Gender</span>
                  <strong style={{ color: "var(--text-main)", fontSize: "0.95rem" }}>{profile?.gender || "Not Set"}</strong>
                </div>
                <div style={{ background: "var(--bg-muted)", padding: "10px 12px", borderRadius: "var(--radius-md)" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.725rem", display: "block", textTransform: "uppercase", fontWeight: 600 }}>Phone</span>
                  <strong style={{ color: "var(--text-main)", fontSize: "0.95rem" }}>{profile?.phone || "Not Set"}</strong>
                </div>
                <div style={{ background: "var(--bg-muted)", padding: "10px 12px", borderRadius: "var(--radius-md)" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.725rem", display: "block", textTransform: "uppercase", fontWeight: 600 }}>Emergency Contact</span>
                  <strong style={{ color: "var(--text-main)", fontSize: "0.95rem" }}>{profile?.emergency_contact || "Not Set"}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Prescription View Modal */}
      {selectedRx && (
        <PrescriptionCard
          prescription={selectedRx}
          onClose={() => setSelectedRx(null)}
        />
      )}
    </div>
  );
};

export default PatientDashboard;
