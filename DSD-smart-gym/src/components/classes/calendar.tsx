// src/components/classes/Calendar.tsx
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import type { EventClickArg } from "@fullcalendar/core";
import Alert from "react-bootstrap/Alert";
import Modal from "../Modal/Modal";
import { ColorLegend } from "./Legend";
import "../../styles/Classes.css";
import ApiHandler from "../../utils/ApiHandler";

/** ---------------- Types ---------------- */
export type AdminCalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  canceled?: boolean;
  capacity?: number;
  attendees?: number;
  instructor?: string;
  room?: string;
};

type Props = { events?: AdminCalendarEvent[] };

type MemberClass = {
  id: string;            // session id (or legacy class id)
  title: string;
  date: string;          // YYYY-MM-DD
  time: string;          // HH:mm
  maxCapacity: number;
  attendees: number;     // booked_count (fallback: attendees array length)
  waitlist: number;      // count only if returned by API
};

/** ---------------- Role helpers ---------------- */
const getRole = () => (localStorage.getItem("role") || "").toLowerCase();
const isAdminOrTrainer = () => {
  const r = getRole();
  return r === "admin" || r === "trainer";
};

/** Compact current user response shape: /users/me */
type MeCompact = { id: string; email?: string; role?: string; gym_id?: string };

/** Ensure we have user_id & gym_id in memory/localStorage */
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
      gym_id = me.gym_id;
      localStorage.setItem("gym_id", me.gym_id);
    }
  } catch {
    // non-fatal; caller will handle missing ids
  }

  return { user_id: user_id ?? null, gym_id: gym_id ?? null };
}

