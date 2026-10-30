import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Users,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Stethoscope,
  Video,
  FileText,
  DollarSign,
  TrendingUp,
  Sliders,
  PhoneCall,
  Search,
  Eye,
  Edit3,
  CalendarDays,
  ShieldCheck,
  RefreshCw,
  PlusCircle,
  UserCheck
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import apiClient from "../../api/client";
import { useToast } from "../../context/ToastContext";
import IssuePrescriptionModal from "../../components/prescriptions/IssuePrescriptionModal";
import PrescriptionCard from "../../components/prescriptions/PrescriptionCard";
import styles from "./DoctorDashboard.module.css";

const DoctorDashboard = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Prescription Modals state
  const [prescribingAppt, setPrescribingAppt] = useState(null);
  const [viewingRx, setViewingRx] = useState(null);
  const [editingRx, setEditingRx] = useState(null);

  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [appRes, docRes] = await Promise.all([
        apiClient.get("/appointments?limit=50"),
        apiClient.get("/doctors/me")
      ]);

      const appList = appRes.data?.appointments || appRes.appointments || appRes.data || [];
      setAppointments(Array.isArray(appList) ? appList : []);

      const profile = docRes.data || docRes;
      setDoctorProfile(profile);
    } catch (err) {
      console.error("Dashboard fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const todayStr = new Date().toISOString().split("T")[0];

  // Derived live statistics
  const todayAppts = appointments.filter((a) => a.appointment_date === todayStr);
  const confirmedAppts = appointments.filter((a) => a.appointment_status?.toLowerCase() === "confirmed");
  const completedAppts = appointments.filter((a) => a.appointment_status?.toLowerCase() === "completed");
  const isVerified = doctorProfile?.verification_status === "verified";
  const fee = doctorProfile?.consultation_fee || 500;
  const estimatedRevenue = completedAppts.reduce((sum, a) => sum + (Number(a.consultation_fee) || fee), 0);

  // Availability schedule summary
  const availSettings = doctorProfile?.availability_settings || {};
  const activeDays = availSettings.days_of_week || [1, 2, 3, 4, 5];
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Filtered Appointments
  const filteredAppointments = appointments.filter((appt) => {
    const status = appt.appointment_status?.toLowerCase();
    if (activeTab === "today" && appt.appointment_date !== todayStr) return false;
    if (activeTab === "confirmed" && status !== "confirmed") return false;
    if (activeTab === "completed" && status !== "completed") return false;
    if (activeTab === "cancelled" && status !== "cancelled" && status !== "rejected") return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchPatient = appt.patient_name && appt.patient_name.toLowerCase().includes(q);
      const matchNumber = appt.appointment_number && appt.appointment_number.toLowerCase().includes(q);
      const matchReason = appt.reason && appt.reason.toLowerCase().includes(q);
      if (!matchPatient && !matchNumber && !matchReason) return false;
    }

    return true;
  });

  const handleStartCall = async (appt) => {
    try {
      await apiClient.post(`/consultations/${appt.id}/initiate-call`);
      navigate(`/consultation/${appt.id}`);
    } catch (err) {
      showError(err.message || "Failed to start consultation call");
    }
  };

  const handleUpdateStatus = async (apptId, newStatus) => {
    try {
      await apiClient.patch(`/appointments/${apptId}/status`, { status: newStatus });
      showSuccess(`Appointment marked as ${newStatus}`);
      fetchDashboardData();
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
    <div className={styles.container}>
      {/* Header Row */}
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Doctor Workspace</h1>
          <p className={styles.subtitle}>
            Clinical practice command center &bull; Consultation appointments, schedule, and prescriptions
          </p>
        </div>
      </div>

      {/* Hero Spotlight Banner */}
      <div className={styles.heroBanner}>
        <div className={styles.heroContent}>
          <h2>
            <span>Dr. {doctorProfile?.full_name || user?.name || "Doctor"}</span>
            {isVerified ? (
              <span className="badge badge-success" style={{ fontSize: "0.725rem" }}>
                <ShieldCheck size={13} /> Verified Practitioner
              </span>
            ) : (
              <span className="badge badge-warning" style={{ fontSize: "0.725rem" }}>
                <AlertTriangle size={13} /> Verification Pending
              </span>
            )}
          </h2>
          <p>
            {doctorProfile?.specialization || "Clinical Specialist"} &bull; {doctorProfile?.qualifications || "MBBS"} &bull; Consultation Fee: ₹{fee}/visit
          </p>
        </div>

        <div className={styles.heroActions}>
          <button
            type="button"
            onClick={fetchDashboardData}
            className={`${styles.bannerBtn} ${styles.bannerBtnSecondary}`}
            title="Refresh metrics"
          >
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
          <Link to="/doctor/schedule" className={styles.bannerBtn}>
            <Sliders size={16} />
            <span>Manage Availability</span>
          </Link>
        </div>
      </div>

      {/* Account Verification Warning Banner */}
      {doctorProfile && !isVerified && (
        <div
          style={{
            backgroundColor: "var(--warning-light)",
            border: "1px solid var(--warning-border)",
            borderRadius: "var(--radius-lg)",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            color: "#92400e"
          }}
        >
          <AlertTriangle size={22} style={{ flexShrink: 0, color: "var(--warning)" }} />
          <div style={{ fontSize: "0.875rem" }}>
            <strong>Account Verification In Progress:</strong> Your doctor profile is currently being reviewed by platform administrators. Once verified, patients will be able to book slots directly from the public directory.
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.iconWrapper} style={{ backgroundColor: "#eff6ff", color: "#2563eb" }}>
            <CalendarDays size={22} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Today&apos;s Appointments</div>
            <div className={styles.kpiValue}>{todayAppts.length}</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.iconWrapper} style={{ backgroundColor: "#ecfdf5", color: "#10b981" }}>
            <Users size={22} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Active Queue (Confirmed)</div>
            <div className={styles.kpiValue}>{confirmedAppts.length}</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.iconWrapper} style={{ backgroundColor: "#f0f9ff", color: "#0284c7" }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Completed Visits</div>
            <div className={styles.kpiValue}>{completedAppts.length}</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.iconWrapper} style={{ backgroundColor: "#fef3c7", color: "#d97706" }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div className={styles.kpiLabel}>Earned Consultations</div>
            <div className={styles.kpiValue}>₹{estimatedRevenue}</div>
          </div>
        </div>
      </div>

      {/* Availability Status Bar */}
      <div className={styles.availabilityCard}>
        <div className={styles.availLeft}>
          <div className={styles.availTitle}>
            <Clock size={16} color="var(--primary)" />
            <span>Consultation Practice Hours:</span>
          </div>
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            {availSettings.start_time || "09:00"} - {availSettings.end_time || "17:00"} ({availSettings.slot_duration_minutes || 30} min slots)
          </span>
          <div className={styles.availDays}>
            {[1, 2, 3, 4, 5, 6, 7].map((dayId) => {
              const isActive = activeDays.includes(dayId);
              return (
                <span
                  key={dayId}
                  className={`${styles.dayChip} ${isActive ? styles.dayChipActive : styles.dayChipInactive}`}
                >
                  {dayNames[dayId - 1]}
                </span>
              );
            })}
          </div>
        </div>

        <Link
          to="/doctor/schedule"
          style={{
            fontSize: "0.825rem",
            color: "var(--primary)",
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            gap: "4px"
          }}
        >
          <span>Configure Weekly Hours</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* Appointment Management Table Card */}
      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <span className={styles.sectionTitle}>Appointment Management</span>
            <div className={styles.tabPills}>
              {[
                { id: "all", label: `All (${appointments.length})` },
                { id: "today", label: `Today (${todayAppts.length})` },
                { id: "confirmed", label: `Confirmed (${confirmedAppts.length})` },
                { id: "completed", label: `Completed (${completedAppts.length})` },
                { id: "cancelled", label: "Cancelled" }
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

          <div className={styles.searchBox}>
            <input
              type="text"
              placeholder="Search patient, ref..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`form-input ${styles.searchInput}`}
            />
            <Search size={14} className={styles.searchIcon} />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <div className="spinner" style={{ color: "var(--primary)", width: "2rem", height: "2rem" }} />
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className={styles.emptyState}>
            <Calendar size={36} style={{ margin: "0 auto 8px", opacity: 0.4 }} />
            <p style={{ margin: 0, fontSize: "0.875rem" }}>
              {searchQuery ? `No appointments matching "${searchQuery}"` : "No consultations scheduled under this filter."}
            </p>
          </div>
        ) : (
          <div className="table-responsive" style={{ border: "none", borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Patient Name</th>
                  <th>Appointment Ref</th>
                  <th>Date &amp; Slot</th>
                  <th>Mode</th>
                  <th>Fee</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Clinical Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map((appt) => {
                  const status = appt.appointment_status?.toLowerCase();
                  const isVideo = appt.consultation_type === "video" || appt.consultation_type === "online";
                  const isPaid = appt.payment_status === "completed";

                  return (
                    <tr key={appt.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: "var(--text-main)" }}>
                          {appt.patient_name || "Patient"}
                        </div>
                        <div style={{ fontSize: "0.775rem", color: "var(--text-muted)" }}>
                          {appt.patient_phone || appt.patient_email || "No contact info"}
                        </div>
                      </td>
                      <td>
                        <code style={{ fontSize: "0.8rem", color: "var(--primary)", background: "var(--primary-subtle)", padding: "2px 6px", borderRadius: "4px" }}>
                          {appt.appointment_number}
                        </code>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{appt.appointment_date}</div>
                        <div style={{ fontSize: "0.775rem", color: "var(--text-muted)" }}>
                          {appt.start_time} - {appt.end_time}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-primary" style={{ gap: "4px" }}>
                          {isVideo ? <Video size={12} /> : <Users size={12} />}
                          <span>{isVideo ? "Video" : "In-Person"}</span>
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700 }}>₹{appt.consultation_fee || fee}</span>
                        <span
                          className={`badge ${isPaid ? "badge-success" : "badge-warning"}`}
                          style={{ marginLeft: "6px", fontSize: "0.675rem" }}
                        >
                          {isPaid ? "PAID" : "UNPAID"}
                        </span>
                      </td>
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
                        <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                          {isVideo && status !== "cancelled" && status !== "rejected" && (
                            <button
                              type="button"
                              onClick={() => handleStartCall(appt)}
                              className="btn btn-success btn-sm"
                              title="Start Video Consultation Room"
                            >
                              <PhoneCall size={13} />
                              <span>{appt.consultation_status === "in_progress" ? "Rejoin Room" : "Video Call"}</span>
                            </button>
                          )}

                          {status === "confirmed" && (
                            <>
                              <button
                                type="button"
                                onClick={() => setPrescribingAppt(appt)}
                                className="btn btn-outline btn-sm"
                                title="Issue Digital Prescription (Rx)"
                              >
                                <FileText size={13} />
                                <span>Issue Rx</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(appt.id, "completed")}
                                className="btn btn-secondary btn-sm"
                                title="Mark completed"
                              >
                                <CheckCircle2 size={13} color="var(--success)" />
                                <span>Conclude</span>
                              </button>
                            </>
                          )}

                          {status === "completed" && (
                            <button
                              type="button"
                              onClick={() => handleViewPrescription(appt)}
                              className="btn btn-outline btn-sm"
                              title="View & Edit Issued Prescription"
                            >
                              <Eye size={13} />
                              <span>View / Edit Rx</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {prescribingAppt && (
        <IssuePrescriptionModal
          appointment={prescribingAppt}
          onClose={() => setPrescribingAppt(null)}
          onPrescriptionIssued={(rx) => {
            showSuccess(`Prescription ${rx.prescription_number || ""} issued successfully!`);
            fetchDashboardData();
          }}
        />
      )}

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

      {editingRx && (
        <IssuePrescriptionModal
          existingPrescription={editingRx}
          onClose={() => setEditingRx(null)}
          onPrescriptionIssued={(rx) => {
            showSuccess(`Prescription ${rx.prescription_number || ""} updated successfully!`);
            fetchDashboardData();
          }}
        />
      )}
    </div>
  );
};

export default DoctorDashboard;
