// src/components/classes/ClassesTabs.tsx
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo } from "react";
import * as React from "react";
import ApiHandler from "../../utils/ApiHandler";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Alert from "react-bootstrap/Alert";
import Modal from "../Modal/Modal";

import type { UIMemberClass } from "../../types/Classes";
import { normalizeToUI } from "../../utils/ClassMapper";

/* =========================
   Types
   ========================= */
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

type MeCompact = { id: string; gym_id?: string | null };

/* =========================
   Small UI helpers
   ========================= */
function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} id={`simple-tabpanel-${index}`} aria-labelledby={`simple-tab-${index}`} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return { id: `simple-tab-${index}`, "aria-controls": `simple-tabpanel-${index}` };
}

/* =========================
   Date/Time helpers (HH:mm safe)
   ========================= */
function toDateKey(raw: any): string | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    const ymd = raw.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd;
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
    return null;
  }
  if (raw instanceof Date && !isNaN(raw.getTime())) return raw.toISOString().split("T")[0];
  return null;
}

function fromDateAndTime(dateKey: string | null, timeStr?: string | null): Date | null {
  if (!dateKey || !timeStr) return null;
  const [hh, mm] = String(timeStr).split(":");
  if (hh == null || mm == null) return null;
  const dt = new Date(`${dateKey}T${hh.padStart(2, "0")}:${mm.padStart(2, "0")}:00`);
  return isNaN(dt.getTime()) ? null : dt;
}

function fmtTime(dt: Date | null): string {
  return dt ? dt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "TBD";
}

