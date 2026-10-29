import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Stethoscope, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

const POPULAR_SPECIALIZATIONS = [
  "General Physician",
  "Cardiology",
  "Pediatrics",
  "Dermatology",
  "Neurology",
  "Orthopedics",
  "Psychiatry",
  "Gynecology",
  "ENT Specialist",
  "Ophthalmology",
];

const Register = () => {
  const [roleTab, setRoleTab] = useState("patient");
  const [submitting, setSubmitting] = useState(false);
  const { registerPatient, registerDoctor } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  // Common fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Patient fields
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [gender, setGender] = useState("Male");

  // Doctor fields
  const [doctorName, setDoctorName] = useState("");
  const [specialization, setSpecialization] = useState(POPULAR_SPECIALIZATIONS[0]);
  const [qualifications, setQualifications] = useState("");
  const [experienceYears, setExperienceYears] = useState(5);
  const [consultationFee, setConsultationFee] = useState(500);
  const [doctorPhone, setDoctorPhone] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (roleTab === "patient") {
        await registerPatient({
          email,
          password,
          full_name: patientName,
          phone: patientPhone,
          gender,
        });
        showSuccess("Patient account created successfully!");
        navigate("/patient/dashboard");
      } else if (roleTab === "doctor") {
        await registerDoctor({
          email,
          password,
          full_name: doctorName,
          specialization,
          qualifications,
          experience_years: parseInt(experienceYears, 10),
          consultation_fee: parseFloat(consultationFee),
          phone: doctorPhone,
        });
        showSuccess("Doctor registration submitted! Your account is pending administrator verification.");
        navigate("/doctor/dashboard");
      }
    } catch (err) {
      showError(err.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: "3rem 1.5rem", minHeight: "calc(100vh - 4.5rem)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="card" style={{ maxWidth: "560px", width: "100%", padding: "2.5rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--primary)", marginBottom: "0.5rem" }}>
            Join MediPulse Platform
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Create an account to book doctor consultations or manage your clinical practice.
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.5rem",
          marginBottom: "2rem",
          backgroundColor: "var(--bg-page)",
          padding: "0.35rem",
          borderRadius: "var(--radius-sm)"
        }}>
          <button
            type="button"
            onClick={() => setRoleTab("patient")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
              padding: "0.7rem",
              borderRadius: "var(--radius-xs)",
              fontWeight: 700,
              fontSize: "0.9rem",
              border: "none",
              backgroundColor: roleTab === "patient" ? "#FFFFFF" : "transparent",
              color: roleTab === "patient" ? "var(--primary)" : "var(--text-secondary)",
              boxShadow: roleTab === "patient" ? "var(--shadow-sm)" : "none",
              cursor: "pointer"
            }}
          >
            <User size={16} />
            <span>I am a Patient</span>
          </button>

          <button
            type="button"
            onClick={() => setRoleTab("doctor")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
              padding: "0.7rem",
              borderRadius: "var(--radius-xs)",
              fontWeight: 700,
              fontSize: "0.9rem",
              border: "none",
              backgroundColor: roleTab === "doctor" ? "#FFFFFF" : "transparent",
              color: roleTab === "doctor" ? "var(--primary)" : "var(--text-secondary)",
              boxShadow: roleTab === "doctor" ? "var(--shadow-sm)" : "none",
              cursor: "pointer"
            }}
          >
            <Stethoscope size={16} />
            <span>I am a Doctor</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Account Credentials */}
          <div className="form-group" style={{ marginBottom: "1rem" }}>
            <label className="form-label">Email Address *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="form-control"
            />
          </div>

          <div className="form-group" style={{ marginBottom: "1rem" }}>
            <label className="form-label">Password * (min 6 characters)</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="form-control"
            />
          </div>

          {/* Patient Form Fields */}
          {roleTab === "patient" && (
            <>
              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="form-control"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="tel"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="form-control"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Doctor Form Fields */}
          {roleTab === "doctor" && (
            <>
              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label className="form-label">Doctor Name *</label>
                <input
                  type="text"
                  required
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  placeholder="e.g. Dr. Sarah Jenkins"
                  className="form-control"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div className="form-group">
                  <label className="form-label">Specialization *</label>
                  <select
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    className="form-control"
                    required
                  >
                    {POPULAR_SPECIALIZATIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Phone</label>
                  <input
                    type="tel"
                    value={doctorPhone}
                    onChange={(e) => setDoctorPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="form-control"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: "1rem" }}>
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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div className="form-group">
                  <label className="form-label">Experience (Years)</label>
                  <input
                    type="number"
                    min={0}
                    max={70}
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value)}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Consultation Fee (₹ INR)</label>
                  <input
                    type="number"
                    min={0}
                    value={consultationFee}
                    onChange={(e) => setConsultationFee(e.target.value)}
                    className="form-control"
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ width: "100%", padding: "0.85rem", marginTop: "1rem", fontSize: "1rem" }}
          >
            {submitting ? <div className="spinner" /> : `Create ${roleTab === "doctor" ? "Doctor" : "Patient"} Account`}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "1.75rem", fontSize: "0.88rem", color: "var(--text-secondary)" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "var(--primary)", fontWeight: 700 }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
