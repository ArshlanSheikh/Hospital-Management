import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "success", duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{
        position: "fixed",
        top: "1.5rem",
        right: "1.5rem",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        maxWidth: "400px",
        width: "calc(100% - 3rem)"
      }}>
        {toasts.map((toast) => {
          const isSuccess = toast.type === "success";
          const isError = toast.type === "error";
          return (
            <div
              key={toast.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.9rem 1.1rem",
                backgroundColor: "#FFFFFF",
                borderRadius: "var(--radius-md)",
                boxShadow: "var(--shadow-xl)",
                border: `1px solid ${isSuccess ? "var(--success-border)" : isError ? "var(--danger-border)" : "var(--info-border)"}`,
                animation: "fadeIn 0.25s ease-out",
                color: "var(--text-primary)"
              }}
            >
              {isSuccess && <CheckCircle2 size={20} color="var(--success)" />}
              {isError && <AlertCircle size={20} color="var(--danger)" />}
              {!isSuccess && !isError && <Info size={20} color="var(--info)" />}
              <span style={{ fontSize: "0.88rem", fontWeight: 500, flex: 1 }}>{toast.message}</span>
              <button onClick={() => removeToast(toast.id)} style={{ color: "var(--text-muted)" }}>
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
