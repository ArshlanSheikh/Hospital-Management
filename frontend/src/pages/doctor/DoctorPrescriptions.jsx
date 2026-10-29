import React, { useState, useEffect } from "react";
import { FileText, Calendar, User, Eye, AlertCircle } from "lucide-react";
import apiClient from "../../api/client";
import PrescriptionCard from "../../components/prescriptions/PrescriptionCard";

const DoctorPrescriptions = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRx, setSelectedRx] = useState(null);

  useEffect(() => {
    const fetchPrescriptions = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get("/prescriptions/doctor/me");
        if (res.data?.success) {
          setPrescriptions(res.data.data.prescriptions || []);
        }
      } catch (err) {
        setError(err.response?.data?.error?.message || "Failed to load prescriptions");
      } finally {
        setLoading(false);
      }
    };

    fetchPrescriptions();
  }, []);

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", margin: "0 0 0.5rem" }}>
          Issued Prescriptions Registry
        </h1>
        <p style={{ color: "#64748b", margin: 0 }}>
          Audit trail of all digital prescriptions created during your patient consultations.
        </p>
      </div>

      {error && (
        <div style={{ padding: "1rem", borderRadius: "8px", background: "#fef2f2", color: "#b91c1c", marginBottom: "1.5rem" }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem" }}>
          <div className="spinner" style={{ color: "var(--primary)", width: "2rem", height: "2rem", margin: "0 auto 1rem" }} />
          <p style={{ color: "#64748b" }}>Loading clinical records...</p>
        </div>
      ) : prescriptions.length === 0 ? (
        <div
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "3rem 1.5rem",
            textAlign: "center",
            border: "1px dashed #cbd5e1"
          }}
        >
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: "rgba(10, 77, 104, 0.08)",
              color: "var(--primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1rem"
            }}
          >
            <FileText size={28} />
          </div>
          <h3 style={{ margin: "0 0 0.5rem", color: "#0f172a" }}>No Prescriptions Issued Yet</h3>
          <p style={{ color: "#64748b", maxWidth: "400px", margin: "0 auto 1.5rem", fontSize: "0.9rem" }}>
            Prescriptions you write during consultations or from the Appointments dashboard will appear here.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1rem" }}>
          {prescriptions.map((rx) => (
            <div
              key={rx.id}
              style={{
                background: "white",
                borderRadius: "14px",
                padding: "1.25rem",
                border: "1px solid #e2e8f0",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between"
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      background: "rgba(10, 77, 104, 0.08)",
                      color: "var(--primary)",
                      padding: "0.2rem 0.5rem",
                      borderRadius: "6px"
                    }}
                  >
                    {rx.prescription_number}
                  </span>
                  <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                    {rx.created_at ? new Date(rx.created_at).toLocaleDateString() : ""}
                  </span>
                </div>

                <h3 style={{ margin: "0 0 0.25rem", fontSize: "1.1rem", color: "#0f172a" }}>
                  Patient: {rx.patient_name || "Patient"}
                </h3>
                <p style={{ margin: "0 0 0.75rem", fontSize: "0.85rem", color: "#64748b" }}>
                  Ref: {rx.appointment_number}
                </p>

                <div style={{ background: "#f8fafc", padding: "0.6rem 0.75rem", borderRadius: "8px", marginBottom: "0.75rem" }}>
                  <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Diagnosis:</span>
                  <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#1e293b" }}>
                    {rx.diagnosis}
                  </span>
                </div>

                <div style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: "1rem" }}>
                  Medicines: <strong>{rx.medicines?.length || 0} prescribed</strong>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() => setSelectedRx(rx)}
                  className="btn btn-primary"
                  style={{ flex: 1, justifyContent: "center", padding: "0.5rem", fontSize: "0.85rem" }}
                >
                  <Eye size={15} />
                  <span>View Details</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedRx && (
        <PrescriptionCard prescription={selectedRx} onClose={() => setSelectedRx(null)} />
      )}
    </div>
  );
};

export default DoctorPrescriptions;
