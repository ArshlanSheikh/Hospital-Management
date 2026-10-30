import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogIn, Lock, Mail, Eye, EyeOff, ShieldCheck, Activity, AlertCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import styles from "./Auth.module.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const { login, isAuthenticated, role, loading } = useAuth();
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

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email || !password) {
      setErrorMessage("Please enter both email address and password.");
      return;
    }

    setSubmitting(true);
    try {
      const loggedInUser = await login(email, password);
      showSuccess(`Welcome back, ${loggedInUser.name || loggedInUser.email}!`);

      const userRole = loggedInUser.role?.toLowerCase();
      if (userRole === "patient") {
        navigate("/patient/dashboard", { replace: true });
      } else if (userRole === "doctor") {
        navigate("/doctor/dashboard", { replace: true });
      } else if (userRole === "admin" || userRole === "platform_admin") {
        navigate("/admin/dashboard", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (err) {
      setErrorMessage(err.message || "Invalid email or password. Please verify your credentials.");
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
      <div className={styles.authCard}>
        {/* Header Section */}
        <div className={styles.headerSection}>
          <div className={styles.logoIcon}>
            <Activity size={26} />
          </div>
          <h1 className={styles.title}>MediPulse Portal</h1>
          <p className={styles.subtitle}>Unified clinical, patient, and administrative authentication</p>
        </div>

        {/* Body Section */}
        <div className={styles.bodySection}>
          {errorMessage && (
            <div className={styles.errorMessage}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label className="form-label">
                Email Address <span className="required">*</span>
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
                  placeholder="name@example.com"
                  className={`form-input ${styles.inputWithIcon}`}
                />
                <Mail size={16} className={styles.inputIcon} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Password <span className="required">*</span>
              </label>
              <div className={styles.inputWrapper}>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
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

            <button
              type="submit"
              disabled={submitting}
              className={`btn btn-primary ${styles.submitBtn}`}
            >
              {submitting ? (
                <div className="spinner" style={{ width: "1.2rem", height: "1.2rem", color: "white" }} />
              ) : (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                  <LogIn size={17} />
                  <span>Sign In</span>
                </span>
              )}
            </button>
          </form>

          <div className={styles.securityNote}>
            <ShieldCheck size={14} color="var(--success)" />
            <span>256-bit encrypted HIPAA-compliant clinical gateway</span>
          </div>

          <div className={styles.footerPrompt}>
            Don&apos;t have an account?
            <Link to="/register">Create an account</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
