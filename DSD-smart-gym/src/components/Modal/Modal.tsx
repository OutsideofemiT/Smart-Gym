import React from "react";
import "../../styles/CalendarModal.css";

interface MemberClass {
  waitlistCount: number;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  capacity: number;
  attendees: number;
  waitlist: number;
  description?: string;
  start_time?: string;
  end_time?: string;
  durationMinutes?: number;
  _id?: string;
  waitlisted?: boolean;
  trainer_id?: string;
  canceled?: boolean;
  cancel_reason?: boolean;
};

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onLeave?: () => void; // optional leave handler
  mode: "signup" | "waitlist";
  classTitle: string;
  waitlistLength?: number;
  classId?: string | number;
  userClasses?: MemberClass[];
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onLeave,
  mode,
  classTitle,
  waitlistLength,
  userClasses = [],
  classId,
}) => {
  if (!isOpen) return null;

  const waitListedClasses = userClasses
    .filter((cls) => cls.waitlisted)
    .map((cls) => cls._id);

  const idClass = classId?.toString() || "";
  const matches = waitListedClasses.some((id) => id === idClass);
  const alreadyJoined = userClasses.some((cls) => cls._id === idClass);

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2 className="modal-title">
          {mode === "signup"
            ? `Sign Up for ${classTitle}`
            : `${classTitle} is Full — Join Waitlist`}
        </h2>

        {mode === "waitlist" ? (
          <p className="modal-waitlist-text">
            Current waitlist length: <strong>{waitlistLength}</strong>
          </p>
        ) : matches ? (
          <p className="modal-waitlist-text">
            You are currently on the waitlist <br />
            Current waitlist length: <strong>{waitlistLength}</strong>
          </p>
        ) : null}

        <div className="modal-actions">
          <button onClick={onClose} className="modal-button modal-cancel">
            Cancel
          </button>

          {/* Sign up or Join Waitlist */}
          <button
            onClick={onSubmit}
            className="modal-button modal-submit"
            disabled={alreadyJoined}
          >
            {mode === "signup" ? "Sign Up" : "Join Waitlist"}
          </button>

          {/* Leave Class button only shows if user is signed up */}
          {mode === "signup" && onLeave && (
            <button
              onClick={onLeave}
              className="modal-button modal-leave"
              style={{ backgroundColor: "#f87171" }}
            >
              {matches ? "Leave Waitlist" : "Leave Class"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
