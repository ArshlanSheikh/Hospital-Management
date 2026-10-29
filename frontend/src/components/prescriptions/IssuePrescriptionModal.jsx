import React, { useState } from "react";
import { X, FileText, Plus, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import apiClient from "../../api/client";

const IssuePrescriptionModal = ({ appointment, onClose, onPrescriptionIssued }) => {
  const [diagnosis, setDiagnosis] = useState("");
  const [bp, setBp] = useState("120/80");
  const [pulse, setPulse] = useState("72 bpm");
  const [weight, setWeight] = useState("");
  const [temp, setTemp] = useState("98.6 F");
  const [medicines, setMedicines] = useState([
    { name: "", dosage: "", frequency: "Once daily (Morning)", duration: "7 days", instructions: "After food" }
  ]);
  const [tests, setTests] = useState("");
  const [adviceNotes, setAdviceNotes] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [markCompleted, setMarkCompleted] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleAddMedicine = () => {
    setMedicines([
      ...medicines,
      { name: "", dosage: "", frequency: "Twice daily (Morning & Night)", duration: "5 days", instructions: "After food" }
    ]);
  };

  const handleRemoveMedicine = (index) => {
    if (medicines.length <= 1) return;
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const handleMedicineChange = (index, field, value) => {
    const updated = [...medicines];
    updated[index][field] = value;
    setMedicines(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    const validMedicines = medicines.filter((m) => m.name.trim() !== "");
    if (validMedicines.length === 0) {
      setError("Please prescribe at least one medication with a valid name.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        appointment_id: appointment.id || appointment._id,
        diagnosis: diagnosis || "General Medical Evaluation",
        vital_signs: {
          blood_pressure: bp,
          pulse: pulse,
          weight: weight,
          temperature: temp
        },
        medicines: validMedicines,
        tests_recommended: tests ? tests.split(",").map((t) => t.trim()).filter(Boolean) : [],
        advice_notes: adviceNotes,
        follow_up_date: followUpDate || null,
        mark_appointment_completed: markCompleted
      };

      const res = await apiClient.post("/prescriptions", payload);
      if (res.data?.success) {
        if (onPrescriptionIssued) {
          onPrescriptionIssued(res.data.data);
        }
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to issue prescription");
    } finally {
      setSubmitting(false);
    }
  };

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
          maxWidth: "680px",
          maxHeight: "90vh",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#f8fafc"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "rgba(139, 92, 246, 0.1)",
                color: "#7c3aed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <FileText size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>
                Issue Digital Prescription (Rx)
              </h3>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>
                Patient: {appointment?.patient_name || "Patient"} &bull; Ref: {appointment?.appointment_number}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px" }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} style={{ padding: "1.5rem", overflowY: "auto", flex: 1 }}>
          {error && (
            <div
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                display: "flex",
                gap: "0.5rem",
                alignItems: "center",
                fontSize: "0.85rem",
                marginBottom: "1rem"
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Diagnosis */}
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>
              Primary Diagnosis / Clinical Findings *
            </label>
            <input
              type="text"
              placeholder="e.g. Acute Bronchitis, Essential Hypertension"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              className="form-control"
              style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
              required
            />
          </div>

          {/* Vitals */}
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>
              Patient Vitals
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }}>
              <div>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Blood Pressure</span>
                <input
                  type="text"
                  placeholder="120/80"
                  value={bp}
                  onChange={(e) => setBp(e.target.value)}
                  style={{ width: "100%", padding: "0.4rem 0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                />
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Pulse / HR</span>
                <input
                  type="text"
                  placeholder="72 bpm"
                  value={pulse}
                  onChange={(e) => setPulse(e.target.value)}
                  style={{ width: "100%", padding: "0.4rem 0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                />
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Weight (kg)</span>
                <input
                  type="text"
                  placeholder="65 kg"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  style={{ width: "100%", padding: "0.4rem 0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                />
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Temp</span>
                <input
                  type="text"
                  placeholder="98.6 F"
                  value={temp}
                  onChange={(e) => setTemp(e.target.value)}
                  style={{ width: "100%", padding: "0.4rem 0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                />
              </div>
            </div>
          </div>

          {/* Medicines */}
          <div style={{ marginBottom: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#334155" }}>
                Prescribed Medications (Rx) *
              </label>
              <button
                type="button"
                onClick={handleAddMedicine}
                className="btn btn-outline"
                style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem", gap: "0.3rem" }}
              >
                <Plus size={14} /> Add Medicine
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {medicines.map((med, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2.5fr 1.2fr 2fr 1.2fr 2fr auto",
                    gap: "0.4rem",
                    alignItems: "center",
                    background: "#f8fafc",
                    padding: "0.5rem",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0"
                  }}
                >
                  <input
                    type="text"
                    placeholder="Medicine Name *"
                    value={med.name}
                    onChange={(e) => handleMedicineChange(idx, "name", e.target.value)}
                    style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Dosage (500mg)"
                    value={med.dosage}
                    onChange={(e) => handleMedicineChange(idx, "dosage", e.target.value)}
                    style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                  />
                  <input
                    type="text"
                    placeholder="Frequency"
                    value={med.frequency}
                    onChange={(e) => handleMedicineChange(idx, "frequency", e.target.value)}
                    style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                  />
                  <input
                    type="text"
                    placeholder="Duration"
                    value={med.duration}
                    onChange={(e) => handleMedicineChange(idx, "duration", e.target.value)}
                    style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                  />
                  <input
                    type="text"
                    placeholder="Instructions"
                    value={med.instructions}
                    onChange={(e) => handleMedicineChange(idx, "instructions", e.target.value)}
                    style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveMedicine(idx)}
                    disabled={medicines.length <= 1}
                    style={{
                      background: "none",
                      border: "none",
                      color: medicines.length <= 1 ? "#cbd5e1" : "#ef4444",
                      cursor: medicines.length <= 1 ? "default" : "pointer",
                      padding: "4px"
                    }}
                    title="Remove"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Advice & Tests */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>
                Diagnostic Tests Recommended
              </label>
              <input
                type="text"
                placeholder="e.g. CBC, Serum Creatinine, ECG"
                value={tests}
                onChange={(e) => setTests(e.target.value)}
                style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>
                Follow-Up Date
              </label>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>
              General Advice & Dietary Instructions
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Drink plenty of warm water, avoid oily food, complete antibiotic course."
              value={adviceNotes}
              onChange={(e) => setAdviceNotes(e.target.value)}
              style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
            <input
              type="checkbox"
              id="markCompleted"
              checked={markCompleted}
              onChange={(e) => setMarkCompleted(e.target.checked)}
            />
            <label htmlFor="markCompleted" style={{ fontSize: "0.85rem", color: "#475569", cursor: "pointer" }}>
              Mark this consultation as officially completed upon issuing prescription
            </label>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} className="btn btn-outline">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
              style={{ minWidth: "160px", justifyContent: "center" }}
            >
              {submitting ? (
                <div className="spinner" style={{ width: "1.2rem", height: "1.2rem", color: "white" }} />
              ) : (
                "Issue Digital Prescription"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IssuePrescriptionModal;
