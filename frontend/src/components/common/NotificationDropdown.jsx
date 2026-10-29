import React, { useState, useEffect, useRef } from "react";
import { Bell, Check, Clock, Calendar, CreditCard, FileText, Video, X } from "lucide-react";
import apiClient from "../../api/client";

const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/notifications?limit=15");
      if (res.data?.success) {
        setNotifications(res.data.data.notifications || []);
        setUnreadCount(res.data.data.unread_count || 0);
      }
    } catch (err) {
      // Silent fail on polling error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 25000); // Poll every 25s
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification read", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiClient.patch("/notifications/mark-all-read");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all notifications read", err);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case "booking":
      case "confirmation":
      case "reschedule":
        return <Calendar size={16} color="var(--primary)" />;
      case "payment":
        return <CreditCard size={16} color="#10b981" />;
      case "prescription":
        return <FileText size={16} color="#8b5cf6" />;
      case "consultation":
        return <Video size={16} color="#06b6d4" />;
      default:
        return <Bell size={16} color="var(--primary)" />;
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " - " + d.toLocaleDateString();
    } catch {
      return "";
    }
  };

  return (
    <div style={{ position: "relative" }} ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="btn btn-outline"
        style={{
          position: "relative",
          padding: "0.5rem",
          borderRadius: "50%",
          width: "2.5rem",
          height: "2.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "white"
        }}
        aria-label="Notifications"
        title="In-app Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-4px",
              right: "-4px",
              background: "#ef4444",
              color: "white",
              fontSize: "0.65rem",
              fontWeight: 700,
              width: "1.1rem",
              height: "1.1rem",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 0 2px white"
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: "360px",
            maxHeight: "440px",
            background: "white",
            borderRadius: "12px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            border: "1px solid #e2e8f0",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden"
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "0.75rem 1rem",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "#f8fafc"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontWeight: 600, fontSize: "0.95rem", color: "#1e293b" }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    background: "rgba(10, 77, 104, 0.1)",
                    color: "var(--primary)",
                    fontSize: "0.75rem",
                    padding: "0.1rem 0.5rem",
                    borderRadius: "9999px",
                    fontWeight: 600
                  }}
                >
                  {unreadCount} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--primary)",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  fontWeight: 500
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "#94a3b8", fontSize: "0.875rem" }}>
                <Bell size={28} style={{ margin: "0 auto 0.5rem", opacity: 0.4 }} />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  style={{
                    padding: "0.75rem 1rem",
                    borderBottom: "1px solid #f1f5f9",
                    background: n.is_read ? "white" : "rgba(10, 77, 104, 0.04)",
                    display: "flex",
                    gap: "0.75rem",
                    transition: "background 0.2s"
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background: n.is_read ? "#f1f5f9" : "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                    }}
                  >
                    {getIcon(n.type)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontWeight: n.is_read ? 500 : 600, fontSize: "0.85rem", color: "#1e293b" }}>
                        {n.title}
                      </span>
                      {!n.is_read && (
                        <button
                          onClick={(e) => handleMarkAsRead(n.id, e)}
                          title="Mark read"
                          style={{
                            background: "none",
                            border: "none",
                            color: "#94a3b8",
                            cursor: "pointer",
                            padding: "2px"
                          }}
                        >
                          <Check size={14} />
                        </button>
                      )}
                    </div>
                    <p style={{ margin: "0.2rem 0 0.3rem", fontSize: "0.8rem", color: "#475569", lineHeight: 1.3 }}>
                      {n.message}
                    </p>
                    <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                      {formatTime(n.created_at)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
