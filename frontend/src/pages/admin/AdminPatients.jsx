import React, { useState, useEffect } from "react";
import { Users, Search, ShieldAlert, ShieldCheck } from "lucide-react";
import apiClient from "../../api/client";
import { useToast } from "../../context/ToastContext";

const AdminPatients = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { showSuccess, showError } = useToast();

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/admin/patients?limit=50");
      setPatients(res.data?.patients || []);
    } catch (err) {
      showError(err.message || "Failed to load patient accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleToggleStatus = async (userId, currentStatus) => {
    const nextStatus = currentStatus === "suspended" ? "active" : "suspended";
    try {
      await apiClient.patch(`/admin/users/${userId}/status`, { status: nextStatus });
      showSuccess(`Patient account status updated to ${nextStatus}`);
      fetchPatients();
    } catch (err) {
      showError(err.message || "Failed to update account status");
    }
  };

  const filteredPatients = patients.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.name?.toLowerCase().includes(term) ||
      p.email?.toLowerCase().includes(term) ||
      p.phone?.toLowerCase().includes(term)
    );
  });

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--text-dark)", marginBottom: "0.25rem" }}>
          Manage Patients
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
          View registered patients, profile details, and manage account statuses.
        </p>
      </div>

      <div className="card" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
        <div style={{ position: "relative", maxWidth: "400px" }}>
          <Search size={18} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            type="text"
            className="form-control"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: "2.75rem" }}
          />
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center" }}>
            <div className="spinner" style={{ color: "var(--primary)", width: "2rem", height: "2rem", margin: "0 auto" }} />
          </div>
        ) : filteredPatients.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
            <Users size={40} style={{ opacity: 0.4, marginBottom: "0.5rem" }} />
            <p>No registered patients found.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-light)", borderBottom: "1px solid var(--border-color)" }}>
                  <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.85rem", fontWeight: 600 }}>Patient</th>
                  <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.85rem", fontWeight: 600 }}>Contact Info</th>
                  <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.85rem", fontWeight: 600 }}>Gender / Blood</th>
                  <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.85rem", fontWeight: 600 }}>Status</th>
                  <th style={{ padding: "1rem", textAlign: "right", fontSize: "0.85rem", fontWeight: 600 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((p) => {
                  const isSuspended = p.account_status === "suspended";
                  return (
                    <tr key={p.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                      <td style={{ padding: "1rem" }}>
                        <div style={{ fontWeight: 600, color: "var(--text-dark)" }}>{p.name}</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{p.email}</div>
                      </td>
                      <td style={{ padding: "1rem", fontSize: "0.9rem" }}>
                        {p.phone || "Not provided"}
                      </td>
                      <td style={{ padding: "1rem", fontSize: "0.9rem" }}>
                        {p.profile?.gender || "N/A"} {p.profile?.blood_group ? `(${p.profile.blood_group})` : ""}
                      </td>
                      <td style={{ padding: "1rem" }}>
                        <span className={`badge ${isSuspended ? "badge-danger" : "badge-success"}`}>
                          {p.account_status || "active"}
                        </span>
                      </td>
                      <td style={{ padding: "1rem", textAlign: "right" }}>
                        <button
                          onClick={() => handleToggleStatus(p.id, p.account_status)}
                          className={`btn ${isSuspended ? "btn-primary" : "btn-outline"}`}
                          style={{ fontSize: "0.8rem", padding: "0.35rem 0.75rem", gap: "0.3rem" }}
                        >
                          {isSuspended ? (
                            <>
                              <ShieldCheck size={14} /> Activate
                            </>
                          ) : (
                            <>
                              <ShieldAlert size={14} /> Suspend
                            </>
                          )}
                        </button>
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

export default AdminPatients;
