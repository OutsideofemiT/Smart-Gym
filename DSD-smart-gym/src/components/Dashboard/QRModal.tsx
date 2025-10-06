import React, { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import ApiHandler from "../../utils/ApiHandler";
import "../../styles/QRModal.css";

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  gymId: string;
  mode: 'checkin' | 'checkout';
}

const QRModal: React.FC<QRModalProps> = ({ isOpen, onClose, gymId, mode }) => {
  const [qrCodeValue, setQrCodeValue] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isOpen || mode === 'checkout') return;
    const fetchQRCode = async () => {
      try {
        const data = await ApiHandler.post("/access/generateQRCode", {
          gym_id: gymId,
        });
        const rawQr = data.qrCode;
        if (typeof rawQr === "string") {
          setQrCodeValue(rawQr);
        } else if (typeof rawQr === "object" && rawQr.qr_code) {
          setQrCodeValue(rawQr.qr_code);
        } else {
          throw new Error("QR code missing or malformed.");
        }
        setLoading(false);
      } catch (err: any) {
        console.error("QR Code fetch error:", err);
        alert(err.message || "Error generating QR code.");
        setLoading(false);
      }
    };
    fetchQRCode();
  }, [isOpen, gymId, mode]);

  const handleCheckInOut = async () => {
    try {
      const data = await ApiHandler.post("/access/checkInOut", {
        gym_id: gymId,
      });
      alert(data.message || "Check-in/out successful.");
    } catch (err) {
      console.error("Check-in/out error:", err);
      alert("Error during check-in/out.");
    }
  };

  return (
    <div className="qr-modal-overlay-unique" onClick={onClose}>
      <div className="qr-modal-content-unique" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>✕</button>
        {mode === 'checkin' ? (
          <>
            <h2>Check-In</h2>
            {!loading && qrCodeValue ? (
              <>
                <QRCodeCanvas value={qrCodeValue} size={200} />
                <button className="checkin-btn" onClick={handleCheckInOut}>You are Checked In</button>
              </>
            ) : (
              <p>Loading QR Code...</p>
            )}
          </>
        ) : (
          <>
            <h2>Check-Out</h2>
            <p>You are checked out.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default QRModal;
