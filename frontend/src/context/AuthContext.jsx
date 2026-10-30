import React, { createContext, useContext, useState, useEffect } from "react";
import apiClient from "../api/client";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("medipulse_token") || null);
  const [loading, setLoading] = useState(true);

  // Initialize and check current user on app boot
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const storedToken = localStorage.getItem("medipulse_token");
      if (!storedToken) {
        setLoading(false);
        return;
      }
      try {
        const res = await apiClient.get("/auth/me");
        setUser(res.data);
      } catch (err) {
        console.error("Session verification failed", err);
        localStorage.removeItem("medipulse_token");
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);

  const login = async (email, password) => {
    const res = await apiClient.post("/auth/login", { email, password });
    const { token: receivedToken, user: receivedUser } = res.data;
    localStorage.setItem("medipulse_token", receivedToken);
    setToken(receivedToken);
    setUser(receivedUser);
    return receivedUser;
  };

  const registerPatient = async (data) => {
    const res = await apiClient.post("/auth/register/patient", data);
    const { token: receivedToken, user: receivedUser } = res.data;
    localStorage.setItem("medipulse_token", receivedToken);
    setToken(receivedToken);
    setUser(receivedUser);
    return receivedUser;
  };

  const registerDoctor = async (data) => {
    const res = await apiClient.post("/auth/register/doctor", data);
    const { token: receivedToken, user: receivedUser } = res.data;
    localStorage.setItem("medipulse_token", receivedToken);
    setToken(receivedToken);
    setUser(receivedUser);
    return receivedUser;
  };

  const logout = async () => {
    try {
      await apiClient.post("/auth/logout").catch(() => {});
    } finally {
      localStorage.removeItem("medipulse_token");
      setToken(null);
      setUser(null);
      window.location.href = "/login";
    }
  };

  const refreshUser = async () => {
    try {
      const res = await apiClient.get("/auth/me");
      setUser(res.data);
      return res.data;
    } catch (err) {
      console.error("Refresh user failed", err);
    }
  };

  const normalizedRole = user?.role?.toLowerCase();

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        registerPatient,
        registerDoctor,
        logout,
        refreshUser,
        isAuthenticated: !!user,
        role: normalizedRole,
        isPatient: normalizedRole === "patient",
        isDoctor: normalizedRole === "doctor",
        isAdmin: normalizedRole === "admin" || normalizedRole === "platform_admin",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
