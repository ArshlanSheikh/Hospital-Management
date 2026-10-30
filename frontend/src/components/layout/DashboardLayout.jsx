import React from "react";
import { Link, NavLink, Outlet, Navigate } from "react-router-dom";
import {
  Activity,
  LayoutDashboard,
  Calendar,
  User,
  Clock,
  ShieldCheck,
  Users,
  LogOut,
  Stethoscope,
  ClipboardList,
  FileText
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import styles from "./DashboardLayout.module.css";

const DashboardLayout = ({ allowedRoles }) => {
  const { user, loading, logout, role } = useAuth();

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <div className="spinner" style={{ color: "var(--primary)", width: "2.5rem", height: "2.5rem" }} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const normalizedAllowed = allowedRoles?.map((r) => r.toLowerCase());
  if (normalizedAllowed && !normalizedAllowed.includes(role)) {
    return <Navigate to="/" replace />;
  }

  const renderNavLinks = () => {
    switch (role) {
      case "patient":
        return (
          <>
            <div className={styles.navRoleLabel}>Patient Portal</div>
            <ul className={styles.navList}>
              <li>
                <NavLink
                  to="/patient/dashboard"
                  className={({ isActive }) =>
                    `${styles.navItem} ${isActive ? styles.navItemActive : ""}`
                  }
                >
                  <LayoutDashboard size={18} />
                  <span>Overview</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/patient/appointments"
                  className={({ isActive }) =>
                    `${styles.navItem} ${isActive ? styles.navItemActive : ""}`
                  }
                >
                  <Calendar size={18} />
                  <span>My Appointments</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/patient/prescriptions"
                  className={({ isActive }) =>
                    `${styles.navItem} ${isActive ? styles.navItemActive : ""}`
                  }
                >
                  <FileText size={18} />
                  <span>My Prescriptions</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/doctors"
                  className={({ isActive }) =>
                    `${styles.navItem} ${isActive ? styles.navItemActive : ""}`
                  }
                >
                  <Stethoscope size={18} />
                  <span>Find & Book Doctors</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/patient/profile"
                  className={({ isActive }) =>
                    `${styles.navItem} ${isActive ? styles.navItemActive : ""}`
                  }
                >
                  <User size={18} />
                  <span>My Profile</span>
                </NavLink>
              </li>
            </ul>
          </>
        );

      case "doctor":
        return (
          <>
            <div className={styles.navRoleLabel}>Doctor Workspace</div>
            <ul className={styles.navList}>
              <li>
                <NavLink
                  to="/doctor/dashboard"
                  className={({ isActive }) =>
                    `${styles.navItem} ${isActive ? styles.navItemActive : ""}`
                  }
                >
                  <LayoutDashboard size={18} />
                  <span>Overview</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/doctor/appointments"
                  className={({ isActive }) =>
                    `${styles.navItem} ${isActive ? styles.navItemActive : ""}`
                  }
                >
                  <Calendar size={18} />
                  <span>Appointments</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/doctor/prescriptions"
                  className={({ isActive }) =>
                    `${styles.navItem} ${isActive ? styles.navItemActive : ""}`
                  }
                >
                  <FileText size={18} />
                  <span>Issued Prescriptions</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/doctor/schedule"
                  className={({ isActive }) =>
                    `${styles.navItem} ${isActive ? styles.navItemActive : ""}`
                  }
                >
                  <Clock size={18} />
                  <span>Availability Management</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/doctor/profile"
                  className={({ isActive }) =>
                    `${styles.navItem} ${isActive ? styles.navItemActive : ""}`
                  }
                >
                  <User size={18} />
                  <span>Doctor Profile</span>
                </NavLink>
              </li>
            </ul>
          </>
        );

      case "admin":
      case "platform_admin":
        return (
          <>
            <div className={styles.navRoleLabel}>Administrator Portal</div>
            <ul className={styles.navList}>
              <li>
                <NavLink
                  to="/admin/dashboard"
                  className={({ isActive }) =>
                    `${styles.navItem} ${isActive ? styles.navItemActive : ""}`
                  }
                >
                  <LayoutDashboard size={18} />
                  <span>Overview & Stats</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/doctors"
                  className={({ isActive }) =>
                    `${styles.navItem} ${isActive ? styles.navItemActive : ""}`
                  }
                >
                  <ShieldCheck size={18} />
                  <span>Manage Doctors</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/patients"
                  className={({ isActive }) =>
                    `${styles.navItem} ${isActive ? styles.navItemActive : ""}`
                  }
                >
                  <Users size={18} />
                  <span>Manage Patients</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/appointments"
                  className={({ isActive }) =>
                    `${styles.navItem} ${isActive ? styles.navItemActive : ""}`
                  }
                >
                  <ClipboardList size={18} />
                  <span>Manage Appointments</span>
                </NavLink>
              </li>
            </ul>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <Link to="/" className={styles.sidebarBrand}>
          <div className={styles.brandIcon}>
            <Activity size={20} />
          </div>
          <div className={styles.brandInfo}>
            <div className={styles.brandTitle}>MediPulse Health</div>
            <div className={styles.brandType}>
              {role === "doctor" ? "Clinical Workspace" : role === "patient" ? "Patient Portal" : "Admin System"}
            </div>
          </div>
        </Link>

        <div className={styles.navSection}>{renderNavLinks()}</div>

        <div className={styles.userFooter}>
          <div className={styles.userMeta}>
            <div className={styles.userAvatar}>
              {user?.name ? user.name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className={styles.userText}>
              <span className={styles.userEmail}>{user.name || user.email}</span>
              <span className={styles.userRoleTag}>{user.role || role}</span>
            </div>
          </div>
          <button onClick={logout} className={styles.logoutBtn} title="Sign Out">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <div className={styles.mainWrapper}>
        <header className={styles.topBar}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span className={styles.topBarTitle}>
              {role === "doctor" ? "Clinical Workspace" : role === "patient" ? "Patient Portal" : "Administrator Portal"}
            </span>
            <span className="badge badge-primary">{role?.toUpperCase()}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Link to="/" className="btn btn-secondary btn-sm">
              Public Portal
            </Link>
          </div>
        </header>

        <main className={styles.contentArea}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