/** ---------------- Component ---------------- */
export default function Calendar({ events }: Props) {
  const roleIsAdmin = isAdminOrTrainer();

  /** ===== user context ===== */
  const [userId, setUserId] = useState<string | null>(localStorage.getItem("user_id"));
  const [gymId, setGymId] = useState<string | null>(localStorage.getItem("gym_id"));

  useEffect(() => {
    (async () => {
      const ctx = await ensureUserContext();
      if (ctx.user_id && ctx.user_id !== userId) setUserId(ctx.user_id);
      if (ctx.gym_id && ctx.gym_id !== gymId) setGymId(ctx.gym_id);
    })();
  }, []);

  /** ===== ADMIN/TRAINER (read-only calendar) ===== */
  const [dbEvents, setDbEvents] = useState<AdminCalendarEvent[] | null>(null);
  const shouldUsePropEvents = Boolean(events && events.length > 0);

  useEffect(() => {
    if (!roleIsAdmin) return;        // admin-only fetch
    if (shouldUsePropEvents) return; // parent provided events

    let mounted = true;
    (async () => {
      try {
        const raw = await ApiHandler.getAdminClasses(); // GET /classes?gym_id=...
        const mapped: AdminCalendarEvent[] = (raw || []).map((r: any) => {
          // Handle the new API response format where start_time and end_time are Date objects
          const start = r.start_time
            ? new Date(r.start_time)
            : r.start
            ? new Date(r.start)
            : combineDateAndTime(r.date ?? r.startDate ?? r.start_date, r.start_time ?? r.startTime);

          const end = r.end_time
            ? new Date(r.end_time)
            : r.end
            ? new Date(r.end)
            : new Date(start.getTime() + ((r.durationMinutes ?? r.default_duration_min ?? 60) * 60_000));

          const attendees =
            typeof r.booked_count === "number"
              ? r.booked_count
              : typeof r.attendees === "number"
              ? r.attendees
              : Array.isArray(r.attendees)
              ? r.attendees.length
              : r.enrolledCount;

          return {
            id: String(r._id ?? r.id ?? makeId()),
            title: String(r.title ?? r.name ?? "Class"),
            start,
            end,
            canceled: Boolean(r.canceled ?? r.isCanceled ?? (r.status === "canceled")),
            capacity: typeof r.capacity === "number" ? r.capacity : r.maxCapacity ?? r.default_capacity,
            attendees,
            instructor: r.instructor ?? r.trainer ?? undefined,
            room: r.room ?? undefined,
          };
        });
        if (mounted) setDbEvents(mapped);
      } catch (e) {
        console.error("Failed to load classes from DB (admin):", e);
        if (mounted) setDbEvents([]);
      }
    })();
    return () => { mounted = false; };
  }, [roleIsAdmin, shouldUsePropEvents]);

  const adminSourceEvents = useMemo<AdminCalendarEvent[]>(() => {
    if (!roleIsAdmin) return [];
    if (shouldUsePropEvents) return events!;
    return dbEvents ?? [];
  }, [roleIsAdmin, events, dbEvents, shouldUsePropEvents]);

  const adminFcEvents = useMemo(
    () =>
      adminSourceEvents.map((e) => ({
        id: e.id,
        title:
          typeof e.capacity === "number" && typeof e.attendees === "number"
            ? `${e.title} (${e.attendees}/${e.capacity})`
            : e.title,
        start: e.start,
        end: e.end,
        color: e.canceled
          ? "gray"
          : (e.attendees ?? 0) >= (e.capacity ?? Number.MAX_SAFE_INTEGER)
          ? "red"
          : "green",
        extendedProps: { kind: "admin", ...e },
      })),
    [adminSourceEvents]
  );

  /** ===== MEMBER (interactive calendar) ===== */
  const [classes, setClasses] = useState<MemberClass[]>([]);
  const [userClasses, setUserClasses] = useState<MemberClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<MemberClass | null>(null);
  const [modalMode, setModalMode] = useState<"signup" | "waitlist" | null>(null);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertVariant, setAlertVariant] = useState<"success" | "danger" | "warning" | "info">("success");
  const [showAlert, setShowAlert] = useState(false);

  // Map different backend shapes to our MemberClass
  const mapToMemberClass = (cls: any): MemberClass => {
    // Handle new API format where start_time and end_time are complete Date objects
    const start = cls.start_time 
      ? new Date(cls.start_time) 
      : cls.start
      ? new Date(cls.start)
      : combineDateAndTime(cls.date, cls.time ?? cls.start_time);
    
    const date = toIsoDate(start);
    const time = toClock(start);

    const attendees =
      typeof cls.booked_count === "number"
        ? cls.booked_count
        : typeof cls.attendees === "number"
        ? cls.attendees
        : Array.isArray(cls.attendees)
        ? cls.attendees.length
        : 0;

    const capacity = Number(cls.capacity ?? cls.maxCapacity ?? cls.default_capacity ?? 0);

    return {
      id: String(cls._id ?? cls.id),
      title: String(cls.title ?? cls.name ?? "Class"),
      date,
      time,
      maxCapacity: capacity,
      attendees,
      waitlist: Number(cls.waitlistCount ?? cls.waitlist_len ?? 0),
    };
  };

  const fetchClassesData = async () => {
    try {
      let list: any[] = [];

      // Primary: prefer tenant scoped endpoint
      if (gymId) {
        try {
          const data = await ApiHandler.get(`/classes/gym/${gymId}`);
          list = data?.allClasses ?? data ?? [];
        } catch (e) {
          console.warn("GET /classes/gym/:gymId failed, will try fallback:", e);
        }
      }

      // Fallback: admin-style list (ApiHandler.getAdminClasses handles query shape)
      if (list.length === 0) {
        try {
          const adminList = await ApiHandler.getAdminClasses(); // /classes?gym_id=...
          list = Array.isArray(adminList) ? adminList : (adminList?.data ?? []);
        } catch (e) {
          console.error("Fallback getAdminClasses failed:", e);
        }
      }

      setClasses(list.map(mapToMemberClass));
    } catch (err: any) {
      console.error("❌ Failed to fetch classes:", err?.message || err);
    }
  };

  const fetchUserClassesData = async () => {
    try {
      const data = await ApiHandler.get("/classes/userClasses"); // requires auth (JWT)
      const list = data?.userClasses ?? data ?? [];
      setUserClasses(list.map(mapToMemberClass));
    } catch (err) {
      console.warn("Failed to fetch user classes (non-fatal):", err);
      setUserClasses([]);
    }
  };

  useEffect(() => {
    if (roleIsAdmin) return; // admin uses admin flow only
    fetchClassesData();
    fetchUserClassesData();
  }, [roleIsAdmin, gymId]);

  const userClassIds = useMemo(() => new Set(userClasses.map((c) => c.id)), [userClasses]);

  const memberFcEvents = useMemo(() => {
    const available = classes
      .filter((c) => !userClassIds.has(c.id))
      .map((cls) => ({
        id: cls.id,
        title: `${cls.title} (${cls.attendees}/${cls.maxCapacity})`,
        start: `${cls.date}T${cls.time}`,
        extendedProps: { kind: "member", ...cls },
        color: cls.attendees >= cls.maxCapacity ? "red" : "green",
      }));

    const mine = userClasses.map((cls) => ({
      id: `user-${cls.id}`,
      title: `✔ My Class: ${cls.title}`,
      start: `${cls.date}T${cls.time}`,
      extendedProps: { kind: "member", ...cls },
      color: "#2563EB",
    }));

    return [...available, ...mine];
  }, [classes, userClasses, userClassIds]);

  const handleEventClick = (clickInfo: EventClickArg) => {
    const props: any = clickInfo.event.extendedProps;
    const kind = props?.kind;
    if (roleIsAdmin || kind === "admin") return; // admin read-only

    const cls: MemberClass = props as MemberClass;
    setSelectedClass(cls);
    setModalMode(
      userClassIds.has(cls.id)
        ? "signup" // already booked; allow leaving from modal
        : cls.attendees >= cls.maxCapacity
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
      // Send user_id & gym_id for new schema (backend may ignore and use JWT — that’s fine)
      await ApiHandler.post(`/classes/${selectedClass.id}/join`, {
        user_id: userId ?? undefined,
        gym_id: gymId ?? undefined,
      });
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
      await ApiHandler.post(`/classes/${selectedClass.id}/leave`, {
        user_id: userId ?? undefined,
        gym_id: gymId ?? undefined,
      });
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

  /** ===== Final event source ===== */
  const fcEvents = roleIsAdmin ? adminFcEvents : memberFcEvents;

  return (
    <div style={{ margin: "10px" }}>
      <h1>Classes</h1>
      <ColorLegend />

      <div className="classes-calendar-wrapper">
        <FullCalendar
          plugins={[dayGridPlugin]}
          initialView="dayGridMonth"
          weekends={true}
          events={fcEvents}
          eventClick={handleEventClick}
          eventDidMount={(info) => {
            info.el.style.cursor = roleIsAdmin ? "default" : "pointer";
            info.el.style.whiteSpace = "normal";
            info.el.style.wordBreak = "break-word";
          }}
          fixedWeekCount={false}
          showNonCurrentDates={true}
          expandRows={true}
          height="100%"
          dayMaxEventRows={3}
          eventTimeFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }}
        />
      </div>

      {!roleIsAdmin && (
        <>
          <Modal
            isOpen={!!selectedClass && !!modalMode}
            onClose={handleModalClose}
            onSubmit={handleModalSubmit}
            onLeave={userClassIds.has(selectedClass?.id ?? "") ? handleLeaveClass : undefined}
            mode={modalMode || "signup"}
            classTitle={selectedClass?.title || ""}
            waitlistLength={selectedClass?.waitlist ?? 0}
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
        </>
      )}
    </div>
  );
}

/** ---------------- Helpers ---------------- */
function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    // @ts-ignore
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function toDate(dateLike: any): Date {
  if (!dateLike) return new Date();
  const d = new Date(dateLike);
  if (!isNaN(d.getTime())) return d;
  if (typeof dateLike === "string") {
    const m = dateLike.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  return new Date();
}

function combineDateAndTime(dateLike: any, timeStr?: string): Date {
  const base = toDate(dateLike);
  if (!timeStr) return base;
  const [hh, mm] = String(timeStr).split(":").map((n: string) => Number(n));
  return new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate(),
    isFinite(hh) ? hh : 0,
    isFinite(mm) ? mm : 0,
    0,
    0
  );
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toClock(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
