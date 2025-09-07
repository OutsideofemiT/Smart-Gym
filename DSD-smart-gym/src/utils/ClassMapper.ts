// src/utils/classMappers.ts
import type { UIMemberClass } from "../types/Classes";

/** Safe HH:mm from various backend date-ish shapes */
function hhmmFromDateLike(val: any): string | null {
  if (!val) return null;
  if (typeof val === "string" && /^\d{2}:\d{2}$/.test(val)) return val; // already HH:mm
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** YYYY-MM-DD from string | Date | ISO */
function toDateKey(raw: any): string | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    // If already YYYY-MM-DD at the start of the string
    const ymd = raw.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d.toISOString().split("T")[0];
  }
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    return raw.toISOString().split("T")[0];
  }
  return null;
}

/** Normalize any backend class/session object to the UI shape */
export function normalizeToUI(obj: any): UIMemberClass {
  const id = String(obj._id ?? obj.id);

  // For new API format: start_time and end_time are complete Date objects
  // Extract date from start_time Date object, fallback to explicit date field
  const date =
    obj.start_time 
      ? toDateKey(obj.start_time)
      : toDateKey(obj.date) ?? null;

  // Extract time from start_time Date object, fallback to time field
  const startHHmm =
    obj.start_time 
      ? hhmmFromDateLike(obj.start_time)
      : hhmmFromDateLike(obj.time) ?? (obj.time ? String(obj.time) : null);

  // Extract time from end_time Date object
  const endHHmm = obj.end_time 
    ? hhmmFromDateLike(obj.end_time)
    : null;

  // Capacity, attendees, waitlist count from various shapes
  const capacity = Number(
    obj.capacity ?? obj.maxCapacity ?? obj.default_capacity ?? 0
  );

  const attendees = Number(
    typeof obj.booked_count === "number"
      ? obj.booked_count
      : typeof obj.attendees === "number"
      ? obj.attendees
      : Array.isArray(obj.attendees)
      ? obj.attendees.length
      : 0
  );

  const waitlistCount = Number(
    obj.waitlistCount ?? obj.waitlist_len ?? obj.waitlist ?? 0
  );

  const durationMinutes =
    typeof obj.durationMinutes === "number"
      ? obj.durationMinutes
      : typeof obj.default_duration_min === "number"
      ? obj.default_duration_min
      : null;

  return {
    id,
    title: String(obj.title ?? obj.name ?? "Class"),
    date,
    time: startHHmm,
    capacity,
    attendees,
    waitlistCount,
    description: obj.description,
    end_time: endHHmm,
    durationMinutes,
  };
}
