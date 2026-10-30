import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Video, PhoneCall, PhoneOff, User, Stethoscope } from "lucide-react";
import apiClient from "../../api/client";
import { useAuth } from "../../context/AuthContext";

const IncomingCallModal = () => {
  const { user, isPatient } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [incomingCall, setIncomingCall] = useState(null);
  const audioContextRef = useRef(null);
  const chimeIntervalRef = useRef(null);

  // Play electronic ringtone chime using Web Audio API
  const startChime = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const playBeep = () => {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
          osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5

          gain.gain.setValueAtTime(0.08, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start();
          osc.stop(ctx.currentTime + 0.4);
        } catch (e) {
          // Non-critical
        }
      };

      playBeep();
      chimeIntervalRef.current = setInterval(playBeep, 2000);
    } catch (e) {
      console.warn("Web Audio API not allowed yet by user interaction:", e);
    }
  };

  const stopChime = () => {
    if (chimeIntervalRef.current) {
      clearInterval(chimeIntervalRef.current);
      chimeIntervalRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.suspend();
    }
  };

  const isUserPatient = isPatient || user?.role?.toLowerCase() === "patient";

  // Poll for incoming calls every 2s if logged in as patient and not currently in consultation room
  useEffect(() => {
    if (!user || !isUserPatient || location.pathname.startsWith("/consultation/")) {
      stopChime();
      setIncomingCall(null);
      return;
    }

    let isMounted = true;
    const checkIncoming = async () => {
      try {
        const res = await apiClient.get("/consultations/incoming");
        const incoming = res.data?.incoming_call || res.incoming_call || (res.data?.data ? res.data.data.incoming_call : null);
        if (incoming) {
          if (isMounted) {
            setIncomingCall((prev) => {
              if (!prev || prev.appointment_id !== incoming.appointment_id) {
                startChime();
              }
              return incoming;
            });
          }
        } else {
          if (isMounted) {
            stopChime();
            setIncomingCall(null);
          }
        }
      } catch (err) {
        // Silently ignore background poll errors
      }
    };

    checkIncoming();
    const timer = setInterval(checkIncoming, 2000);

    return () => {
      isMounted = false;
      clearInterval(timer);
      stopChime();
    };
  }, [user, isUserPatient, location.pathname]);

  const handleAccept = async () => {
    if (!incomingCall) return;
    stopChime();
    const apptId = incomingCall.appointment_id;
    try {
      await apiClient.post(`/consultations/${apptId}/accept-call`);
    } catch (e) {
      // Non-fatal, proceed into room
    }
    setIncomingCall(null);
    navigate(`/consultation/${apptId}`);
  };

  const handleDecline = async () => {
    if (!incomingCall) return;
    stopChime();
    const apptId = incomingCall.appointment_id;
    try {
      await apiClient.post(`/consultations/${apptId}/decline-call`);
    } catch (e) {
      // Non-fatal
    }
    setIncomingCall(null);
  };

  if (!incomingCall) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        animation: "fadeIn 0.2s ease-out"
      }}
    >
      <div
        style={{
          background: "linear-gradient(145deg, #1e293b, #0f172a)",
          border: "2px solid #088395",
          borderRadius: "24px",
          width: "100%",
          maxWidth: "440px",
          padding: "2.5rem 2rem",
          textAlign: "center",
          color: "white",
          boxShadow: "0 25px 50px -12px rgba(8, 131, 149, 0.4)",
          position: "relative"
        }}
      >
        {/* Pulsing Call Avatar */}
        <div style={{ position: "relative", width: "90px", height: "90px", margin: "0 auto 1.5rem" }}>
          <div
            style={{
              position: "absolute",
              inset: "-12px",
              borderRadius: "50%",
              background: "rgba(8, 131, 149, 0.3)",
              animation: "ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite"
            }}
          />
          <div
            style={{
              width: "90px",
              height: "90px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #088395, #05bfdb)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              boxShadow: "0 10px 20px rgba(5, 191, 219, 0.3)",
              position: "relative",
              zIndex: 2
            }}
          >
            <Video size={42} />
          </div>
        </div>

        <span
          className="badge"
          style={{
            backgroundColor: "#065f46",
            color: "#6ee7b7",
            padding: "0.35rem 0.85rem",
            fontSize: "0.75rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: "0.75rem"
          }}
        >
          Incoming Video Call
        </span>

        <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "white", marginBottom: "0.3rem" }}>
          {incomingCall.doctor_name}
        </h2>

        {incomingCall.doctor_specialization && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", color: "#94a3b8", fontSize: "0.9rem", marginBottom: "0.5rem" }}>
            <Stethoscope size={15} color="#05bfdb" />
            <span>{incomingCall.doctor_specialization}</span>
          </div>
        )}

        <p style={{ color: "#cbd5e1", fontSize: "0.85rem", marginBottom: "2rem" }}>
          Your doctor has initiated your online video consultation. Click <strong>Accept</strong> to join immediately.
        </p>

        {/* Action Buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <button
            type="button"
            onClick={handleDecline}
            className="btn btn-outline"
            style={{
              padding: "0.85rem",
              borderRadius: "14px",
              borderColor: "#475569",
              color: "#94a3b8",
              fontSize: "0.95rem",
              fontWeight: 600,
              justifyContent: "center",
              gap: "0.5rem"
            }}
          >
            <PhoneOff size={18} />
            <span>Dismiss</span>
          </button>

          <button
            type="button"
            onClick={handleAccept}
            className="btn"
            style={{
              padding: "0.85rem",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #10b981, #059669)",
              color: "white",
              fontSize: "0.95rem",
              fontWeight: 700,
              justifyContent: "center",
              gap: "0.5rem",
              border: "none",
              boxShadow: "0 4px 15px rgba(16, 185, 129, 0.4)",
              cursor: "pointer"
            }}
          >
            <PhoneCall size={18} />
            <span>Accept Call</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;
