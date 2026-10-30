import React, { useState, useEffect } from "react";
import {
  FileText,
  Calendar,
  User,
  Eye,
  AlertCircle,
  Search,
  Edit3,
  Plus,
  RefreshCw,
  CheckCircle2,
  Filter
} from "lucide-react";
import apiClient from "../../api/client";
import PrescriptionCard from "../../components/prescriptions/PrescriptionCard";
import IssuePrescriptionModal from "../../components/prescriptions/IssuePrescriptionModal";
import { useToast } from "../../context/ToastContext";

const DoctorPrescriptions = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRx, setSelectedRx] = useState(null);
  const [editingRx, setEditingRx] = useState(null);

  const { showSuccess, showError } = useToast();

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get("/prescriptions/doctor/me");
      const list = res.data?.prescriptions || res.prescriptions || res.data || [];
      setPrescriptions(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message || "Failed to load prescriptions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const handlePrescriptionUpdated = (updatedRx) => {
    showSuccess(`Prescription ${updatedRx.prescription_number || ""} updated successfully!`);
    fetchPrescriptions();
  };

  const filteredPrescriptions = prescriptions.filter((rx) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (rx.patient_name && rx.patient_name.toLowerCase().includes(term)) ||
      (rx.prescription_number && rx.prescription_number.toLowerCase().includes(term)) ||
      (rx.diagnosis && rx.diagnosis.toLowerCase().includes(term)) ||
      (rx.appointment_number && rx.appointment_number.toLowerCase().includes(term))
    );
  });

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.75rem",
          flexWrap: "wrap",
          gap: "1rem"
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--primary)", margin: "0 0 0.35rem" }}>
            Issued Prescriptions Registry
          </h1>
          <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.95rem" }}>
            Official medical records, prescription edits, and clinical documentation archive.
          </p>
        </div>

        <button
          onClick={fetchPrescriptions}
          className="btn btn-outline"
          style={{ gap: "0.4rem", padding: "0.5rem 1rem", fontSize: "0.85rem" }}
          title="Refresh List"
        >
          <RefreshCw size={15} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div
        style={{
          background: "white",
          borderRadius: "var(--radius-md)",
          padding: "1rem 1.25rem",
          border: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "1.75rem",
          flexWrap: "wrap"
        }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: "260px" }}>
          <input
            type="text"
            placeholder="Search by patient name, Rx number (e.g. RX-2026...), or diagnosis..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-control"
            style={{ paddingLeft: "2.5rem" }}
          />
          <Search
            size={17}
            color="var(--text-muted)"
            style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)" }}
          />
        </div>
        <div style={{ fontSize: "0.88rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
          Showing <strong>{filteredPrescriptions.length}</strong> of <strong>{prescriptions.length}</strong> records
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: "1rem 1.25rem",
            borderRadius: "var(--radius-sm)",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#b91c1c",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem"
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem 0" }}>
          <div className="spinner" style={{ color: "var(--primary)", width: "2.5rem", height: "2.5rem", margin: "0 auto 1rem" }} />
          <p style={{ color: "var(--text-secondary)" }}>Loading clinical prescriptions...</p>
        </div>
      ) : prescriptions.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: "4rem 2rem",
            border: "1.5px dashed var(--border)"
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: "var(--primary-light)",
              color: "var(--primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.25rem"
            }}
          >
            <FileText size={30} />
          </div>
          <h3 style={{ margin: "0 0 0.5rem", color: "var(--text-primary)" }}>No Prescriptions Issued Yet</h3>
          <p style={{ color: "var(--text-secondary)", maxWidth: "440px", margin: "0 auto 1.5rem", fontSize: "0.92rem" }}>
            When you complete consultations or open your Appointments tab, clicking &ldquo;Issue Prescription&rdquo; will archive official Rx records here.
          </p>
        </div>
      ) : filteredPrescriptions.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
          <Search size={36} color="var(--text-muted)" style={{ margin: "0 auto 0.75rem" }} />
          <h4>No matching prescriptions found</h4>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Try adjusting your search query &ldquo;{searchTerm}&rdquo;.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: "1.25rem"
          }}
        >
          {filteredPrescriptions.map((rx) => {
            const dateStr = rx.created_at
              ? new Date(rx.created_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric"
                })
              : "Recent";

            return (
              <div
                key={rx.id}
                className="card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  border: "1px solid var(--border)"
                }}
              >
                <div>
                  {/* Top line with Rx badge & Date */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "1rem"
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontWeight: 700,
                        fontSize: "0.82rem",
                        background: "var(--primary-light)",
                        color: "var(--primary)",
                        padding: "0.25rem 0.6rem",
                        borderRadius: "6px",
                        border: "1px solid rgba(10, 77, 104, 0.15)"
                      }}
                    >
                      {rx.prescription_number}
                    </span>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      {dateStr}
                    </span>
                  </div>

                  {/* Patient Info */}
                  <div style={{ marginBottom: "0.85rem" }}>
                    <h3 style={{ margin: "0 0 0.25rem", fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      {rx.patient_name || "Patient"}
                    </h3>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                      Ref: <code style={{ fontSize: "0.82rem" }}>{rx.appointment_number || "APT-CONSULTATION"}</code>
                    </div>
                  </div>

                  {/* Diagnosis */}
                  <div
                    style={{
                      background: "var(--bg-page)",
                      padding: "0.75rem 0.9rem",
                      borderRadius: "8px",
                      marginBottom: "1rem",
                      border: "1px solid var(--border)"
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "2px" }}>
                      DIAGNOSIS
                    </div>
                    <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)" }}>
                      {rx.diagnosis || "General Clinical Evaluation"}
                    </div>
                  </div>

                  {/* Medicine summary */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      fontSize: "0.85rem",
                      color: "var(--text-secondary)",
                      marginBottom: "1.25rem"
                    }}
                  >
                    <CheckCircle2 size={16} color="var(--success)" />
                    <span>
                      <strong>{rx.medicines?.length || 0}</strong> medication(s) prescribed
                    </span>
                    {rx.follow_up_date && (
                      <span style={{ marginLeft: "auto", fontSize: "0.78rem", color: "var(--secondary)" }}>
                        Follow-up: {rx.follow_up_date}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions row: View + Edit */}
                <div
                  style={{
                    display: "flex",
                    gap: "0.6rem",
                    borderTop: "1px solid var(--border)",
                    paddingTop: "0.9rem"
                  }}
                >
                  <button
                    onClick={() => setSelectedRx(rx)}
                    className="btn btn-primary"
                    style={{
                      flex: 1,
                      justifyContent: "center",
                      padding: "0.5rem",
                      fontSize: "0.85rem",
                      gap: "0.4rem"
                    }}
                  >
                    <Eye size={15} />
                    <span>View & Print</span>
                  </button>
                  <button
                    onClick={() => setEditingRx(rx)}
                    className="btn btn-outline"
                    style={{
                      justifyContent: "center",
                      padding: "0.5rem 0.85rem",
                      fontSize: "0.85rem",
                      gap: "0.4rem",
                      color: "var(--primary)"
                    }}
                    title="Edit prescription medicines, diagnosis, or advice"
                  >
                    <Edit3 size={15} />
                    <span>Edit Rx</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details View Modal */}
      {selectedRx && (
        <PrescriptionCard
          prescription={selectedRx}
          onClose={() => setSelectedRx(null)}
          onEdit={(rx) => {
            setSelectedRx(null);
            setEditingRx(rx);
          }}
        />
      )}

      {/* Edit Prescription Modal */}
      {editingRx && (
        <IssuePrescriptionModal
          existingPrescription={editingRx}
          onClose={() => setEditingRx(null)}
          onPrescriptionIssued={handlePrescriptionUpdated}
        />
      )}
    </div>
  );
};

export default DoctorPrescriptions;
