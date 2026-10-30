import React, { useState, useEffect, useRef, useCallback } from "react";
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
  Share2,
  Terminal,
  Activity,
  ChevronDown,
  ChevronUp,
  RotateCw
} from "lucide-react";
import apiClient from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import IssuePrescriptionModal from "../../components/prescriptions/IssuePrescriptionModal";

const VideoConsultationRoom = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Session & UI state
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inCall, setInCall] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [showConcludeConfirm, setShowConcludeConfirm] = useState(false);

  // WebRTC & Media state
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [connectionState, setConnectionState] = useState("idle"); // idle, connecting, connected, disconnected, failed
  const [iceState, setIceState] = useState("new");
  const [remotePeerPresent, setRemotePeerPresent] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [debugLogs, setDebugLogs] = useState([]);

  // DOM Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const pollTimerRef = useRef(null);
  const lastSignalTimestampRef = useRef(0);
  const queuedCandidatesRef = useRef([]);

  // Prescription modal state for doctor
  const [showRxModal, setShowRxModal] = useState(false);

  const addDebugLog = useCallback((msg) => {
    const timeStr = new Date().toLocaleTimeString();
    console.log(`[WebRTC ${timeStr}]`, msg);
    setDebugLogs((prev) => [`[${timeStr}] ${msg}`, ...prev.slice(0, 49)]);
  }, []);

  // 1. Fetch Session Authorization
  useEffect(() => {
    let isMounted = true;
    const fetchSession = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.get(`/consultations/${appointmentId}/session`);
        // Safely extract session payload whether res is already unpacked or wrapped
        const session = res.data?.data || res.data || res;
        if (!session || !session.room_name) {
          throw new Error("Invalid session authorization received from server.");
        }
        if (isMounted) {
          setSessionData(session);
          addDebugLog(`Session authorized: Room ${session.room_name} (${session.user_role})`);
        }
      } catch (err) {
        if (isMounted) {
          const errMsg = err.response?.data?.error?.message || err.message || "Failed to authorize video session";
          setError(errMsg);
          addDebugLog(`Session error: ${errMsg}`);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSession();
    return () => {
      isMounted = false;
    };
  }, [appointmentId, addDebugLog]);

  // Lobby polling: If patient is in pre-call screen waiting for doctor to initiate call, auto-refresh session
  useEffect(() => {
    let timer;
    if (!inCall && !callEnded && sessionData?.user_role === "patient" && sessionData?.call_status !== "calling" && sessionData?.consultation_status !== "in_progress") {
      timer = setInterval(async () => {
        try {
          const res = await apiClient.get(`/consultations/${appointmentId}/session`);
          const session = res.data?.data || res.data || res;
          if (session && (session.call_status === "calling" || session.consultation_status === "in_progress")) {
            setSessionData(session);
            addDebugLog("Doctor initiated call. Patient lobby unlocked.");
          }
        } catch (e) {}
      }, 2000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [inCall, callEnded, sessionData, appointmentId, addDebugLog]);

  // 2. Pre-call Camera/Mic preview
  useEffect(() => {
    let isMounted = true;
    if (!inCall && !callEnded && sessionData) {
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
          addDebugLog("Local camera and microphone preview established.");
        })
        .catch((mediaErr) => {
          console.warn("Media devices preview not available:", mediaErr);
          addDebugLog(`Media preview warning: ${mediaErr.name} - ${mediaErr.message}`);
        });

      return () => {
        isMounted = false;
        // Do not stop stream if transitioning directly to inCall
      };
    }
  }, [inCall, callEnded, sessionData, addDebugLog]);

  // 3. Call Timer
  useEffect(() => {
    let timer;
    if (inCall && !callEnded) {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [inCall, callEnded]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Helper to send WebRTC signal to backend
  const sendSignal = useCallback(async (type, payload) => {
    try {
      await apiClient.post(`/consultations/${appointmentId}/signal`, {
        type,
        payload
      });
      addDebugLog(`Sent signal: [${type}]`);
    } catch (err) {
      console.error("Signaling error:", err);
      addDebugLog(`Signal error [${type}]: ${err.message}`);
    }
  }, [appointmentId, addDebugLog]);

  // 4. Cleanup media tracks and signaling
  const handleCleanupMedia = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.close();
      } catch (e) {}
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  }, []);

  // 5. Initialize WebRTC PeerConnection
  const handleJoinCall = async () => {
    setInCall(true);
    setCallEnded(false);
    setConnectionState("connecting");
    addDebugLog("Initializing WebRTC peer connection...");

    // Make sure we have local stream
    let stream = localStreamRef.current;
    if (!stream) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
      } catch (err) {
        addDebugLog(`Failed to acquire local media: ${err.message}`);
      }
    }

    if (localVideoRef.current && stream) {
      localVideoRef.current.srcObject = stream;
    }

    // Configure STUN/TURN servers
    const iceServers = sessionData?.ice_servers || [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" }
    ];

    const pc = new RTCPeerConnection({ iceServers });
    peerConnectionRef.current = pc;
    addDebugLog(`PeerConnection created with STUN: ${iceServers[0]?.urls}`);

    // Add local media tracks
    if (stream) {
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
        addDebugLog(`Added local ${track.kind} track.`);
      });
    }

    // Handle remote tracks
    pc.ontrack = (event) => {
      addDebugLog(`Remote ${event.track.kind} track received.`);
      if (remoteVideoRef.current) {
        if (event.streams && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        } else {
          let s = remoteVideoRef.current.srcObject;
          if (!s) {
            s = new MediaStream();
            remoteVideoRef.current.srcObject = s;
          }
          s.addTrack(event.track);
        }
      }
      setRemotePeerPresent(true);
      setConnectionState("connected");
    };

    // Handle ICE candidates generated locally
    pc.onicecandidate = (event) => {
      if (event.candidate && event.candidate.candidate) {
        addDebugLog(`Generated local ICE candidate: ${event.candidate.protocol || "cand"}`);
        sendSignal("ice-candidate", event.candidate.toJSON ? event.candidate.toJSON() : {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex
        });
      }
    };

    // Connection state listeners
    pc.onconnectionstatechange = () => {
      addDebugLog(`PeerConnection state: ${pc.connectionState}`);
      setConnectionState(pc.connectionState);
      if (pc.connectionState === "connected") {
        setRemotePeerPresent(true);
      }
    };

    pc.oniceconnectionstatechange = () => {
      addDebugLog(`ICE connection state: ${pc.iceConnectionState}`);
      setIceState(pc.iceConnectionState);
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        setConnectionState("connected");
        setRemotePeerPresent(true);
      }
    };

    // Announce presence
    sendSignal("join", { role: sessionData?.user_role });

    // If caller is doctor, generate offer
    if (sessionData?.user_role === "doctor") {
      setTimeout(async () => {
        try {
          if (pc.signalingState === "stable") {
            addDebugLog("Doctor creating WebRTC offer...");
            const offer = await pc.createOffer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: true
            });
            await pc.setLocalDescription(offer);
            await sendSignal("offer", offer);
            addDebugLog("WebRTC offer dispatched to patient.");
          }
        } catch (offerErr) {
          addDebugLog(`Offer creation error: ${offerErr.message}`);
        }
      }, 800);
    }

    // Start signaling poll loop
    startSignalingPoll(pc);
  };

  // 6. Signaling Polling Loop
  const startSignalingPoll = (pc) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    pollTimerRef.current = setInterval(async () => {
      if (!pc || pc.signalingState === "closed") return;

      try {
        const since = lastSignalTimestampRef.current;
        const res = await apiClient.get(`/consultations/${appointmentId}/signals?since=${since}`);
        const data = res.data?.data || res.data || {};
        const signals = data.signals || [];

        if (data.latest_timestamp_ms && data.latest_timestamp_ms > lastSignalTimestampRef.current) {
          lastSignalTimestampRef.current = data.latest_timestamp_ms;
        }

        for (const sig of signals) {
          addDebugLog(`Received signal [${sig.type}] from remote peer`);

          if (sig.type === "join") {
            setRemotePeerPresent(true);
            if (sessionData?.user_role === "doctor") {
              if (pc.signalingState === "stable") {
                const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
                await pc.setLocalDescription(offer);
                await sendSignal("offer", offer);
                addDebugLog("Peer joined: Doctor generated and sent new offer.");
              } else if (pc.localDescription) {
                await sendSignal("offer", pc.localDescription);
                addDebugLog("Peer joined: Doctor re-sent existing offer.");
              }
            }
          } else if (sig.type === "offer") {
            setRemotePeerPresent(true);
            addDebugLog("Processing remote offer from doctor...");
            if (pc.signalingState === "stable" || pc.signalingState === "have-remote-offer") {
              await pc.setRemoteDescription(new RTCSessionDescription(sig.payload));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              await sendSignal("answer", answer);
              addDebugLog("Answer generated and sent back to caller.");

              // Drain queued ICE candidates
              while (queuedCandidatesRef.current.length > 0) {
                const cand = queuedCandidatesRef.current.shift();
                try {
                  if (cand && cand.candidate) {
                    await pc.addIceCandidate(new RTCIceCandidate(cand));
                    addDebugLog("Applied queued ICE candidate.");
                  }
                } catch (candErr) {
                  console.warn("Error applying queued candidate:", candErr);
                }
              }
            }
          } else if (sig.type === "answer") {
            addDebugLog("Processing remote answer from patient...");
            if (pc.signalingState === "have-local-offer") {
              await pc.setRemoteDescription(new RTCSessionDescription(sig.payload));
              addDebugLog("Answer applied to doctor PeerConnection.");

              // Drain queued ICE candidates
              while (queuedCandidatesRef.current.length > 0) {
                const cand = queuedCandidatesRef.current.shift();
                try {
                  if (cand && cand.candidate) {
                    await pc.addIceCandidate(new RTCIceCandidate(cand));
                    addDebugLog("Applied queued ICE candidate.");
                  }
                } catch (candErr) {
                  console.warn("Error applying queued candidate:", candErr);
                }
              }
            }
          } else if (sig.type === "ice-candidate") {
            if (sig.payload && sig.payload.candidate) {
              if (pc.remoteDescription && pc.remoteDescription.type) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(sig.payload));
                  addDebugLog("Applied incoming ICE candidate.");
                } catch (candErr) {
                  console.warn("Could not add ICE candidate:", candErr);
                }
              } else {
                queuedCandidatesRef.current.push(sig.payload);
                addDebugLog("Queued incoming ICE candidate (waiting for remote description).");
              }
            }
          } else if (sig.type === "leave") {
            addDebugLog("Remote peer left the call.");
            setRemotePeerPresent(false);
          }
        }
      } catch (pollErr) {
        // Suppress repetitive network poll errors
      }
    }, 1000);
  };

  // 7. Media Track Controls (Mic & Camera)
  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach((t) => {
        t.enabled = !micEnabled;
      });
      setMicEnabled(!micEnabled);
      addDebugLog(`Microphone ${!micEnabled ? "unmuted" : "muted"}`);
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach((t) => {
        t.enabled = !cameraEnabled;
      });
      setCameraEnabled(!cameraEnabled);
      addDebugLog(`Camera ${!cameraEnabled ? "enabled" : "disabled"}`);
    }
  };

  // 8. Leave Room (Participant can rejoin later - appointment remains open)
  const handleLeaveRoom = async (redirectToAppointments = true) => {
    addDebugLog("Leaving consultation room (can rejoin later)...");
    try {
      await sendSignal("leave", { role: sessionData?.user_role });
    } catch (e) {}

    handleCleanupMedia();
    setInCall(false);
    setConnectionState("disconnected");

    if (redirectToAppointments) {
      navigate(sessionData?.user_role === "doctor" ? "/doctor/appointments" : "/patient/appointments");
    } else {
      setCallEnded(true);
    }
  };

  // 9. Conclude Consultation (Doctor only - officially concludes and saves notes)
  const handleConfirmConclude = async () => {
    setShowConcludeConfirm(false);
    addDebugLog("Officially concluding consultation...");
    try {
      await sendSignal("leave", { role: "doctor", reason: "concluded" });
    } catch (e) {}

    try {
      await apiClient.post(`/consultations/${appointmentId}/complete`);
      addDebugLog("Consultation marked completed in platform database.");
    } catch (e) {
      console.error("Completion error:", e);
    }

    handleCleanupMedia();
    setInCall(false);
    setCallEnded(true);
  };

  // 10. Re-enter Call if accidentally ended
  const handleReenterCall = () => {
    setCallEnded(false);
    setConnectionState("idle");
    setRemotePeerPresent(false);
    lastSignalTimestampRef.current = 0;
    queuedCandidatesRef.current = [];
    handleJoinCall();
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
    <div style={{ minHeight: "calc(100vh - 72px)", background: "#0a0f1d", color: "white", display: "flex", flexDirection: "column" }}>
      {/* Top Banner */}
      <div
        style={{
          padding: "0.75rem 1.5rem",
          background: "#111827",
          borderBottom: "1px solid #1f2937",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: connectionState === "connected" ? "#10b981" : inCall ? "#eab308" : "#94a3b8"
              }}
            />
            <span style={{ fontWeight: 700, fontSize: "0.95rem", letterSpacing: "0.02em" }}>
              {sessionData?.appointment_number}
            </span>
          </div>
          <span style={{ color: "#4b5563" }}>&bull;</span>
          <span style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
            {sessionData?.doctor?.name} &bull; {sessionData?.patient?.name}
          </span>
          <span
            className="badge"
            style={{
              fontSize: "0.75rem",
              backgroundColor: connectionState === "connected" ? "#065f46" : inCall ? "#854d0e" : "#374151",
              color: connectionState === "connected" ? "#6ee7b7" : inCall ? "#fde047" : "#d1d5db"
            }}
          >
            {connectionState === "connected"
              ? "Live WebRTC Connected"
              : inCall
              ? "Waiting for Peer..."
              : "Pre-Call Check"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {inCall && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#cbd5e1", fontSize: "0.9rem" }}>
              <Clock size={16} />
              <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{formatDuration(callDuration)}</span>
            </div>
          )}

          {/* Toggle Diagnostics Drawer */}
          <button
            type="button"
            onClick={() => setDiagnosticsOpen(!diagnosticsOpen)}
            className="btn btn-outline"
            style={{
              padding: "0.4rem 0.75rem",
              fontSize: "0.8rem",
              background: "#1f2937",
              borderColor: "#374151",
              color: "#9ca3af",
              gap: "0.3rem"
            }}
          >
            <Activity size={14} />
            <span>Diagnostics</span>
            {diagnosticsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

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
              type="button"
              onClick={() => handleLeaveRoom(true)}
              className="btn btn-outline"
              style={{
                borderColor: "#475569",
                color: "#cbd5e1",
                padding: "0.4rem 0.85rem",
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem"
              }}
              title="Leave Room (You can rejoin later)"
            >
              <PhoneOff size={15} />
              <span>Leave Room</span>
            </button>
          )}

          {sessionData?.user_role === "doctor" && inCall && (
            <button
              type="button"
              onClick={() => setShowConcludeConfirm(true)}
              className="btn"
              style={{
                background: "#dc2626",
                color: "white",
                padding: "0.4rem 0.85rem",
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                border: "none",
                fontWeight: 600
              }}
              title="Officially Conclude Consultation"
            >
              <CheckCircle2 size={15} />
              <span>Conclude</span>
            </button>
          )}
        </div>
      </div>

      {/* Diagnostics Panel (Collapsible) */}
      {diagnosticsOpen && (
        <div
          style={{
            background: "#111827",
            borderBottom: "1px solid #1f2937",
            padding: "0.75rem 1.5rem",
            fontSize: "0.8rem",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem"
          }}
        >
          <div>
            <span style={{ color: "#9ca3af", display: "block" }}>WebRTC Connection State:</span>
            <strong style={{ color: connectionState === "connected" ? "#10b981" : "#eab308" }}>
              {connectionState.toUpperCase()}
            </strong>
          </div>
          <div>
            <span style={{ color: "#9ca3af", display: "block" }}>ICE Connection State:</span>
            <strong style={{ color: iceState === "connected" || iceState === "completed" ? "#10b981" : "#eab308" }}>
              {iceState.toUpperCase()}
            </strong>
          </div>
          <div>
            <span style={{ color: "#9ca3af", display: "block" }}>STUN Server:</span>
            <span style={{ color: "#e5e7eb", fontFamily: "monospace" }}>stun.l.google.com:19302</span>
          </div>
          <div>
            <span style={{ color: "#9ca3af", display: "block" }}>Peer Status:</span>
            <strong style={{ color: remotePeerPresent ? "#10b981" : "#ef4444" }}>
              {remotePeerPresent ? "Active / In Room" : "Waiting for participant"}
            </strong>
          </div>
          <div style={{ gridColumn: "1 / -1", maxHeight: "100px", overflowY: "auto", background: "#030712", padding: "0.5rem", borderRadius: "6px" }}>
            <span style={{ color: "#6b7280", display: "block", marginBottom: "0.2rem" }}>Recent WebRTC Signal Events:</span>
            {debugLogs.slice(0, 8).map((log, i) => (
              <div key={i} style={{ color: "#a1a1aa", fontSize: "0.75rem", fontFamily: "monospace" }}>
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Body */}
      <div style={{ flex: 1, display: "flex", position: "relative" }}>
        {!inCall && !callEnded ? (
          /* Check if patient is waiting for doctor to initiate */
          sessionData?.user_role === "patient" && sessionData?.call_status !== "calling" && sessionData?.consultation_status !== "in_progress" ? (
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
                  background: "#111827",
                  borderRadius: "20px",
                  padding: "2.5rem",
                  width: "100%",
                  maxWidth: "560px",
                  border: "1px solid #1f2937",
                  textAlign: "center"
                }}
              >
                <div
                  style={{
                    width: "70px",
                    height: "70px",
                    borderRadius: "50%",
                    background: "rgba(8, 131, 149, 0.15)",
                    color: "#088395",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 1.5rem"
                  }}
                >
                  <Clock size={36} />
                </div>
                <span
                  className="badge"
                  style={{
                    backgroundColor: "#075985",
                    color: "#bae6fd",
                    padding: "0.35rem 0.85rem",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: "0.75rem"
                  }}
                >
                  Waiting for Doctor
                </span>
                <h2 style={{ fontSize: "1.45rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                  Consultation Not Initiated Yet
                </h2>
                <p style={{ color: "#94a3b8", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: "1.75rem" }}>
                  Only your consulting doctor (<strong>{sessionData?.doctor?.name}</strong>) can initiate this video consultation call. When the doctor starts the call, your screen will update automatically to connect.
                </p>
                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
                  <button
                    type="button"
                    onClick={() => navigate("/patient/appointments")}
                    className="btn btn-outline"
                    style={{ borderColor: "#475569", color: "#cbd5e1" }}
                  >
                    Back to My Appointments
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Standard Pre-Call Lobby */
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
                  background: "#111827",
                  borderRadius: "20px",
                  padding: "2.5rem",
                  width: "100%",
                  maxWidth: "600px",
                  border: "1px solid #1f2937",
                  textAlign: "center"
                }}
              >
                <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                  Ready to Join Video Consultation?
                </h2>
                <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
                  Checking audio and video devices. You are joining as <strong>{sessionData?.display_name}</strong>.
                </p>

                {/* Local video preview window */}
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "300px",
                    background: "#030712",
                    borderRadius: "16px",
                    overflow: "hidden",
                    marginBottom: "1.5rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid #374151"
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
                      <VideoOff size={40} />
                      <span style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>Camera Turned Off</span>
                    </div>
                  )}
                  <div style={{ position: "absolute", bottom: "16px", display: "flex", gap: "1rem" }}>
                    <button
                      type="button"
                      onClick={toggleMic}
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "50%",
                        background: micEnabled ? "rgba(255, 255, 255, 0.2)" : "#ef4444",
                        color: "white",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s"
                      }}
                      title={micEnabled ? "Mute Microphone" : "Unmute Microphone"}
                    >
                      {micEnabled ? <Mic size={20} /> : <MicOff size={20} />}
                    </button>
                    <button
                      type="button"
                      onClick={toggleCamera}
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "50%",
                        background: cameraEnabled ? "rgba(255, 255, 255, 0.2)" : "#ef4444",
                        color: "white",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s"
                      }}
                      title={cameraEnabled ? "Turn Off Camera" : "Turn On Camera"}
                    >
                      {cameraEnabled ? <Video size={20} /> : <VideoOff size={20} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", color: "#10b981", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
                  <ShieldCheck size={16} />
                  <span>WebRTC End-to-End Encrypted Medical Channel</span>
                </div>

                <button
                  type="button"
                  onClick={handleJoinCall}
                  className="btn btn-primary"
                  style={{
                    width: "100%",
                    padding: "0.9rem",
                    fontSize: "1.05rem",
                    fontWeight: 700,
                    justifyContent: "center",
                    gap: "0.6rem"
                  }}
                >
                  <Video size={20} />
                  <span>
                    {sessionData?.user_role === "doctor"
                      ? "Start Video Call & Enter Room"
                      : "Accept & Enter Consultation Room"}
                  </span>
                </button>
              </div>
            </div>
          )
        ) : inCall ? (
          /* Live WebRTC Call Container */
          <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
            <div
              style={{
                flex: 1,
                position: "relative",
                display: "grid",
                gridTemplateColumns: remotePeerPresent ? "1fr" : "1fr",
                background: "#030712",
                overflow: "hidden"
              }}
            >
              {/* Remote Participant Video Feed */}
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative"
                }}
              >
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    maxHeight: "calc(100vh - 160px)"
                  }}
                />

                {!remotePeerPresent && (
                  <div
                    style={{
                      position: "absolute",
                      textAlign: "center",
                      padding: "2rem",
                      background: "rgba(17, 24, 39, 0.8)",
                      borderRadius: "16px",
                      border: "1px solid #374151"
                    }}
                  >
                    <div className="spinner" style={{ width: "2.5rem", height: "2.5rem", color: "var(--primary)", margin: "0 auto 1rem" }} />
                    <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                      Waiting for {sessionData?.user_role === "doctor" ? sessionData?.patient?.name : sessionData?.doctor?.name}...
                    </h3>
                    <p style={{ color: "#9ca3af", fontSize: "0.85rem", maxWidth: "340px" }}>
                      Once the other participant enters the consultation room, the video feed will connect automatically.
                    </p>
                  </div>
                )}
              </div>

              {/* Local Participant PIP Window (Picture-in-Picture) */}
              <div
                style={{
                  position: "absolute",
                  bottom: "24px",
                  right: "24px",
                  width: "220px",
                  height: "140px",
                  background: "#1f2937",
                  borderRadius: "12px",
                  overflow: "hidden",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.6)",
                  border: "2px solid #374151",
                  zIndex: 20
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
                  <div style={{ position: "absolute", inset: 0, background: "#111827", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>
                    <VideoOff size={24} />
                  </div>
                )}
                <span
                  style={{
                    position: "absolute",
                    bottom: "6px",
                    left: "8px",
                    background: "rgba(0,0,0,0.6)",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    fontSize: "0.7rem",
                    color: "white"
                  }}
                >
                  You ({sessionData?.display_name})
                </span>
              </div>
            </div>

            {/* In-Call Floating Control Bar */}
            <div
              style={{
                padding: "1rem",
                background: "#111827",
                borderTop: "1px solid #1f2937",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "1.25rem"
              }}
            >
              <button
                type="button"
                onClick={toggleMic}
                style={{
                  width: "50px",
                  height: "50px",
                  borderRadius: "50%",
                  background: micEnabled ? "#374151" : "#ef4444",
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s"
                }}
                title={micEnabled ? "Mute Microphone" : "Unmute Microphone"}
              >
                {micEnabled ? <Mic size={22} /> : <MicOff size={22} />}
              </button>

              <button
                type="button"
                onClick={toggleCamera}
                style={{
                  width: "50px",
                  height: "50px",
                  borderRadius: "50%",
                  background: cameraEnabled ? "#374151" : "#ef4444",
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s"
                }}
                title={cameraEnabled ? "Turn Off Camera" : "Turn On Camera"}
              >
                {cameraEnabled ? <Video size={22} /> : <VideoOff size={22} />}
              </button>

              {/* Leave Room Button (Can Rejoin Later) */}
              <button
                type="button"
                onClick={() => handleLeaveRoom(true)}
                style={{
                  padding: "0 1.25rem",
                  height: "50px",
                  borderRadius: "25px",
                  background: "#334155",
                  color: "#e2e8f0",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontWeight: 600,
                  fontSize: "0.9rem"
                }}
                title="Leave Room (Can Rejoin Later)"
              >
                <PhoneOff size={18} />
                <span>Leave (Can Rejoin)</span>
              </button>

              {/* Conclude Consultation Button (Doctor Only) */}
              {sessionData?.user_role === "doctor" && (
                <button
                  type="button"
                  onClick={() => setShowConcludeConfirm(true)}
                  style={{
                    padding: "0 1.4rem",
                    height: "50px",
                    borderRadius: "25px",
                    background: "#dc2626",
                    color: "white",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    boxShadow: "0 4px 15px rgba(220, 38, 38, 0.4)"
                  }}
                  title="Conclude Consultation"
                >
                  <CheckCircle2 size={18} />
                  <span>Conclude Consultation</span>
                </button>
              )}
            </div>
          </div>
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
                background: "#111827",
                borderRadius: "20px",
                padding: "2.5rem",
                width: "100%",
                maxWidth: "500px",
                textAlign: "center",
                border: "1px solid #1f2937"
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
                Consultation Concluded / Room Left
              </h2>
              <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
                Call duration: <strong>{formatDuration(callDuration)}</strong>. If you left accidentally, you can click below to re-enter.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {/* Re-enter Button if ended or left prematurely */}
                <button
                  type="button"
                  onClick={handleReenterCall}
                  className="btn btn-outline"
                  style={{
                    borderColor: "#088395",
                    color: "#05bfdb",
                    justifyContent: "center",
                    gap: "0.5rem",
                    fontWeight: 600
                  }}
                >
                  <RotateCw size={18} />
                  <span>Re-enter Consultation Room</span>
                </button>

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

      {/* Confirmation Modal to Conclude Consultation */}
      {showConcludeConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem"
          }}
        >
          <div
            style={{
              background: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "20px",
              maxWidth: "460px",
              width: "100%",
              padding: "2rem",
              textAlign: "center",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)"
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                backgroundColor: "rgba(239, 68, 68, 0.15)",
                color: "#ef4444",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.25rem"
              }}
            >
              <AlertCircle size={30} />
            </div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem", color: "white" }}>
              Conclude Consultation?
            </h3>
            <p style={{ color: "#94a3b8", fontSize: "0.9rem", lineHeight: 1.5, marginBottom: "1.5rem" }}>
              This will officially conclude the medical consultation, end the session for both participants, and mark appointment <strong>#{sessionData?.appointment_number}</strong> as completed.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={() => setShowConcludeConfirm(false)}
                className="btn btn-outline"
                style={{ borderColor: "#475569", color: "#cbd5e1", justifyContent: "center" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmConclude}
                className="btn btn-danger"
                style={{ background: "#dc2626", color: "white", justifyContent: "center" }}
              >
                Conclude Call
              </button>
            </div>
          </div>
        </div>
      )}

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
