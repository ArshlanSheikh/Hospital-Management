import React from "react";
import { BrowserRouter, Routes, Route, Outlet, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";

// Layouts
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import DashboardLayout from "./components/layout/DashboardLayout";

// Public Pages
import Home from "./pages/public/Home";
import DoctorDirectory from "./pages/public/DoctorDirectory";
import DoctorDetail from "./pages/public/DoctorDetail";
import Login from "./pages/public/Login";
import Register from "./pages/public/Register";

// Patient Pages
import PatientDashboard from "./pages/patient/PatientDashboard";
import PatientAppointments from "./pages/patient/PatientAppointments";
import PatientProfile from "./pages/patient/PatientProfile";

// Doctor Pages
import DoctorDashboard from "./pages/doctor/DoctorDashboard";
import DoctorAppointments from "./pages/doctor/DoctorAppointments";
import DoctorSchedule from "./pages/doctor/DoctorSchedule";
import DoctorProfile from "./pages/doctor/DoctorProfile";

// Platform Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminDoctors from "./pages/admin/AdminDoctors";
import AdminPatients from "./pages/admin/AdminPatients";
import AdminAppointments from "./pages/admin/AdminAppointments";

const PublicLayout = () => (
  <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
    <Navbar />
    <main style={{ flex: 1 }}>
      <Outlet />
    </main>
    <Footer />
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/doctors" element={<DoctorDirectory />} />
              <Route path="/doctors/:doctorId" element={<DoctorDetail />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Route>

            {/* Patient Dashboard */}
            <Route path="/patient" element={<DashboardLayout allowedRoles={["patient"]} />}>
              <Route path="dashboard" element={<PatientDashboard />} />
              <Route path="appointments" element={<PatientAppointments />} />
              <Route path="profile" element={<PatientProfile />} />
            </Route>

            {/* Doctor Workspace */}
            <Route path="/doctor" element={<DashboardLayout allowedRoles={["doctor"]} />}>
              <Route path="dashboard" element={<DoctorDashboard />} />
              <Route path="appointments" element={<DoctorAppointments />} />
              <Route path="schedule" element={<DoctorSchedule />} />
              <Route path="profile" element={<DoctorProfile />} />
            </Route>

            {/* Platform Admin Portal */}
            <Route path="/admin" element={<DashboardLayout allowedRoles={["admin", "platform_admin"]} />}>
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="doctors" element={<AdminDoctors />} />
              <Route path="patients" element={<AdminPatients />} />
              <Route path="appointments" element={<AdminAppointments />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
