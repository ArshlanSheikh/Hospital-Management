import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  ShieldCheck,
  CalendarCheck2,
  ArrowRight,
  Clock,
  CheckCircle2,
  Users,
  Stethoscope
} from "lucide-react";
import apiClient from "../../api/client";

const POPULAR_SPECIALTIES = [
  "Cardiology",
  "Pediatrics",
  "Dermatology",
  "Neurology",
  "Orthopedics",
  "General Physician",
];

const Home = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [featuredDoctors, setFeaturedDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const docsRes = await apiClient.get("/doctors?limit=4");
        setFeaturedDoctors(docsRes.data?.doctors || []);
      } catch (err) {
        console.error("Home data fetch error", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/doctors?search=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      navigate("/doctors");
    }
  };

  return (
    <div>
      {/* Hero Section */}
      <section style={{
        background: "linear-gradient(135deg, #0A4D68 0%, #088395 70%, #05BFDB 100%)",
        color: "#FFFFFF",
        padding: "5rem 0 6rem",
        position: "relative",
        overflow: "hidden"
      }}>
        <div className="container" style={{ position: "relative", zIndex: 2 }}>
          <div style={{ maxWidth: "780px", margin: "0 auto", textAlign: "center" }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              backgroundColor: "rgba(255, 255, 255, 0.15)",
              backdropFilter: "blur(6px)",
              padding: "0.35rem 1rem",
              borderRadius: "var(--radius-full)",
              fontSize: "0.85rem",
              fontWeight: 600,
              marginBottom: "1.5rem"
            }}>
              <ShieldCheck size={16} />
              <span>Verified Doctor Consultation & Booking Platform</span>
            </div>

            <h1 style={{
              fontSize: "clamp(2.2rem, 5vw, 3.5rem)",
              fontWeight: 800,
              lineHeight: 1.15,
              marginBottom: "1.5rem",
              letterSpacing: "-0.03em"
            }}>
              Find Verified Doctors & Book Appointments Seamlessly
            </h1>

            <p style={{
              fontSize: "1.1rem",
              color: "rgba(255, 255, 255, 0.9)",
              lineHeight: 1.6,
              marginBottom: "2.5rem"
            }}>
              Discover top specialist doctors, check real-time availability slots, and confirm appointments with guaranteed zero double-booking protection.
            </p>

            {/* Quick Search Bar */}
            <form onSubmit={handleSearchSubmit} style={{
              display: "flex",
              backgroundColor: "#FFFFFF",
              borderRadius: "var(--radius-full)",
              padding: "0.45rem",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              maxWidth: "600px",
              margin: "0 auto 2rem"
            }}>
              <div style={{ display: "flex", alignItems: "center", paddingLeft: "1.2rem", color: "var(--text-muted)" }}>
                <Search size={20} />
              </div>
              <input
                type="text"
                placeholder="Search doctors, specializations, or keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  flex: 1,
                  border: "none",
                  padding: "0.85rem 1rem",
                  fontSize: "0.95rem",
                  outline: "none",
                  color: "var(--text-primary)"
                }}
              />
              <button type="submit" className="btn btn-primary" style={{ borderRadius: "var(--radius-full)", padding: "0.8rem 1.8rem" }}>
                Search
              </button>
            </form>

            {/* Quick specialties tags */}
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.8)", alignSelf: "center", marginRight: "0.5rem" }}>
                Popular:
              </span>
              {POPULAR_SPECIALTIES.map((spec) => (
                <Link
                  key={spec}
                  to={`/doctors?specialization=${encodeURIComponent(spec)}`}
                  style={{
                    fontSize: "0.82rem",
                    backgroundColor: "rgba(255, 255, 255, 0.15)",
                    padding: "0.3rem 0.85rem",
                    borderRadius: "var(--radius-full)",
                    color: "#FFFFFF",
                    fontWeight: 500,
                    transition: "background 0.2s"
                  }}
                >
                  {spec}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section style={{ transform: "translateY(-2rem)", zIndex: 10, position: "relative" }}>
        <div className="container">
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1.5rem",
            backgroundColor: "#FFFFFF",
            padding: "2rem",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-lg)",
            border: "1px solid var(--border)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ width: "3.2rem", height: "3.2rem", borderRadius: "var(--radius-md)", backgroundColor: "var(--primary-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>
                <Users size={24} />
              </div>
              <div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)" }}>100%</div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Verified Specialists</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ width: "3.2rem", height: "3.2rem", borderRadius: "var(--radius-md)", backgroundColor: "var(--accent-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--secondary)" }}>
                <Stethoscope size={24} />
              </div>
              <div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)" }}>Multiple</div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Medical Disciplines</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ width: "3.2rem", height: "3.2rem", borderRadius: "var(--radius-md)", backgroundColor: "var(--success-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--success)" }}>
                <CalendarCheck2 size={24} />
              </div>
              <div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)" }}>Zero-Conflict</div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Real-Time Slot Engine</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ width: "3.2rem", height: "3.2rem", borderRadius: "var(--radius-md)", backgroundColor: "var(--warning-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--warning)" }}>
                <Clock size={24} />
              </div>
              <div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)" }}>Instant</div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Booking Confirmation</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Doctors Section */}
      <section style={{ padding: "4rem 0" }}>
        <div className="container">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2.5rem" }}>
            <div>
              <span className="badge badge-primary" style={{ marginBottom: "0.5rem" }}>Verified Practitioners</span>
              <h2 style={{ fontSize: "2rem", fontWeight: 800, color: "var(--primary)" }}>Featured Doctors</h2>
            </div>
            <Link to="/doctors" className="btn btn-outline" style={{ gap: "0.4rem" }}>
              <span>View All Doctors</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1.5rem"
          }}>
            {featuredDoctors.map((doc) => {
              const qualText = Array.isArray(doc.qualifications)
                ? doc.qualifications.join(", ")
                : doc.qualifications || "";

              return (
                <div key={doc.id} className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                      <div>
                        <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)" }}>
                          {doc.full_name}
                        </h3>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
                          {qualText}
                        </p>
                      </div>
                      <span className="badge badge-success" title="Verified Doctor">
                        <CheckCircle2 size={13} />
                        <span>Verified</span>
                      </span>
                    </div>

                    <div style={{ marginBottom: "1rem" }}>
                      <span className="badge badge-primary">{doc.specialization}</span>
                    </div>

                    <p style={{
                      fontSize: "0.88rem",
                      color: "var(--text-secondary)",
                      lineHeight: 1.5,
                      marginBottom: "1.2rem",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden"
                    }}>
                      {doc.bio || "Experienced specialist committed to superior patient care."}
                    </p>
                  </div>

                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Consultation Fee</span>
                      <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--primary)" }}>₹{doc.consultation_fee}</span>
                    </div>
                    <Link to={`/doctors/${doc.id}`} className="btn btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
                      Book Slot
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section style={{ backgroundColor: "#F1F5F9", padding: "5rem 0" }}>
        <div className="container">
          <div style={{ textAlign: "center", maxWidth: "650px", margin: "0 auto 3.5rem" }}>
            <span className="badge badge-primary" style={{ marginBottom: "0.5rem" }}>Streamlined Care</span>
            <h2 style={{ fontSize: "2rem", fontWeight: 800, color: "var(--primary)", marginBottom: "0.75rem" }}>
              How Doctor Booking Works
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "1rem" }}>
              Connect with certified medical specialists in 3 simple, hassle-free steps.
            </p>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "2rem"
          }}>
            <div className="card" style={{ textAlign: "center", padding: "2.5rem 1.5rem" }}>
              <div style={{
                width: "4rem",
                height: "4rem",
                borderRadius: "50%",
                backgroundColor: "var(--primary-light)",
                color: "var(--primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.5rem"
              }}>
                <Search size={26} />
              </div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.75rem" }}>1. Find Your Doctor</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.6 }}>
                Filter by clinical specialization, consultation fee range, and experience to choose your doctor.
              </p>
            </div>

            <div className="card" style={{ textAlign: "center", padding: "2.5rem 1.5rem" }}>
              <div style={{
                width: "4rem",
                height: "4rem",
                borderRadius: "50%",
                backgroundColor: "var(--accent-light)",
                color: "var(--secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.5rem"
              }}>
                <Clock size={26} />
              </div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.75rem" }}>2. Choose an Open Slot</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.6 }}>
                Browse live doctor schedule availability. Real-time slot locking prevents conflicting reservations.
              </p>
            </div>

            <div className="card" style={{ textAlign: "center", padding: "2.5rem 1.5rem" }}>
              <div style={{
                width: "4rem",
                height: "4rem",
                borderRadius: "50%",
                backgroundColor: "var(--success-light)",
                color: "var(--success)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.5rem"
              }}>
                <CalendarCheck2 size={26} />
              </div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.75rem" }}>3. Instant Confirmation</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.6 }}>
                Receive instant appointment confirmation, schedule tracking, and direct consultation access.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
