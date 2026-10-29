import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Filter, CheckCircle2, Stethoscope, ChevronLeft, ChevronRight, IndianRupee } from "lucide-react";
import apiClient from "../../api/client";

const SPECIALIZATIONS_LIST = [
  "All Specializations",
  "Cardiology",
  "Pediatrics",
  "Dermatology",
  "Neurology",
  "Orthopedics",
  "General Physician",
  "Psychiatry",
  "Gynecology",
  "ENT Specialist",
  "Ophthalmology",
];

const DoctorDirectory = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ page: 1, total: 0, pages: 1 });

  const currentSearch = searchParams.get("search") || "";
  const currentSpec = searchParams.get("specialization") || "";
  const currentMaxFee = searchParams.get("max_fee") || "";
  const currentPage = parseInt(searchParams.get("page") || "1", 10);

  const [searchInput, setSearchInput] = useState(currentSearch);
  const [specInput, setSpecInput] = useState(currentSpec);
  const [maxFeeInput, setMaxFeeInput] = useState(currentMaxFee);

  useEffect(() => {
    const fetchDoctors = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (currentSearch) params.set("search", currentSearch);
        if (currentSpec && currentSpec !== "All Specializations") params.set("specialization", currentSpec);
        if (currentMaxFee) params.set("max_fee", currentMaxFee);
        params.set("page", currentPage);
        params.set("limit", 9);

        const res = await apiClient.get(`/doctors?${params.toString()}`);
        setDoctors(res.data?.doctors || []);
        setMeta({
          page: res.data?.page || 1,
          total: res.data?.total || 0,
          pages: res.data?.pages || 1,
        });
      } catch (err) {
        console.error("Doctor directory fetch error", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, [currentSearch, currentSpec, currentMaxFee, currentPage]);

  const handleApplyFilters = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchInput.trim()) params.set("search", searchInput.trim());
    if (specInput && specInput !== "All Specializations") params.set("specialization", specInput);
    if (maxFeeInput) params.set("max_fee", maxFeeInput);
    params.set("page", "1");
    setSearchParams(params);
  };

  const handleResetFilters = () => {
    setSearchInput("");
    setSpecInput("");
    setMaxFeeInput("");
    setSearchParams({});
  };

  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", newPage.toString());
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div style={{ padding: "3rem 0 5rem" }}>
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: "2.5rem" }}>
          <h1 style={{ fontSize: "2.2rem", fontWeight: 800, color: "var(--primary)", marginBottom: "0.5rem" }}>
            Find & Book Specialist Doctors
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "1rem" }}>
            Browse verified medical doctors available for in-person appointments and online consultations.
          </p>
        </div>

        {/* Filter Card */}
        <form onSubmit={handleApplyFilters} className="card" style={{ marginBottom: "2.5rem", padding: "1.5rem" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1.2rem",
            alignItems: "flex-end"
          }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Doctor Name or Keyword</label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  placeholder="e.g. Dr. Sarah, Cardiologist..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="form-control"
                  style={{ paddingLeft: "2.3rem" }}
                />
                <Search size={16} color="var(--text-muted)" style={{ position: "absolute", left: "0.8rem", top: "50%", transform: "translateY(-50%)" }} />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Specialization</label>
              <select
                value={specInput}
                onChange={(e) => setSpecInput(e.target.value)}
                className="form-control"
              >
                {SPECIALIZATIONS_LIST.map((s) => (
                  <option key={s} value={s === "All Specializations" ? "" : s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Max Consultation Fee (₹)</label>
              <input
                type="number"
                placeholder="e.g. 1000"
                value={maxFeeInput}
                onChange={(e) => setMaxFeeInput(e.target.value)}
                className="form-control"
                min={0}
              />
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1, gap: "0.4rem" }}>
                <Filter size={16} />
                <span>Filter</span>
              </button>
              <button type="button" onClick={handleResetFilters} className="btn btn-outline">
                Reset
              </button>
            </div>
          </div>
        </form>

        {/* Results Count */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <span style={{ fontSize: "0.95rem", color: "var(--text-secondary)", fontWeight: 600 }}>
            {meta.total} verified {meta.total === 1 ? "doctor" : "doctors"} available
          </span>
        </div>

        {/* Doctor Grid */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem 0" }}>
            <div className="spinner" style={{ width: "2.5rem", height: "2.5rem", color: "var(--primary)" }} />
          </div>
        ) : doctors.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "4rem 2rem" }}>
            <Stethoscope size={48} color="var(--text-muted)" style={{ margin: "0 auto 1rem" }} />
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>No Doctors Found</h3>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              No doctors matched your current search filters. Try adjusting your criteria.
            </p>
            <button onClick={handleResetFilters} className="btn btn-primary">
              Clear All Filters
            </button>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "1.5rem",
            marginBottom: "3rem"
          }}>
            {doctors.map((doc) => {
              const qualText = Array.isArray(doc.qualifications)
                ? doc.qualifications.join(", ")
                : doc.qualifications || "";

              return (
                <div key={doc.id} className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", transition: "transform 0.2s ease, box-shadow 0.2s ease" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.8rem" }}>
                      <div>
                        <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)" }}>
                          {doc.full_name}
                        </h3>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                          {qualText} • {doc.experience_years} yrs exp.
                        </p>
                      </div>
                      <span className="badge badge-success" style={{ gap: "0.25rem" }}>
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
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden"
                    }}>
                      {doc.bio || "Experienced specialist committed to patient-centered care and evidence-based medicine."}
                    </p>
                  </div>

                  <div style={{
                    borderTop: "1px solid var(--border)",
                    paddingTop: "1.1rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <div>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Consultation Fee</span>
                      <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--primary)" }}>
                        ₹{doc.consultation_fee}
                      </span>
                    </div>
                    <Link to={`/doctors/${doc.id}`} className="btn btn-primary" style={{ padding: "0.55rem 1.25rem" }}>
                      Book Appointment
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {meta.pages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.75rem" }}>
            <button
              onClick={() => handlePageChange(meta.page - 1)}
              disabled={meta.page <= 1}
              className="btn btn-outline"
              style={{ padding: "0.5rem 0.8rem" }}
            >
              <ChevronLeft size={18} />
              <span>Previous</span>
            </button>
            <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)", fontWeight: 600 }}>
              Page {meta.page} of {meta.pages}
            </span>
            <button
              onClick={() => handlePageChange(meta.page + 1)}
              disabled={meta.page >= meta.pages}
              className="btn btn-outline"
              style={{ padding: "0.5rem 0.8rem" }}
            >
              <span>Next</span>
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorDirectory;
