import React from "react";
import { Link } from "react-router-dom";
import { Activity, ShieldCheck, Mail, Phone, MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer style={{ backgroundColor: "#0F172A", color: "#F8FAFC", marginTop: "auto", borderTop: "1px solid #1E293B" }}>
      <div className="container" style={{ padding: "4rem 1.5rem 2rem" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "2.5rem",
          marginBottom: "3rem"
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "2.25rem",
                height: "2.25rem",
                background: "linear-gradient(135deg, #0A4D68, #05BFDB)",
                borderRadius: "var(--radius-sm)",
                color: "white"
              }}>
                <Activity size={20} />
              </div>
              <span style={{ fontSize: "1.35rem", fontWeight: 800, color: "#FFFFFF" }}>MediPulse</span>
            </div>
            <p style={{ color: "#94A3B8", fontSize: "0.88rem", lineHeight: 1.6, marginBottom: "1.2rem" }}>
              Connecting patients with verified medical specialists with guaranteed zero-conflict appointment booking.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#10B981", fontSize: "0.85rem", fontWeight: 600 }}>
              <ShieldCheck size={18} />
              <span>100% Verified Medical Practitioners</span>
            </div>
          </div>

          <div>
            <h4 style={{ color: "#FFFFFF", fontSize: "1rem", fontWeight: 700, marginBottom: "1.2rem" }}>Quick Navigation</h4>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.65rem", fontSize: "0.88rem", color: "#94A3B8" }}>
              <li><Link to="/doctors" style={{ transition: "color 0.2s" }}>Find Specialist Doctors</Link></li>
              <li><Link to="/login" style={{ transition: "color 0.2s" }}>Patient & Doctor Sign In</Link></li>
              <li><Link to="/register" style={{ transition: "color 0.2s" }}>Create Free Account</Link></li>
            </ul>
          </div>

          <div>
            <h4 style={{ color: "#FFFFFF", fontSize: "1rem", fontWeight: 700, marginBottom: "1.2rem" }}>Medical Disciplines</h4>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.65rem", fontSize: "0.88rem", color: "#94A3B8" }}>
              <li>Cardiology & Heart Health</li>
              <li>Pediatrics & Child Wellness</li>
              <li>General Medicine & Consultations</li>
              <li>Neurology & Brain Health</li>
              <li>Dermatology & Skin Care</li>
            </ul>
          </div>

          <div>
            <h4 style={{ color: "#FFFFFF", fontSize: "1rem", fontWeight: 700, marginBottom: "1.2rem" }}>Help & Support</h4>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.88rem", color: "#94A3B8" }}>
              <li style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Phone size={16} color="#05BFDB" />
                <span>+91 1800 123 4567</span>
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Mail size={16} color="#05BFDB" />
                <span>support@medipulse.org</span>
              </li>
              <li style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                <MapPin size={16} color="#05BFDB" style={{ flexShrink: 0, marginTop: "0.2rem" }} />
                <span>Healthcare Innovation Plaza</span>
              </li>
            </ul>
          </div>
        </div>

        <div style={{
          borderTop: "1px solid #1E293B",
          paddingTop: "2rem",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          fontSize: "0.85rem",
          color: "#64748B"
        }}>
          <div>© 2026 MediPulse Consultation Platform. All rights reserved.</div>
          <div>In case of acute medical emergency, please dial your local emergency services immediately.</div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
