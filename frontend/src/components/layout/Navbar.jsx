import React from "react";
import { Link, NavLink } from "react-router-dom";
import { Activity, User, LogOut, LayoutDashboard, Stethoscope } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import NotificationDropdown from "../common/NotificationDropdown";
import styles from "./Navbar.module.css";

const Navbar = () => {
  const { user, isAuthenticated, logout, role } = useAuth();

  const getDashboardPath = () => {
    if (!role) return "/dashboard";
    switch (role) {
      case "patient":
        return "/patient/dashboard";
      case "doctor":
        return "/doctor/dashboard";
      case "admin":
      case "platform_admin":
        return "/admin/dashboard";
      default:
        return "/patient/dashboard";
    }
  };

  return (
    <header className={styles.header}>
      <div className={`container ${styles.navContainer}`}>
        <Link to="/" className={styles.logo}>
          <div className={styles.logoIcon}>
            <Activity size={22} />
          </div>
          <span>MediPulse</span>
        </Link>

        <nav>
          <ul className={styles.navLinks}>
            <li>
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive ? styles.activeNavLink : ""}`
                }
              >
                Home
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/doctors"
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive ? styles.activeNavLink : ""}`
                }
              >
                Find Doctors
              </NavLink>
            </li>
          </ul>
        </nav>

        <div className={styles.authActions}>
          {isAuthenticated ? (
            <>
              <Link to={getDashboardPath()} className="btn btn-outline" style={{ gap: "0.4rem" }}>
                <LayoutDashboard size={16} />
                <span>Dashboard</span>
              </Link>
              <NotificationDropdown />
              <div className={styles.userBadge}>
                <User size={15} color="var(--primary)" />
                <span>{user?.name || user?.email?.split("@")[0]}</span>
                <span className="badge badge-primary">{user?.role?.toUpperCase()}</span>
              </div>
              <button onClick={logout} className="btn btn-outline" title="Log Out">
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-outline">
                Log In
              </Link>
              <Link to="/register" className="btn btn-primary">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
