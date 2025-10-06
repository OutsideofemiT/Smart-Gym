import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../styles/MemberNavbar.css";
import "../styles/QRModal.css"; // keep if you use the modal elsewhere
import Logo from "../assets/SG_Icon2.png";

export interface MemberNavItem {
  label: string;
  to?: string;
  action?: "logout";
}

interface MemberNavbarProps {
  navItems: MemberNavItem[];
}

const MemberNavbar: React.FC<MemberNavbarProps> = ({ navItems }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLLIElement>(null);

  const handleClick = (item: MemberNavItem) => {
    if (item.action === "logout") {
      localStorage.removeItem("token");
      localStorage.removeItem("gym_id");
      navigate("/");
    }
  };

  // close dropdown on route change
  useEffect(() => setProfileOpen(false), [location.pathname]);

  // close on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <header className="member-navbar">
      <div className="member-navbar-container">
        {/* Left: logo (big, non-interactive so it won’t block clicks) */}
        <div className="member-navbar-left">
          <img src={Logo} alt="Smart Gym" className="member-logo-img" />
        </div>

        {/* Right: links */}
        <ul className="member-nav-links">
          {navItems.map((item, idx) => {
            // Profile dropdown
            if (item.label.toLowerCase() === "profile") {
              return (
                <li key={idx} className="nav-dropdown" ref={profileRef}>
                  <button
                    type="button"
                    className="dropdown-btn"
                    onClick={() => setProfileOpen(o => !o)}
                    aria-haspopup="menu"
                    aria-expanded={profileOpen}
                    aria-controls="profile-menu"
                  >
                    Profile ▾
                  </button>

                  {profileOpen && (
                    <div id="profile-menu" className="dropdown-menu" role="menu">
                      <Link role="menuitem" to="/member/profile" onClick={() => setProfileOpen(false)}>
                        View profile
                      </Link>
                      <Link role="menuitem" to="/member/profile/edit" onClick={() => setProfileOpen(false)}>
                        Edit profile
                      </Link>
                    </div>
                  )}
                </li>
              );
            }

            // Logout — NOTE: class is nav-logout-button (not .logout-button)
            if (item.action === "logout") {
              return (
                <li key={idx}>
                  <button
                    type="button"
                    className="nav-logout-button"
                    onClick={() => handleClick(item)}
                  >
                    {item.label}
                  </button>
                </li>
              );
            }

            // Regular links
            return (
              <li key={idx}>
                <Link to={item.to!}>{item.label}</Link>
              </li>
            );
          })}
        </ul>
      </div>
    </header>
  );
};

export default MemberNavbar;
