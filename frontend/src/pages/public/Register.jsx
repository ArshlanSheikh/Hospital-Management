import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User,
  Stethoscope,
  Lock,
  Mail,
  Phone,
  Eye,
  EyeOff,
  Activity,
  ShieldCheck,
  AlertCircle,
  UserCheck
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import styles from "./Auth.module.css";

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
  "Gastroenterology",
  "Pulmonology",
  "Oncology",
  "Urology"
];

const Register = () => {
  const [roleTab, setRoleTab] = useState("patient");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const { registerPatient, registerDoctor, isAuthenticated, role, loading } = useAuth();
  const { showSuccess } = useToast();
  const navigate = useNavigate();

  // If already authenticated, redirect to role dashboard immediately
  useEffect(() => {
    if (!loading && isAuthenticated) {
      const userRole = role?.toLowerCase();
      if (userRole === "patient") {
        navigate("/patient/dashboard", { replace: true });
      } else if (userRole === "doctor") {
        navigate("/doctor/dashboard", { replace: true });
      } else if (userRole === "admin" || userRole === "platform_admin") {
        navigate("/admin/dashboard", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    }
  }, [isAuthenticated, role, loading, navigate]);

  // Common fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Patient fields
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [gender, setGender] = useState("Male");
  const [dob, setDob] = useState("");

  // Doctor fields
  const [doctorName, setDoctorName] = useState("");
  const [specialization, setSpecialization] = useState(POPULAR_SPECIALIZATIONS[0]);
  const [qualifications, setQualifications] = useState("MBBS, MD");
  const [experienceYears, setExperienceYears] = useState(5);
  const [consultationFee, setConsultationFee] = useState(500);
  const [doctorPhone, setDoctorPhone] = useState("");
  const [bio, setBio] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email || !password) {
      setErrorMessage("Please fill in both email and password.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    setSubmitting(true);

    try {
      if (roleTab === "patient") {
        if (!patientName.trim()) {
          setErrorMessage("Please enter your full legal name.");
          setSubmitting(false);
          return;
        }

        const newUser = await registerPatient({
          email,
          password,
          full_name: patientName,
          phone: patientPhone,
          gender,
          date_of_birth: dob || null
        });
        showSuccess(`Welcome to MediPulse, ${newUser.name || patientName}!`);
        navigate("/patient/dashboard", { replace: true });
      } else if (roleTab === "doctor") {
        if (!doctorName.trim()) {
          setErrorMessage("Please enter your full professional doctor name.");
          setSubmitting(false);
          return;
        }

        await registerDoctor({
          email,
          password,
          full_name: doctorName,
          specialization,
          qualifications,
          experience_years: parseInt(experienceYears, 10) || 1,
          consultation_fee: parseFloat(consultationFee) || 500,
          phone: doctorPhone,
          bio
        });
        showSuccess("Doctor registration submitted! Verification is in progress.");
        navigate("/doctor/dashboard", { replace: true });
      }
    } catch (err) {
      setErrorMessage(err.message || "Registration failed. Please check your data.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || isAuthenticated) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
        <div className="spinner" style={{ color: "var(--primary)", width: "2.5rem", height: "2.5rem" }} />
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={`${styles.authCard} ${styles.authCardWide}`}>
        {/* Header Section */}
        <div className={styles.headerSection}>
          <div className={styles.logoIcon}>
            <Activity size={26} />
          </div>
          <h1 className={styles.title}>Register Account</h1>
          <p className={styles.subtitle}>Select your account type to access specialized healthcare tools</p>

          {/* Segmented Tab Switcher */}
          <div className={styles.tabSwitcher}>
            <button
              type="button"
              className={`${styles.tabBtn} ${roleTab === "patient" ? styles.tabBtnActive : ""}`}
              onClick={() => {
                setRoleTab("patient");
                setErrorMessage("");
              }}
            >
              <User size={15} />
              <span>Patient Account</span>
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${roleTab === "doctor" ? styles.tabBtnActive : ""}`}
              onClick={() => {
                setRoleTab("doctor");
                setErrorMessage("");
              }}
            >
              <Stethoscope size={15} />
              <span>Doctor Practice</span>
            </button>
          </div>
        </div>

        {/* Body Section */}
        <div className={styles.bodySection}>
          {errorMessage && (
            <div className={styles.errorMessage}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {roleTab === "patient" ? (
              <div>
                <div className={styles.formGrid}>
                  <div className="form-group">
                    <label className="form-label">
                      Full Legal Name <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={patientName}
                      onChange={(e) => {
                        setPatientName(e.target.value);
                        setErrorMessage("");
                      }}
                      placeholder="e.g. Rahul Sharma"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <div className={styles.inputWrapper}>
                      <input
                        type="tel"
                        value={patientPhone}
                        onChange={(e) => setPatientPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className={`form-input ${styles.inputWithIcon}`}
                      />
                      <Phone size={15} className={styles.inputIcon} />
                    </div>
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <div className="form-group">
                    <label className="form-label">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="form-select"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Date of Birth</label>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className={styles.formGrid}>
                  <div className="form-group">
                    <label className="form-label">
                      Doctor Professional Name <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={doctorName}
                      onChange={(e) => {
                        setDoctorName(e.target.value);
                        setErrorMessage("");
                      }}
                      placeholder="e.g. Dr. Sarah Jenkins"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Specialization <span className="required">*</span>
                    </label>
                    <select
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      className="form-select"
                    >
                      {POPULAR_SPECIALIZATIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <div className="form-group">
                    <label className="form-label">
                      Qualifications <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={qualifications}
                      onChange={(e) => setQualifications(e.target.value)}
                      placeholder="e.g. MBBS, MD - Internal Medicine"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Experience (Years)</label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={experienceYears}
                      onChange={(e) => setExperienceYears(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <div className="form-group">
                    <label className="form-label">
                      Consultation Fee (INR ₹) <span className="required">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={consultationFee}
                      onChange={(e) => setConsultationFee(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <div className={styles.inputWrapper}>
                      <input
                        type="tel"
                        value={doctorPhone}
                        onChange={(e) => setDoctorPhone(e.target.value)}
                        placeholder="+91 98765 00000"
                        className={`form-input ${styles.inputWithIcon}`}
                      />
                      <Phone size={15} className={styles.inputIcon} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Email & Password */}
            <div className={styles.formGrid}>
              <div className="form-group">
                <label className="form-label">
                  Account Email <span className="required">*</span>
                </label>
                <div className={styles.inputWrapper}>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrorMessage("");
                    }}
                    placeholder="doctor@hospital.com"
                    className={`form-input ${styles.inputWithIcon}`}
                  />
                  <Mail size={16} className={styles.inputIcon} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Password (min 6 chars) <span className="required">*</span>
                </label>
                <div className={styles.inputWrapper}>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrorMessage("");
                    }}
                    placeholder="••••••••••••"
                    className={`form-input ${styles.inputWithIcon}`}
                    style={{ paddingRight: "38px" }}
                  />
                  <Lock size={16} className={styles.inputIcon} />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={styles.togglePassBtn}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={`btn btn-primary ${styles.submitBtn}`}
            >
              {submitting ? (
                <div className="spinner" style={{ width: "1.2rem", height: "1.2rem", color: "white" }} />
              ) : (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                  <UserCheck size={17} />
                  <span>
                    {roleTab === "patient" ? "Create Patient Account" : "Submit Doctor Registration"}
                  </span>
                </span>
              )}
            </button>
          </form>

          <div className={styles.securityNote}>
            <ShieldCheck size={14} color="var(--success)" />
            <span>Certified medical confidentiality and protected healthcare data</span>
          </div>

          <div className={styles.footerPrompt}>
            Already have an account?
            <Link to="/login">Sign in here</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
