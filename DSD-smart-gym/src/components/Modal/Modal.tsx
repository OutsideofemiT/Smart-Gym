// src/components/Modal/Modal.tsx
import React from "react";
import "../../styles/CalendarModal.css";
import type { UIMemberClass } from "../../types/Classes"; // <- adjust path if needed

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onLeave?: () => void; // optional leave handler
  mode: "signup" | "waitlist";
  classTitle: string;
  waitlistLength?: number;
  classId?: string | number;
  /** We only need ids to know if already joined; passing full objects is fine too */
  userClasses?: Array<Pick<UIMemberClass, "id">>;
};

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onLeave,
  mode,
  classTitle,
  waitlistLength,
  classId,
  userClasses = [],
}) => {
  if (!isOpen) return null;

  const idClass = (classId ?? "").toString();
  const alreadyJoined = userClasses.some((cls) => String(cls.id) === idClass);

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2 className="modal-title">
          {mode === "signup"
            ? `Sign Up for ${classTitle}`
            : `${classTitle} is Full — Join Waitlist`}
        </h2>

        {mode === "waitlist" && (
          <p className="modal-waitlist-text">
            Current waitlist length: <strong>{waitlistLength ?? 0}</strong>
          </p>
        )}

        <div className="modal-actions">
          <button onClick={onClose} className="modal-button modal-cancel">
            Cancel
          </button>

          {/* Sign up or Join Waitlist */}
          <button
            onClick={onSubmit}
            className="modal-button modal-submit"
            disabled={alreadyJoined}
            title={alreadyJoined ? "You're already booked." : undefined}
          >
            {mode === "signup" ? "Sign Up" : "Join Waitlist"}
          </button>

          {/* Leave (works for both booking and waitlist on the backend) */}
          {onLeave && (
            <button
              onClick={onLeave}
              className="modal-button modal-leave"
              style={{ backgroundColor: "#f87171" }}
            >
              {mode === "waitlist" ? "Leave Waitlist" : "Leave Class"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