function fmtDateLabel(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

/* =========================
   Ensure user context
   ========================= */
async function ensureUserContext(): Promise<{ user_id: string | null; gym_id: string | null }> {
  let user_id = localStorage.getItem("user_id");
  let gym_id = localStorage.getItem("gym_id");
  if (user_id && gym_id) return { user_id, gym_id };

  try {
    const me = (await ApiHandler.get("/users/me")) as MeCompact;
    if (me?.id) {
      user_id = me.id;
      localStorage.setItem("user_id", me.id);
    }
    if (me?.gym_id) {
      gym_id = me.gym_id || null;
      if (gym_id) localStorage.setItem("gym_id", gym_id);
    }
  } catch {
    /* non-fatal */
  }
  return { user_id: user_id ?? null, gym_id: gym_id ?? null };
}

/* =========================
   Component
   ========================= */
export default function ClassesTabs() {
  const [tabIdx, setTabIdx] = useState(0);

  const [gymId, setGymId] = useState<string | null>(localStorage.getItem("gym_id"));
  const [classes, setClasses] = useState<UIMemberClass[]>([]);
  const [userClasses, setUserClasses] = useState<UIMemberClass[]>([]);

  const [selectedClass, setSelectedClass] = useState<UIMemberClass | null>(null);
  const [modalMode, setModalMode] = useState<"signup" | "waitlist" | null>(null);

  const [alertMessage, setAlertMessage] = useState("");
  const [alertVariant, setAlertVariant] = useState<"success" | "danger" | "warning" | "info">("success");
  const [showAlert, setShowAlert] = useState(false);

  const handleChange = (_e: React.SyntheticEvent, newValue: number) => setTabIdx(newValue);

  useEffect(() => {
    (async () => {
      const ctx = await ensureUserContext();
      if (ctx.gym_id && ctx.gym_id !== gymId) setGymId(ctx.gym_id);
    })();
  }, []);

  const fetchClassesData = async () => {
    try {
      let list: any[] = [];
      if (gymId) {
        const data = await ApiHandler.get(`/classes/gym/${gymId}`);
        list = data?.allClasses ?? data ?? [];
      }
      setClasses(list.map(normalizeToUI));
    } catch (err) {
      console.warn("Failed to fetch classes:", err);
      setClasses([]);
    }
  };

  const fetchUserClassesData = async () => {
    try {
      const data = await ApiHandler.get("/classes/userClasses"); // JWT-based
      const list = data?.userClasses ?? data ?? [];
      setUserClasses(list.map(normalizeToUI));
    } catch (err) {
      console.warn("Failed to fetch user classes:", err);
      setUserClasses([]);
    }
  };

  useEffect(() => {
    fetchClassesData();
    fetchUserClassesData();
  }, [gymId]);

  // Session ids the user is in
  const userClassIds = useMemo(() => new Set(userClasses.map((c) => c.id)), [userClasses]);

  const handleReserveClick = (cls: UIMemberClass) => {
    setSelectedClass(cls);
    setModalMode(
      userClassIds.has(cls.id)
        ? "signup" // already booked; modal shows leave
        : cls.attendees >= cls.capacity
        ? "waitlist"
        : "signup"
    );
  };

  const handleModalClose = () => {
    setSelectedClass(null);
    setModalMode(null);
  };

  const handleModalSubmit = async () => {
    if (!selectedClass) return;
    try {
      // JWT identifies the user; body can be empty
      await ApiHandler.post(`/classes/${selectedClass.id}/join`, {});
      await fetchClassesData();
      await fetchUserClassesData();
      setAlertMessage("Successfully joined!");
      setAlertVariant("success");
      setShowAlert(true);
    } catch (err: any) {
      setAlertMessage(err?.response?.data?.error || err?.message || "Failed to join class.");
      setAlertVariant("danger");
      setShowAlert(true);
    }
    handleModalClose();
    setTimeout(() => setShowAlert(false), 3000);
  };

  const handleLeaveClass = async () => {
    if (!selectedClass) return;
    try {
      await ApiHandler.post(`/classes/${selectedClass.id}/leave`, {});
      await fetchClassesData();
      await fetchUserClassesData();
      setAlertMessage("You have left the class.");
      setAlertVariant("info");
      setShowAlert(true);
    } catch (err: any) {
      setAlertMessage(err?.response?.data?.error || err?.message || "Failed to leave class.");
      setAlertVariant("danger");
      setShowAlert(true);
    }
    handleModalClose();
    setTimeout(() => setShowAlert(false), 3000);
  };

  /* -------- Group sessions by date -------- */
  const groupedByDate: Record<string, UIMemberClass[]> = classes.reduce((acc, cls) => {
    const key = toDateKey(cls.date) || "Unknown Date";
    (acc[key] ||= []).push(cls);
    return acc;
  }, {} as Record<string, UIMemberClass[]>);

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => a.localeCompare(b));

  if (!sortedDates.length) {
    return (
      <Box sx={{ p: 3, color: "#ccc" }}>
        No classes scheduled yet.
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", color: "white" }}>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={tabIdx}
          onChange={handleChange}
          aria-label="classes tabs"
          variant="scrollable"
          scrollButtons="auto"
          textColor="inherit"
          indicatorColor="primary"
        >
          {sortedDates.map((date, index) => (
            <Tab
              key={date}
              label={date === "Unknown Date" ? date : fmtDateLabel(date)}
              {...a11yProps(index)}
              sx={{ color: "white" }}
            />
          ))}
        </Tabs>
      </Box>

      {sortedDates.map((date, index) => (
        <CustomTabPanel key={date} value={tabIdx} index={index}>
          {groupedByDate[date]
            .slice()
            .sort((a, b) => {
              const aStart = fromDateAndTime(toDateKey(a.date), a.time) ?? new Date(8640000000000000);
              const bStart = fromDateAndTime(toDateKey(b.date), b.time) ?? new Date(8640000000000000);
              return aStart.getTime() - bStart.getTime();
            })
            .map((cls) => {
              const dateKey = toDateKey(cls.date);
              const startDT = fromDateAndTime(dateKey, cls.time);
              let endDT = fromDateAndTime(dateKey, cls.end_time || null);

              if (!endDT && startDT && typeof cls.durationMinutes === "number") {
                endDT = new Date(startDT.getTime() + cls.durationMinutes * 60000);
              }

              const length =
                startDT && endDT
                  ? Math.round((endDT.getTime() - startDT.getTime()) / 60000)
                  : typeof cls.durationMinutes === "number"
                  ? cls.durationMinutes
                  : null;

              return (
                <Box
                  key={cls.id}
                  sx={{
                    mb: 2,
                    p: 2,
                    border: "1px solid #444",
                    borderRadius: "8px",
                    boxShadow: "0px 1px 6px rgba(0,0,0,0.3)",
                    backgroundColor: "#1c1c1c",
                    color: "white",
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="h6" sx={{ color: "white" }}>
                        {cls.title}
                      </Typography>
                      {cls.description && (
                        <Typography variant="body2" sx={{ mt: 0.5, color: "#ccc", pb: "8px", maxWidth: "450px" }}>
                          {cls.description}
                        </Typography>
                      )}
                    </Box>
                    <Typography variant="body2" sx={{ color: "#fff", fontWeight: "bold" }}>
                      {fmtTime(startDT)}
                      {endDT ? ` — ${fmtTime(endDT)}` : ""}
                      {length != null ? ` (${length} mins)` : " (Length TBD)"}
                    </Typography>
                  </Stack>

                  <Button
                    variant="contained"
                    sx={{ backgroundColor: "#C4F500", color: "white", mt: 1 }}
                    onClick={() => handleReserveClick(cls)}
                  >
                    {userClassIds.has(cls.id)
                      ? "Booked"
                      : cls.attendees >= cls.capacity
                      ? "Join Waitlist"
                      : "Reserve"}
                  </Button>
                </Box>
              );
            })}
        </CustomTabPanel>
      ))}

      {/* Booking / waitlist modal */}
      <Modal
        isOpen={!!selectedClass && !!modalMode}
        onClose={handleModalClose}
        onSubmit={handleModalSubmit}
        onLeave={userClassIds.has(selectedClass?.id ?? "") ? handleLeaveClass : undefined}
        mode={modalMode || "signup"}
        classTitle={selectedClass?.title || ""}
        waitlistLength={selectedClass?.waitlistCount ?? 0}
        classId={selectedClass?.id}
        userClasses={userClasses}
      />

      {showAlert && (
        <div className="alert-overlay">
          <div className="alert-wrapper">
            <Alert variant={alertVariant} onClose={() => setShowAlert(false)} dismissible>
              {alertMessage}
            </Alert>
          </div>
        </div>
      )}
    </Box>
  );
}
