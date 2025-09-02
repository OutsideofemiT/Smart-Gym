import { useState, useEffect, useMemo } from "react";
import ApiHandler from "../../utils/ApiHandler";
import * as React from "react";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Alert from "react-bootstrap/Alert";
import Modal from "../Modal/Modal";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

type MemberClass = {
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
};

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}

// ---------- Helpers ---------- //
function toDateKey(raw: any): string | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    const iso = raw.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
    return null;
  }
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    return raw.toISOString().split("T")[0];
  }
  return null;
}

function fromDateAndTime(dateKey: string | null, timeStr?: string): Date | null {
  if (!dateKey || !timeStr) return null;
  const [hh, mm] = String(timeStr).split(":");
  if (hh == null || mm == null) return null;
  const dt = new Date(
    `${dateKey}T${hh.padStart(2, "0")}:${mm.padStart(2, "0")}:00`
  );
  return isNaN(dt.getTime()) ? null : dt;
}

function fmtTime(dt: Date | null): string {
  return dt
    ? dt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : "TBD";
}

function fmtDateLabel(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ClassesTabs() {
  const [value, setValue] = useState(0);
  const [classes, setClasses] = useState<MemberClass[]>([]);
  const [userClasses, setUserClasses] = useState<MemberClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<MemberClass | null>(null);
  const [modalMode, setModalMode] = useState<"signup" | "waitlist" | null>(null);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertVariant, setAlertVariant] = useState<
    "success" | "danger" | "warning" | "info"
  >("success");
  const [showAlert, setShowAlert] = useState(false);
  const gymId = localStorage.getItem("gym_id") || "";

  const handleChange = (_e: React.SyntheticEvent, newValue: number) =>
    setValue(newValue);

  const fetchClassesData = async () => {
    try {
      const data = await ApiHandler.get(`/classes/gym/${gymId}`);
      setClasses(data.allClasses || []);
    } catch (err) {
      console.warn("Failed to fetch classes:", err);
    }
  };

  const fetchUserClassesData = async () => {
    try {
      const data = await ApiHandler.get("/classes/userClasses");
      setUserClasses(data.userClasses || []);
    } catch (err) {
      console.warn("Failed to fetch user classes:", err);
      setUserClasses([]);
    }
  };

  useEffect(() => {
    fetchClassesData();
    fetchUserClassesData();
  }, [gymId]);

  const userClassIds = useMemo(
    () => new Set(userClasses.map((c) => c._id)),
    [userClasses]
  );

  const handleReserveClick = (cls: MemberClass) => {
    setSelectedClass(cls);
    setModalMode(
      userClassIds.has(cls._id)
        ? "signup"
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
    const userId = localStorage.getItem("email");
    if (!userId) return;

    try {
      await ApiHandler.post(`/classes/${selectedClass._id}/join`, {
        user_id: userId,
      });
      await fetchClassesData();
      await fetchUserClassesData();
      setAlertMessage("Successfully joined!");
      setAlertVariant("success");
      setShowAlert(true);
    } catch (err: any) {
      setAlertMessage(err?.response?.data?.error || "Failed to join class.");
      setAlertVariant("danger");
      setShowAlert(true);
    }

    handleModalClose();
    setTimeout(() => setShowAlert(false), 3000);
  };

  const handleLeaveClass = async () => {
    if (!selectedClass) return;
    const userId = localStorage.getItem("email");
    if (!userId) return;

    try {
      await ApiHandler.post(`/classes/${selectedClass._id}/leave`, {
        user_id: userId,
      });
      await fetchClassesData();
      await fetchUserClassesData();
      setAlertMessage("You have left the class.");
      setAlertVariant("info");
      setShowAlert(true);
    } catch (err: any) {
      setAlertMessage(err?.response?.data?.error || "Failed to leave class.");
      setAlertVariant("danger");
      setShowAlert(true);
    }

    handleModalClose();
    setTimeout(() => setShowAlert(false), 3000);
  };

  // Group classes by date
  const groupedByDate: Record<string, MemberClass[]> = classes.reduce(
    (acc, cls) => {
      const dateKey = toDateKey(cls.date) || "Unknown Date";
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(cls);
      return acc;
    },
    {} as Record<string, MemberClass[]>
  );
  
  const sortedDates = Object.keys(groupedByDate).sort((a, b) =>
    a.localeCompare(b)
  );

 
  return (
    <Box sx={{ width: "100%", color: "white" }}>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={value}
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
        <CustomTabPanel key={date} value={value} index={index}>
          {groupedByDate[date]
            .slice()
            .sort((a, b) => {
              const aStart =
                fromDateAndTime(toDateKey(a.date), a.start_time) ??
                new Date(8640000000000000);
              const bStart =
                fromDateAndTime(toDateKey(b.date), b.start_time) ??
                new Date(8640000000000000);
              return aStart.getTime() - bStart.getTime();
            })
            .map((cls) => {
              const dateKey = toDateKey(cls.date);
              const startDT = fromDateAndTime(dateKey, cls.start_time) || null;
              let endDT = fromDateAndTime(dateKey, cls.end_time) || null;

              if (
                !endDT &&
                startDT &&
                typeof cls.durationMinutes === "number"
              ) {
                endDT = new Date(
                  startDT.getTime() + cls.durationMinutes * 60000
                );
              }

              const length =
                startDT && endDT
                  ? Math.round((endDT.getTime() - startDT.getTime()) / 60000)
                  : typeof cls.durationMinutes === "number"
                  ? cls.durationMinutes
                  : null;

              return (
                <Box
                  key={cls._id}
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
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Box>
                      <Typography variant="h6" sx={{ color: "white" }}>
                        {cls.title}
                      </Typography>
                      {cls.description && (
                        <Typography
                          variant="body2"
                          sx={{
                            mt: 0.5,
                            color: "#ccc",
                            paddingBottom: "8px",
                            maxWidth: "450px",
                          }}
                        >
                          {cls.description}
                        </Typography>
                      )}
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{ color: "#fff", fontWeight: "bold" }}
                    >
                      {fmtTime(startDT)}
                      {endDT ? ` — ${fmtTime(endDT)}` : ""}
                      {length != null ? ` (${length} mins)` : " (Length TBD)"}
                    </Typography>
                  </Stack>
                  <Button
                    variant="contained"
                    sx={{ backgroundColor: "#C4F500", color: "white" }}
                    onClick={() => handleReserveClick(cls)}
                  >
                    {userClassIds.has(cls._id)
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

      {/* Modal for booking/waitlist */}
      <Modal
        isOpen={!!selectedClass && !!modalMode}
        onClose={handleModalClose}
        onSubmit={handleModalSubmit}
        onLeave={
          userClassIds.has(selectedClass?._id ?? "") ? handleLeaveClass : undefined
        }
        mode={modalMode || "signup"}
        classTitle={selectedClass?.title || ""}
        waitlistLength={selectedClass?.waitlistCount}
        classId={selectedClass?._id}
        userClasses={userClasses}
      />

      {showAlert && (
        <div className="alert-overlay">
          <div className="alert-wrapper">
            <Alert
              variant={alertVariant}
              onClose={() => setShowAlert(false)}
              dismissible
            >
              {alertMessage}
            </Alert>
          </div>
        </div>
      )}
    </Box>
  );
}
