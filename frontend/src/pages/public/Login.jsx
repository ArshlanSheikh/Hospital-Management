import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogIn, Key, Mail, ShieldCheck, UserCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

const DEMO_ACCOUNTS = [
  { role: "patient", label: "Patient Demo", email: "patient@example.com", pass: "Patient@123456" },
  { role: "doctor", label: "Doctor Demo (Dr. Sarah)", email: "sarah.jenkins@medicare.com", pass: "Doctor@123456" },
  { role: "admin", label: "Admin Demo", email: "admin@medicare.com", pass: "Admin@123456" },
];

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      showError("Please enter your email and password");
      return;
    }

    setSubmitting(true);
    try {
      const loggedInUser = await login(email, password);
      showSuccess(`Welcome back, ${loggedInUser.name || loggedInUser.email}!`);

      const userRole = loggedInUser.role?.toLowerCase();
      switch (userRole) {
        case "patient":
          navigate("/patient/dashboard");
          break;
        case "doctor":
          navigate("/doctor/dashboard");
          break;
        case "admin":
        case "platform_admin":
          navigate("/admin/dashboard");
          break;
        default:
          navigate("/");
      }
    } catch (err) {
      showError(err.message || "Invalid email or password");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFillDemo = (acc) => {
    setEmail(acc.email);
    setPassword(acc.pass);
  };

  return (
    <div style={{ padding: "4rem 1.5rem", minHeight: "calc(100vh - 4.5rem)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="card" style={{ maxWidth: "460px", width: "100%", padding: "2.5rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--primary)", marginBottom: "0.5rem" }}>
            Account Sign In
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Access your patient portal, doctor workspace, or administration dashboard.
          </p>
        </div>

        {/* Quick Fill Demo Credentials */}
        <div style={{
          backgroundColor: "var(--bg-page)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          padding: "0.85rem",
          marginBottom: "1.5rem"
        }}>
          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "0.5rem", textTransform: "uppercase" }}>
            Quick Demo Autofill:
          </span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.4rem" }}>
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.role}
                type="button"
                onClick={() => handleFillDemo(acc)}
                className="btn btn-outline"
                style={{ padding: "0.4rem 0.6rem", fontSize: "0.82rem", justifyContent: "flex-start", gap: "0.4rem" }}
              >
                <UserCheck size={14} color="var(--primary)" />
                <span>{acc.label}</span>
                <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "var(--text-muted)" }}>{acc.email}</span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleLoginSubmit}>
          <div className="form-group" style={{ marginBottom: "1.25rem" }}>
            <label className="form-label">Email Address</label>
            <div style={{ position: "relative" }}>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="form-control"
                style={{ paddingLeft: "2.3rem" }}
              />
              <Mail size={16} color="var(--text-muted)" style={{ position: "absolute", left: "0.8rem", top: "50%", transform: "translateY(-50%)" }} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: "1.25rem" }}>
            <label className="form-label">Password</label>
            <div style={{ position: "relative" }}>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="form-control"
                style={{ paddingLeft: "2.3rem" }}
              />
              <Key size={16} color="var(--text-muted)" style={{ position: "absolute", left: "0.8rem", top: "50%", transform: "translateY(-50%)" }} />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ width: "100%", padding: "0.85rem", marginTop: "1rem", fontSize: "1rem" }}
          >
            {submitting ? <div className="spinner" /> : "Sign In to Platform"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "1.75rem", fontSize: "0.88rem", color: "var(--text-secondary)" }}>
          Don't have an account yet?{" "}
          <Link to="/register" style={{ color: "var(--primary)", fontWeight: 700 }}>
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
