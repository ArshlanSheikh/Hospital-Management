import React from "react";
import { Printer, Calendar, ShieldCheck, Heart, FileText, CheckCircle2 } from "lucide-react";

const PrescriptionCard = ({ prescription, onClose }) => {
  if (!prescription) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1100,
        padding: "1rem"
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "white",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "720px",
          maxHeight: "92vh",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflowY: "auto",
          position: "relative"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Actions bar */}
        <div
          style={{
            padding: "0.75rem 1.5rem",
            background: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            zIndex: 10
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "#334155" }}>
              Medical Prescription ({prescription.prescription_number})
            </span>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => window.print()}
              className="btn btn-outline"
              style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem", gap: "0.3rem" }}
            >
              <Printer size={14} />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="btn btn-outline"
              style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}
            >
              Close
            </button>
          </div>
        </div>

        {/* Printable Rx Sheet */}
        <div style={{ padding: "2rem" }} className="printable-prescription">
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderBottom: "2px solid var(--primary)",
              paddingBottom: "1rem",
              marginBottom: "1.25rem"
            }}
          >
            <div>
              <h2 style={{ margin: "0 0 0.25rem", color: "var(--primary)", fontSize: "1.4rem", fontWeight: 800 }}>
                {prescription.doctor_name || "Doctor"}
              </h2>
              <p style={{ margin: "0 0 0.2rem", fontWeight: 600, color: "#334155", fontSize: "0.9rem" }}>
                {prescription.doctor_specialization} &bull; {prescription.doctor_qualification}
              </p>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>
                Reg. License No: {prescription.doctor_license || "Verified Medical Council Practitioner"}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", justifyContent: "flex-end", color: "var(--primary)", fontWeight: 700 }}>
                <Heart size={18} fill="var(--primary)" />
                <span>MediPulse Health</span>
              </div>
              <p style={{ margin: "0.2rem 0 0", fontSize: "0.75rem", color: "#64748b" }}>
                Digital Telehealth Platform
              </p>
            </div>
          </div>

          {/* Patient Meta Strip */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "0.75rem 1rem",
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "0.75rem",
              fontSize: "0.85rem",
              marginBottom: "1.25rem"
            }}
          >
            <div>
              <span style={{ color: "#64748b", display: "block", fontSize: "0.75rem" }}>Patient Name</span>
              <strong style={{ color: "#0f172a" }}>{prescription.patient_name || "Patient"}</strong>
            </div>
            <div>
              <span style={{ color: "#64748b", display: "block", fontSize: "0.75rem" }}>Date</span>
              <strong style={{ color: "#0f172a" }}>
                {prescription.created_at ? new Date(prescription.created_at).toLocaleDateString() : "Today"}
              </strong>
            </div>
            <div>
              <span style={{ color: "#64748b", display: "block", fontSize: "0.75rem" }}>Appointment Ref</span>
              <strong style={{ color: "#0f172a" }}>{prescription.appointment_number}</strong>
            </div>
          </div>

          {/* Vitals */}
          {prescription.vital_signs && Object.keys(prescription.vital_signs).length > 0 && (
            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "0.4rem" }}>
                Clinical Vitals
              </div>
              <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.85rem", color: "#334155" }}>
                {prescription.vital_signs.blood_pressure && (
                  <span><strong>BP:</strong> {prescription.vital_signs.blood_pressure}</span>
                )}
                {prescription.vital_signs.pulse && (
                  <span><strong>Pulse:</strong> {prescription.vital_signs.pulse}</span>
                )}
                {prescription.vital_signs.weight && (
                  <span><strong>Weight:</strong> {prescription.vital_signs.weight}</span>
                )}
                {prescription.vital_signs.temperature && (
                  <span><strong>Temp:</strong> {prescription.vital_signs.temperature}</span>
                )}
              </div>
            </div>
          )}

          {/* Diagnosis */}
          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "0.4rem" }}>
              Diagnosis
            </div>
            <div
              style={{
                fontSize: "1rem",
                fontWeight: 600,
                color: "#0f172a",
                padding: "0.5rem 0.75rem",
                background: "rgba(10, 77, 104, 0.05)",
                borderLeft: "3px solid var(--primary)",
                borderRadius: "0 6px 6px 0"
              }}
            >
              {prescription.diagnosis}
            </div>
          </div>

          {/* Rx Medications Table */}
          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem" }}>
              <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--primary)", fontFamily: "serif" }}>
                Rx
              </span>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                Prescribed Medicines
              </span>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                  <th style={{ padding: "0.6rem 0.75rem", borderBottom: "1px solid #cbd5e1" }}>#</th>
                  <th style={{ padding: "0.6rem 0.75rem", borderBottom: "1px solid #cbd5e1" }}>Medicine</th>
                  <th style={{ padding: "0.6rem 0.75rem", borderBottom: "1px solid #cbd5e1" }}>Dosage</th>
                  <th style={{ padding: "0.6rem 0.75rem", borderBottom: "1px solid #cbd5e1" }}>Frequency</th>
                  <th style={{ padding: "0.6rem 0.75rem", borderBottom: "1px solid #cbd5e1" }}>Duration</th>
                  <th style={{ padding: "0.6rem 0.75rem", borderBottom: "1px solid #cbd5e1" }}>Instructions</th>
                </tr>
              </thead>
              <tbody>
                {prescription.medicines?.map((med, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "0.6rem 0.75rem", color: "#94a3b8" }}>{idx + 1}</td>
                    <td style={{ padding: "0.6rem 0.75rem", fontWeight: 600, color: "#0f172a" }}>{med.name}</td>
                    <td style={{ padding: "0.6rem 0.75rem", color: "#475569" }}>{med.dosage || "-"}</td>
                    <td style={{ padding: "0.6rem 0.75rem", color: "#475569" }}>{med.frequency}</td>
                    <td style={{ padding: "0.6rem 0.75rem", color: "#475569" }}>{med.duration}</td>
                    <td style={{ padding: "0.6rem 0.75rem", color: "#475569" }}>{med.instructions || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Diagnostic Tests & Advice */}
          {(prescription.tests_recommended?.length > 0 || prescription.advice_notes) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
              {prescription.tests_recommended?.length > 0 && (
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                    Tests Recommended
                  </div>
                  <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.85rem", color: "#334155" }}>
                    {prescription.tests_recommended.map((t, idx) => (
                      <li key={idx}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}
              {prescription.advice_notes && (
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                    Clinical Advice
                  </div>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "#334155", lineHeight: 1.4 }}>
                    {prescription.advice_notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Follow Up & Doctor Signature Stamp */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              borderTop: "1px solid #e2e8f0",
              paddingTop: "1.5rem",
              marginTop: "1.5rem"
            }}
          >
            <div>
              {prescription.follow_up_date && (
                <div style={{ fontSize: "0.85rem", color: "#475569" }}>
                  <strong>Next Review / Follow-up:</strong> {prescription.follow_up_date}
                </div>
              )}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ width: "160px", borderBottom: "1px solid #0f172a", marginBottom: "0.35rem" }} />
              <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#0f172a" }}>
                {prescription.doctor_name}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#10b981", display: "flex", alignItems: "center", gap: "0.25rem", justifyContent: "flex-end" }}>
                <CheckCircle2 size={13} />
                <span>Digitally Signed & Verified</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrescriptionCard;
