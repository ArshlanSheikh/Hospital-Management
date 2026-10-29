import React, { useState, useEffect } from "react";
import { Save, CheckCircle2, ShieldCheck, Stethoscope } from "lucide-react";
import apiClient from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

const DoctorProfile = () => {
  const { user, refreshUser } = useAuth();
  const { showSuccess, showError } = useToast();

  const [fullName, setFullName] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [experienceYears, setExperienceYears] = useState(0);
  const [bio, setBio] = useState("");
  const [consultationFee, setConsultationFee] = useState(500);
  const [phone, setPhone] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await apiClient.get("/doctors/me");
        const d = res.data;
        if (d) {
          setFullName(d.full_name || "");
          setSpecialization(d.specialization || "");
          const quals = Array.isArray(d.qualifications) ? d.qualifications.join(", ") : d.qualifications || "";
          setQualifications(quals);
          setExperienceYears(d.experience_years || 0);
          setBio(d.bio || "");
          setConsultationFee(d.consultation_fee || 500);
          setPhone(d.phone || "");
          setVerificationStatus(d.verification_status || "pending");
        }
      } catch (err) {
        showError("Failed to load doctor profile");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.patch("/doctors/me", {
        full_name: fullName,
        specialization,
        qualifications,
        experience_years: parseInt(experienceYears, 10),
        bio,
        consultation_fee: parseFloat(consultationFee),
        phone,
      });
      await refreshUser();
      showSuccess("Doctor profile updated successfully!");
    } catch (err) {
      showError(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "4rem 0" }}>
        <div className="spinner" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  const isVerified = verificationStatus === "verified";

  return (
    <div style={{ maxWidth: "700px" }}>
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.3rem" }}>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--primary)" }}>
            Professional Doctor Profile
          </h1>
          <span className={`badge ${isVerified ? "badge-success" : "badge-warning"}`}>
            {isVerified ? "Verified Practitioner" : "Pending Verification"}
          </span>
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
          Keep your professional credentials, consultation fee, and clinical bio updated.
        </p>
      </div>

      <div className="card" style={{ padding: "2rem" }}>
        <form onSubmit={handleSave}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Primary Specialization *</label>
              <input
                type="text"
                required
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                className="form-control"
                placeholder="e.g. Cardiology"
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label">Contact Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Years of Experience</label>
              <input
                type="number"
                min={0}
                max={70}
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
                className="form-control"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Medical Qualifications *</label>
            <input
              type="text"
              required
              value={qualifications}
              onChange={(e) => setQualifications(e.target.value)}
              placeholder="e.g. MBBS, MD (Cardiology) - Harvard Medical School"
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Consultation Fee (₹ INR) *</label>
            <input
              type="number"
              min={0}
              step="1"
              required
              value={consultationFee}
              onChange={(e) => setConsultationFee(e.target.value)}
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Professional Biography</label>
            <textarea
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Describe your medical expertise, areas of focus, and patient philosophy..."
              className="form-control"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary"
            style={{ width: "100%", padding: "0.85rem", gap: "0.5rem", marginTop: "1rem" }}
          >
            {saving ? <div className="spinner" /> : (
              <>
                <Save size={18} />
                <span>Save Profile Updates</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default DoctorProfile;
