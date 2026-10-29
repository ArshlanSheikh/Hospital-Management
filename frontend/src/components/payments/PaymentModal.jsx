import React, { useState } from "react";
import { X, CreditCard, ShieldCheck, CheckCircle2, AlertCircle, Printer, Download } from "lucide-react";
import apiClient from "../../api/client";
import { useAuth } from "../../context/AuthContext";

const PaymentModal = ({ appointment, onClose, onPaymentSuccess }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  const fee = appointment?.consultation_fee || appointment?.doctor_fee || 500;

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleOnlinePayment = async (useSandboxMock = false) => {
    setLoading(true);
    setError(null);

    try {
      // 1. Create Order on Backend
      const orderRes = await apiClient.post("/payments/create-order", {
        appointment_id: appointment.id || appointment._id
      });

      if (!orderRes.data?.success) {
        throw new Error(orderRes.data?.error?.message || "Failed to create payment order");
      }

      const orderData = orderRes.data.data;

      // If user chose sandbox mock or Razorpay script fails, run instant verification
      if (useSandboxMock) {
        const verifyRes = await apiClient.post("/payments/verify", {
          razorpay_order_id: orderData.order_id,
          razorpay_payment_id: `pay_test_${Math.random().toString(36).substring(2, 10)}`,
          razorpay_signature: "mock_signature_test"
        });

        if (verifyRes.data?.success) {
          setReceiptData(verifyRes.data.data);
          setPaymentComplete(true);
          if (onPaymentSuccess) onPaymentSuccess(verifyRes.data.data);
        }
        return;
      }

      // 2. Open Razorpay Checkout Dialog
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Unable to load Razorpay payment gateway. You can use Test Sandbox Simulation below.");
      }

      const options = {
        key: orderData.key_id,
        amount: orderData.amount_paise,
        currency: orderData.currency,
        name: "MediPulse Healthcare",
        description: `Consultation Fee - ${appointment.appointment_number || "Appointment"}`,
        order_id: orderData.order_id,
        handler: async function (response) {
          try {
            const verifyRes = await apiClient.post("/payments/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            if (verifyRes.data?.success) {
              setReceiptData(verifyRes.data.data);
              setPaymentComplete(true);
              if (onPaymentSuccess) onPaymentSuccess(verifyRes.data.data);
            }
          } catch (verErr) {
            setError(verErr.response?.data?.error?.message || "Signature verification failed.");
          }
        },
        prefill: {
          name: user?.name || user?.email,
          email: user?.email,
        },
        theme: {
          color: "#0A4D68"
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response) {
        setError(response.error?.description || "Payment failed at gateway.");
      });
      rzp.open();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || "Payment initiation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1100,
        padding: "1rem"
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "white",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "480px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#f8fafc"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "rgba(10, 77, 104, 0.1)",
                color: "var(--primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <CreditCard size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>
                {paymentComplete ? "Payment Receipt" : "Complete Consultation Payment"}
              </h3>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>
                Secure Razorpay Gateway
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px" }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "1.5rem" }}>
          {error && (
            <div
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                display: "flex",
                gap: "0.5rem",
                alignItems: "center",
                fontSize: "0.85rem",
                marginBottom: "1rem"
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {!paymentComplete ? (
            <>
              {/* Appointment summary card */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "1rem",
                  marginBottom: "1.25rem"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "0.85rem", color: "#64748b" }}>Appointment Ref:</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1e293b" }}>
                    {appointment?.appointment_number || "APT-PENDING"}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "0.85rem", color: "#64748b" }}>Doctor:</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1e293b" }}>
                    {appointment?.doctor_name || "Doctor"}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "0.85rem", color: "#64748b" }}>Date & Time:</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1e293b" }}>
                    {appointment?.appointment_date} at {appointment?.start_time}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "0.85rem", color: "#64748b" }}>Type:</span>
                  <span className="badge badge-primary" style={{ textTransform: "capitalize" }}>
                    {appointment?.consultation_type === "video" ? "Video Consultation" : "In-Person"}
                  </span>
                </div>
                <hr style={{ border: "none", borderTop: "1px dashed #cbd5e1", margin: "0.75rem 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "#0f172a" }}>Total Amount:</span>
                  <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--primary)" }}>
                    ₹{fee}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <button
                  onClick={() => handleOnlinePayment(false)}
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ width: "100%", justifyContent: "center", padding: "0.75rem", fontSize: "1rem" }}
                >
                  {loading ? (
                    <div className="spinner" style={{ width: "1.2rem", height: "1.2rem", color: "white" }} />
                  ) : (
                    <>
                      <CreditCard size={18} />
                      <span>Pay ₹{fee} with Razorpay</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleOnlinePayment(true)}
                  disabled={loading}
                  className="btn btn-outline"
                  style={{
                    width: "100%",
                    justifyContent: "center",
                    fontSize: "0.85rem",
                    borderColor: "#cbd5e1",
                    color: "#475569"
                  }}
                >
                  <ShieldCheck size={16} color="#10b981" />
                  <span>Instant Test Payment (Sandbox Simulation)</span>
                </button>
              </div>

              <p style={{ textAlign: "center", fontSize: "0.75rem", color: "#94a3b8", marginTop: "1rem" }}>
                Secured by Razorpay. Card, UPI, Netbanking, and Wallets accepted.
              </p>
            </>
          ) : (
            /* Receipt View */
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "#dcfce7",
                  color: "#16a34a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1rem"
                }}
              >
                <CheckCircle2 size={32} />
              </div>
              <h4 style={{ margin: "0 0 0.5rem", fontSize: "1.25rem", color: "#0f172a" }}>
                Payment Confirmed!
              </h4>
              <p style={{ fontSize: "0.85rem", color: "#64748b", margin: "0 0 1.25rem" }}>
                Your appointment is fully confirmed. A digital receipt has been created.
              </p>

              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "1rem",
                  textAlign: "left",
                  fontSize: "0.85rem",
                  marginBottom: "1.25rem"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                  <span style={{ color: "#64748b" }}>Payment ID:</span>
                  <span style={{ fontFamily: "monospace", fontWeight: 600 }}>
                    {receiptData?.payment_id || "pay_test"}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                  <span style={{ color: "#64748b" }}>Order ID:</span>
                  <span style={{ fontFamily: "monospace" }}>{receiptData?.order_id}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                  <span style={{ color: "#64748b" }}>Amount Paid:</span>
                  <span style={{ fontWeight: 700, color: "#16a34a" }}>₹{receiptData?.amount || fee}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Status:</span>
                  <span className="badge badge-success">COMPLETED</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  onClick={() => window.print()}
                  className="btn btn-outline"
                  style={{ flex: 1, justifyContent: "center" }}
                >
                  <Printer size={16} />
                  <span>Print Receipt</span>
                </button>
                <button
                  onClick={onClose}
                  className="btn btn-primary"
                  style={{ flex: 1, justifyContent: "center" }}
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
