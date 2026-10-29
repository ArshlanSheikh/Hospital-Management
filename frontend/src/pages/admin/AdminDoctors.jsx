import React, { useState, useEffect } from "react";
import { ShieldCheck, CheckCircle, XCircle, Search, Clock, Award } from "lucide-react";
import apiClient from "../../api/client";
import { useToast } from "../../context/ToastContext";

const AdminDoctors = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const { showSuccess, showError } = useToast();

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const url = filter === "all" ? "/admin/doctors?limit=50" : `/admin/doctors?status=${filter}&limit=50`;
      const res = await apiClient.get(url);
      setDoctors(res.data?.doctors || []);
    } catch (err) {
      showError(err.message || "Failed to load doctors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, [filter]);

  const handleVerify = async (doctorId, nextStatus) => {
    try {
      await apiClient.patch(`/admin/doctors/${doctorId}/verification`, {
        status: nextStatus,
      });
      showSuccess(`Doctor marked as ${nextStatus}!`);
      fetchDoctors();
    } catch (err) {
      showError(err.message || "Failed to update verification status");
    }
  };

  const filteredDoctors = doctors.filter((d) => {
    const term = searchTerm.toLowerCase();
    return (
      d.full_name?.toLowerCase().includes(term) ||
      d.specialization?.toLowerCase().includes(term) ||
      d.email?.toLowerCase().includes(term)
    );
  });

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--primary)", marginBottom: "0.3rem" }}>
          Doctor Credentialing & Verification
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
          Review qualifications, verify credentials, and authorize doctors for appointment booking.
        </p>
      </div>

      {/* Tabs & Search */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
        <div style={{
          display: "flex",
          gap: "0.5rem",
          borderBottom: "1px solid var(--border)",
          paddingBottom: "0.5rem"
        }}>
          <button
            onClick={() => setFilter("pending")}
            style={{
              padding: "0.45rem 1rem",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.85rem",
              fontWeight: 600,
              border: "none",
              backgroundColor: filter === "pending" ? "var(--primary-light)" : "transparent",
              color: filter === "pending" ? "var(--primary)" : "var(--text-secondary)",
              cursor: "pointer"
            }}
          >
            Pending Review
          </button>
          <button
            onClick={() => setFilter("verified")}
            style={{
              padding: "0.45rem 1rem",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.85rem",
              fontWeight: 600,
              border: "none",
              backgroundColor: filter === "verified" ? "var(--primary-light)" : "transparent",
              color: filter === "verified" ? "var(--primary)" : "var(--text-secondary)",
              cursor: "pointer"
            }}
          >
            Verified Doctors
          </button>
          <button
            onClick={() => setFilter("all")}
            style={{
              padding: "0.45rem 1rem",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.85rem",
              fontWeight: 600,
              border: "none",
              backgroundColor: filter === "all" ? "var(--primary-light)" : "transparent",
              color: filter === "all" ? "var(--primary)" : "var(--text-secondary)",
              cursor: "pointer"
            }}
          >
            All Doctors
          </button>
        </div>

        <div style={{ position: "relative", minWidth: "260px" }}>
          <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            type="text"
            className="form-control"
            placeholder="Search by doctor name or specialization..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: "2.3rem", fontSize: "0.85rem" }}
          />
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem" }}>
            <div className="spinner" style={{ color: "var(--primary)", width: "2rem", height: "2rem", margin: "0 auto" }} />
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-muted)" }}>
            <ShieldCheck size={40} style={{ margin: "0 auto 0.75rem", opacity: 0.5 }} />
            <p>No doctors found in this queue.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-light)", borderBottom: "1px solid var(--border-color)" }}>
                  <th style={{ padding: "1rem", textAlign: "left" }}>Doctor</th>
                  <th style={{ padding: "1rem", textAlign: "left" }}>Specialization</th>
                  <th style={{ padding: "1rem", textAlign: "left" }}>Qualifications</th>
                  <th style={{ padding: "1rem", textAlign: "left" }}>Experience & Fee</th>
                  <th style={{ padding: "1rem", textAlign: "left" }}>Status</th>
                  <th style={{ padding: "1rem", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDoctors.map((doc) => {
                  const isVerified = doc.verification_status === "verified";
                  const qualText = Array.isArray(doc.qualifications)
                    ? doc.qualifications.join(", ")
                    : doc.qualifications || "Not specified";

                  return (
                    <tr key={doc.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                      <td style={{ padding: "1rem" }}>
                        <div style={{ fontWeight: 700, color: "var(--text-dark)" }}>{doc.full_name}</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{doc.email || doc.phone}</div>
                      </td>
                      <td style={{ padding: "1rem" }}>
                        <span className="badge badge-primary">{doc.specialization}</span>
                      </td>
                      <td style={{ padding: "1rem", fontSize: "0.85rem", maxWidth: "250px" }}>
                        {qualText}
                      </td>
                      <td style={{ padding: "1rem", fontSize: "0.85rem" }}>
                        <div>{doc.experience_years} years</div>
                        <div style={{ fontWeight: 600, color: "var(--primary)" }}>₹{doc.consultation_fee}</div>
                      </td>
                      <td style={{ padding: "1rem" }}>
                        <span className={`badge ${isVerified ? "badge-success" : "badge-warning"}`}>
                          {doc.verification_status}
                        </span>
                      </td>
                      <td style={{ padding: "1rem", textAlign: "right" }}>
                        {!isVerified ? (
                          <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                            <button
                              onClick={() => handleVerify(doc.id, "verified")}
                              className="btn btn-primary"
                              style={{ fontSize: "0.8rem", padding: "0.35rem 0.75rem", gap: "0.3rem" }}
                            >
                              <CheckCircle size={14} />
                              <span>Verify</span>
                            </button>
                            <button
                              onClick={() => handleVerify(doc.id, "rejected")}
                              className="btn btn-outline"
                              style={{ fontSize: "0.8rem", padding: "0.35rem 0.75rem", color: "var(--danger)" }}
                            >
                              <XCircle size={14} />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleVerify(doc.id, "pending")}
                            className="btn btn-outline"
                            style={{ fontSize: "0.8rem", padding: "0.35rem 0.75rem", color: "var(--danger)" }}
                          >
                            <XCircle size={14} />
                            <span>Revoke</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDoctors;
