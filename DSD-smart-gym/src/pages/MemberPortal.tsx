import React, { useState, useEffect } from "react";
import QRModal from "../components/Dashboard/QRModal";
import DashboardTile from "../components/Dashboard/DashboardTile";
import { useNavigate } from "react-router-dom";
import ApiHandler from "../utils/ApiHandler";

  // Removed unused qrCode and checkInMessage state
import HeroImage from "../assets/SG_MP_Hero.png";
import ClassesImage from "../assets/SG_Classes.png";
import QRImage from "../assets/SG_QR.png";

import "../styles/DashboardTile.css";
import "../styles/QRModal.css";

const MemberPortal: React.FC = () => {
  const navigate = useNavigate();
  const [showQRModal, setShowQRModal] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  const gym_id = localStorage.getItem("gym_id");

  // Handle check-in/check-out modal logic
  useEffect(() => {
    if (!showQRModal) return;
    // If not checked in, do check-in
    if (!isCheckedIn) {
      const doCheckIn = async () => {
        try {
          await ApiHandler.post("/access/generateQRCode", { gym_id });
          const checkInRes = await ApiHandler.post("/access/checkInOut", { gym_id });
          if (checkInRes?.success) {
            setTimeout(() => {
              setIsCheckedIn(true);
              setShowQRModal(false);
            }, 2000);
          } else {
            setTimeout(() => setShowQRModal(false), 2000);
          }
        } catch (err) {
          setTimeout(() => setShowQRModal(false), 2000);
        }
      };
      doCheckIn();
    } else {
      // If already checked in, do check-out
      const doCheckOut = async () => {
        try {
          const res = await ApiHandler.post("/access/checkInOut", { gym_id });
          if (res?.success) {
            setTimeout(() => {
              setIsCheckedIn(false);
              setShowQRModal(false);
            }, 2000);
          } else {
            setTimeout(() => setShowQRModal(false), 2000);
          }
        } catch (err) {
          setTimeout(() => setShowQRModal(false), 2000);
        }
      };
      doCheckOut();
    }
  }, [showQRModal]);

  // handleCheckOut removed; logic is now in useEffect

  // QRModal now handles QR and check-in logic; no need for useEffect here

  return (
    <div className="member-dashboard">

      {/* Fullscreen Hero Section */}
      <div className="hero-container">
        <img className="hero-image" src={HeroImage} alt="Banner" />
        <div className="hero-overlay" />
        <div className="hero-text">
          <h1>MEMBER PORTAL</h1>
          <div id="tile-grid" className="tile-grid">
            <DashboardTile
              title={isCheckedIn ? "Check-Out" : "Check-In"}
              onClick={() => setShowQRModal(true)}
              backgroundImage={QRImage}
            />
            <DashboardTile
              title="My Classes"
              onClick={() => navigate("/member/classes")}
              backgroundImage={ClassesImage}
            />
          </div>
        </div>
      </div>

      {/* QR Modal (Check-In only) */}
      {showQRModal && !isCheckedIn && (
        <QRModal
          isOpen={showQRModal}
          onClose={() => setShowQRModal(false)}
          gymId={gym_id || ""}
          mode="checkin"
        />
      )}
      {showQRModal && isCheckedIn && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
        }}>
          <div style={{
            background: '#fff', padding: '2rem 3rem', borderRadius: 12, boxShadow: '0 0 20px #0002', textAlign: 'center', minWidth: 280
          }}>
            <button style={{ position: 'absolute', top: 20, right: 30, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }} onClick={() => setShowQRModal(false)}>✕</button>
            <h2 style={{ marginBottom: 16 }}>Check-Out</h2>
            <p style={{ fontSize: 18 }}>You are checked out.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberPortal;
