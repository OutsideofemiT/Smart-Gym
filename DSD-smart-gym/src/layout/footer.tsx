// src/components/Footer.tsx
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { SocialIcon } from "react-social-icons";
import "../styles/Footer.css";
import Logo from "../assets/SG_Icon2.png";

interface FooterProps {
  copyrightText?: string;
  /** Optional manual override to hide the footer */
  forceHide?: boolean;
}

const Footer: React.FC<FooterProps> = ({ copyrightText = "Smart Gym 2025", forceHide }) => {
  const { pathname } = useLocation();

  // ❗ Hide ONLY on admin routes. Shows on all frontend/member pages.
  // If your admin base path is different, adjust the regex.
  const isAdminRoute = /^\/admin(\/|$)/i.test(pathname);
  const hideFooter = !!forceHide || isAdminRoute;

  if (hideFooter) return null;

  return (
    <footer className="sgf">
      <div className="sgf__wrap">
        {/* Top grid */}
        <div className="sgf__grid">
          {/* Brand / About */}
          <section className="sgf__col sgf__brandCol">
            <div className="sgf__logo">
              <img className="sgf__logoImg" src={Logo} alt="Smart Gym logo" />
            </div>
            <p className="sgf__about">
              DSD Cohort project — demo only. Payments and orders are simulated.
            </p>
          </section>

          {/* Explore */}
          <nav className="sgf__col" aria-label="Explore">
            <h5>Explore</h5>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/nonmember/membership">Membership</Link></li>
              <li><Link to="/nonmember/classes">Classes</Link></li>
              <li><Link to="/member/cafe-ordering">Café</Link></li>
            </ul>
          </nav>

          {/* Resources */}
          <nav className="sgf__col" aria-label="Resources">
            <h5>Resources</h5>
            <ul>
              <li><a href="#" rel="noreferrer">GitHub Repo</a></li>
              <li><a href="#" rel="noreferrer">Changelog</a></li>
              <li><a href="#" rel="noreferrer">Accessibility</a></li>
            </ul>
          </nav>

          {/* Legal */}
          <nav className="sgf__col" aria-label="Legal">
            <h5>Legal</h5>
            <ul>
              <li><a href="#" rel="noreferrer">Privacy Policy</a></li>
              <li><a href="#" rel="noreferrer">Terms &amp; Conditions</a></li>
            </ul>
          </nav>
        </div>

        {/* Bottom bar */}
        <div className="sgf__bottom">
          <small>© {copyrightText}</small>
          <div className="sgf__socials" aria-label="Social links">
            <SocialIcon className="sgf__icon" bgColor="#BCFD4C" fgColor="#0B0F0D" url="https://facebook.com/" />
            <SocialIcon className="sgf__icon" bgColor="#BCFD4C" fgColor="#0B0F0D" url="https://instagram.com/" />
            <SocialIcon className="sgf__icon" bgColor="#BCFD4C" fgColor="#0B0F0D" url="https://x.com/" />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
