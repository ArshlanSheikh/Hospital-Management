import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Video,
  Mic,
  MicOff,
  VideoOff,
  PhoneOff,
  FileText,
  Clock,
  ShieldCheck,
  User,
  AlertCircle,
  CheckCircle2,
  Share2
} from "lucide-react";
import apiClient from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import IssuePrescriptionModal from "../../components/prescriptions/IssuePrescriptionModal";

const VideoConsultationRoom = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inCall, setInCall] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Local media preview state
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const jitsiContainerRef = useRef(null);
  const jitsiApiRef = useRef(null);

  // Prescription modal state for doctor
  const [showRxModal, setShowRxModal] = useState(false);

  // 1. Fetch Session Authorization
  useEffect(() => {
    const fetchSession = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.get(`/consultations/${appointmentId}/session`);
        if (res.data?.success) {
          setSessionData(res.data.data);
        }
      } catch (err) {
        setError(err.response?.data?.error?.message || "Failed to authorize video session");
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [appointmentId]);

  // 2. Pre-call Camera/Mic preview
  useEffect(() => {
    if (!inCall && !callEnded && sessionData) {
      let isMounted = true;
      navigator.mediaDevices
        ?.getUserMedia({ video: true, audio: true })
        .then((stream) => {
          if (!isMounted) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          localStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        })
        .catch((mediaErr) => {
          console.warn("Media devices preview not available:", mediaErr);
        });

      return () => {
        isMounted = false;
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((track) => track.stop());
        }
      };
    }
  }, [inCall, callEnded, sessionData]);

  // 3. Call Timer
  useEffect(() => {
    let timer;
    if (inCall) {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [inCall]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // 4. Initialize Jitsi Call
  const handleJoinCall = () => {
    // Stop local preview stream before joining Jitsi to release hardware
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    setInCall(true);

    const loadJitsiScript = () => {
      return new Promise((resolve) => {
        if (window.JitsiMeetExternalAPI) {
          resolve(true);
          return;
        }
        const script = document.createElement("script");
        script.src = "https://meet.jit.si/external_api.js";
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      });
    };

    loadJitsiScript().then((loaded) => {
      if (!loaded || !jitsiContainerRef.current) {
        console.warn("Jitsi Meet script unavailable, using fallback container");
        return;
      }

      const domain = sessionData.domain || "meet.jit.si";
      const options = {
        roomName: sessionData.room_name,
        width: "100%",
        height: "100%",
        parentNode: jitsiContainerRef.current,
        userInfo: {
          displayName: sessionData.display_name
        },
        configOverwrite: {
          startWithAudioMuted: !micEnabled,
          startWithVideoMuted: !cameraEnabled,
          prejoinPageEnabled: false,
          disableDeepLinking: true
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: [
            "microphone",
            "camera",
            "closedcaptions",
            "desktop",
            "fullscreen",
            "fodeviceselection",
            "chat",
            "raisehand",
            "tileview",
            "hangup"
          ]
        }
      };

      const api = new window.JitsiMeetExternalAPI(domain, options);
      jitsiApiRef.current = api;

      api.addEventListeners({
        videoConferenceLeft: () => {
          handleLeaveCall();
        }
      });
    });
  };

  const handleLeaveCall = async () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.dispose();
      jitsiApiRef.current = null;
    }
    setInCall(false);
    setCallEnded(true);

    // If user is doctor, trigger consultation completion
    if (sessionData?.user_role === "doctor") {
      try {
        await apiClient.post(`/consultations/${appointmentId}/complete`);
      } catch (e) {
        console.error("Completion error:", e);
      }
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "80vh" }}>
        <div className="spinner" style={{ width: "2.5rem", height: "2.5rem", color: "var(--primary)", marginBottom: "1rem" }} />
        <p style={{ color: "#64748b" }}>Securing consultation room...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container" style={{ padding: "4rem 1rem", maxWidth: "600px", textAlign: "center" }}>
        <div style={{ background: "#fef2f2", padding: "2rem", borderRadius: "16px", border: "1px solid #fecaca" }}>
          <AlertCircle size={48} color="#dc2626" style={{ margin: "0 auto 1rem" }} />
          <h2 style={{ color: "#991b1b", marginBottom: "0.5rem" }}>Consultation Unavailable</h2>
          <p style={{ color: "#b91c1c", marginBottom: "1.5rem" }}>{error}</p>
          <button onClick={() => navigate(-1)} className="btn btn-primary">
            Return to Appointments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "calc(100vh - 72px)", background: "#0f172a", color: "white", display: "flex", flexDirection: "column" }}>
      {/* Top Banner */}
      <div
        style={{
          padding: "0.75rem 1.5rem",
          background: "#1e293b",
          borderBottom: "1px solid #334155",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: inCall ? "#10b981" : "#eab308"
              }}
            />
            <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>
              {sessionData?.appointment_number}
            </span>
          </div>
          <span style={{ color: "#64748b" }}>&bull;</span>
          <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
            {sessionData?.doctor?.name} &bull; {sessionData?.patient?.name}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {inCall && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#cbd5e1", fontSize: "0.9rem" }}>
              <Clock size={16} />
              <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{formatDuration(callDuration)}</span>
            </div>
          )}

          {/* Doctor Write Prescription Shortcut */}
          {sessionData?.user_role === "doctor" && inCall && (
            <button
              onClick={() => setShowRxModal(true)}
              className="btn btn-outline"
              style={{
                background: "#7c3aed",
                borderColor: "#7c3aed",
                color: "white",
                padding: "0.4rem 0.8rem",
                fontSize: "0.85rem",
                gap: "0.4rem"
              }}
            >
              <FileText size={16} />
              <span>Issue Prescription</span>
            </button>
          )}

          {inCall && (
            <button
              onClick={handleLeaveCall}
              className="btn"
              style={{
                background: "#ef4444",
                color: "white",
                padding: "0.4rem 0.9rem",
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem"
              }}
            >
              <PhoneOff size={16} />
              <span>End Call</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Body */}
      <div style={{ flex: 1, display: "flex", position: "relative" }}>
        {!inCall && !callEnded ? (
          /* Lobby / Pre-Call Check */
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "2rem"
            }}
          >
            <div
              style={{
                background: "#1e293b",
                borderRadius: "20px",
                padding: "2rem",
                width: "100%",
                maxWidth: "600px",
                border: "1px solid #334155",
                textAlign: "center"
              }}
            >
              <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                Ready to join consultation?
              </h2>
              <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
                Checking audio and video devices. You are joining as <strong>{sessionData?.display_name}</strong>.
              </p>

              {/* Local video preview window */}
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: "280px",
                  background: "#0f172a",
                  borderRadius: "16px",
                  overflow: "hidden",
                  marginBottom: "1.5rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid #334155"
                }}
              >
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                {!cameraEnabled && (
                  <div style={{ position: "absolute", color: "#64748b", display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <VideoOff size={36} />
                    <span style={{ fontSize: "0.8rem", marginTop: "0.4rem" }}>Camera Turned Off</span>
                  </div>
                )}
                <div style={{ position: "absolute", bottom: "12px", display: "flex", gap: "0.75rem" }}>
                  <button
                    onClick={() => setMicEnabled(!micEnabled)}
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      background: micEnabled ? "rgba(255, 255, 255, 0.2)" : "#ef4444",
                      color: "white",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    {micEnabled ? <Mic size={18} /> : <MicOff size={18} />}
                  </button>
                  <button
                    onClick={() => setCameraEnabled(!cameraEnabled)}
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      background: cameraEnabled ? "rgba(255, 255, 255, 0.2)" : "#ef4444",
                      color: "white",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    {cameraEnabled ? <Video size={18} /> : <VideoOff size={18} />}
                  </button>
                </div>
              </div>

              <button
                onClick={handleJoinCall}
                className="btn btn-primary"
                style={{
                  width: "100%",
                  padding: "0.85rem",
                  fontSize: "1rem",
                  fontWeight: 600,
                  justifyContent: "center"
                }}
              >
                <Video size={20} />
                <span>Join Secure Consultation</span>
              </button>
            </div>
          </div>
        ) : inCall ? (
          /* Live Call Container */
          <div
            ref={jitsiContainerRef}
            style={{
              flex: 1,
              width: "100%",
              height: "100%",
              minHeight: "600px",
              background: "#000"
            }}
          />
        ) : (
          /* Concluded View */
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "2rem"
            }}
          >
            <div
              style={{
                background: "#1e293b",
                borderRadius: "20px",
                padding: "2.5rem",
                width: "100%",
                maxWidth: "500px",
                textAlign: "center",
                border: "1px solid #334155"
              }}
            >
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "#10b981",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1.5rem"
                }}
              >
                <CheckCircle2 size={36} />
              </div>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                Consultation Concluded
              </h2>
              <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
                Call duration: <strong>{formatDuration(callDuration)}</strong>. All consultation details have been logged.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {sessionData?.user_role === "doctor" && (
                  <button
                    onClick={() => setShowRxModal(true)}
                    className="btn btn-outline"
                    style={{ borderColor: "#7c3aed", color: "#a78bfa", justifyContent: "center" }}
                  >
                    <FileText size={18} />
                    <span>Issue Digital Prescription</span>
                  </button>
                )}
                <button
                  onClick={() => navigate(user?.role === "doctor" ? "/doctor/appointments" : "/patient/appointments")}
                  className="btn btn-primary"
                  style={{ justifyContent: "center" }}
                >
                  Return to Appointments
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Prescription Modal inside video call */}
      {showRxModal && (
        <IssuePrescriptionModal
          appointment={{
            id: appointmentId,
            appointment_number: sessionData?.appointment_number,
            patient_name: sessionData?.patient?.name,
            doctor_name: sessionData?.doctor?.name
          }}
          onClose={() => setShowRxModal(false)}
          onPrescriptionIssued={(rx) => {
            alert(`Prescription ${rx.prescription_number} issued successfully!`);
            setShowRxModal(false);
          }}
        />
      )}
    </div>
  );
};

export default VideoConsultationRoom;
