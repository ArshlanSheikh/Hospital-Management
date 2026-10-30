import React, { useState, useEffect } from "react";
import {
  FileText,
  Calendar,
  User,
  Eye,
  Printer,
  AlertCircle,
  Search,
  RefreshCw,
  CheckCircle2,
  Stethoscope
} from "lucide-react";
import apiClient from "../../api/client";
import PrescriptionCard from "../../components/prescriptions/PrescriptionCard";

const PatientPrescriptions = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRx, setSelectedRx] = useState(null);

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get("/prescriptions/patient/me");
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

  const filtered = prescriptions.filter((rx) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const hasMed = rx.medicines?.some((m) => m.name && m.name.toLowerCase().includes(term));
    return (
      (rx.doctor_name && rx.doctor_name.toLowerCase().includes(term)) ||
      (rx.doctor_specialization && rx.doctor_specialization.toLowerCase().includes(term)) ||
      (rx.prescription_number && rx.prescription_number.toLowerCase().includes(term)) ||
      (rx.diagnosis && rx.diagnosis.toLowerCase().includes(term)) ||
      hasMed
    );
  });

  return (
    <div>
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
            My Digital Prescriptions
          </h1>
          <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.95rem" }}>
            View, download, and print official medical prescriptions issued by your consulting physicians.
          </p>
        </div>

        <button
          onClick={fetchPrescriptions}
          className="btn btn-outline"
          style={{ gap: "0.4rem", padding: "0.5rem 1rem", fontSize: "0.85rem" }}
          title="Refresh"
        >
          <RefreshCw size={15} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search & Filter */}
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
            placeholder="Search by doctor, medicine name, diagnosis, or Rx reference..."
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
          <strong>{filtered.length}</strong> prescription(s) found
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
          <p style={{ color: "var(--text-secondary)" }}>Loading your medical records...</p>
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
          <h3 style={{ margin: "0 0 0.5rem", color: "var(--text-primary)" }}>No Prescriptions Yet</h3>
          <p style={{ color: "var(--text-secondary)", maxWidth: "440px", margin: "0 auto 1.5rem", fontSize: "0.92rem" }}>
            Prescriptions issued by your doctor during in-person or video consultations will appear here automatically.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
          <Search size={36} color="var(--text-muted)" style={{ margin: "0 auto 0.75rem" }} />
          <h4>No matching prescriptions</h4>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            No records matched your search &ldquo;{searchTerm}&rdquo;.
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
          {filtered.map((rx) => {
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
                  border: "1px solid var(--border)"
                }}
              >
                <div>
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

                  <div style={{ marginBottom: "0.85rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--primary)", fontWeight: 700, fontSize: "1.1rem" }}>
                      <Stethoscope size={18} />
                      <span>{rx.doctor_name || "Doctor"}</span>
                    </div>
                    <div style={{ fontSize: "0.84rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                      {rx.doctor_specialization || "General Medicine"} &bull; {rx.doctor_qualification || "MBBS"}
                    </div>
                  </div>

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
                      {rx.diagnosis || "Medical Consultation"}
                    </div>
                  </div>

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
                      <strong>{rx.medicines?.length || 0}</strong> medications prescribed
                    </span>
                    {rx.follow_up_date && (
                      <span style={{ marginLeft: "auto", fontSize: "0.78rem", color: "var(--secondary)" }}>
                        Follow-up: {rx.follow_up_date}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.9rem" }}>
                  <button
                    onClick={() => setSelectedRx(rx)}
                    className="btn btn-primary"
                    style={{
                      width: "100%",
                      justifyContent: "center",
                      padding: "0.55rem",
                      fontSize: "0.88rem",
                      gap: "0.4rem"
                    }}
                  >
                    <Eye size={16} />
                    <span>View &amp; Print Official Rx</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedRx && (
        <PrescriptionCard
          prescription={selectedRx}
          onClose={() => setSelectedRx(null)}
        />
      )}
    </div>
  );
};

export default PatientPrescriptions;
