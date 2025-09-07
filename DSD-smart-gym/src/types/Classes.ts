export type UIMemberClass = {
  id: string;                 // session id (normalized)
  title: string;
  date: string | null;        // YYYY-MM-DD (or null if unknown)
  time: string | null;        // HH:mm (or null if unknown)
  capacity: number;
  attendees: number;
  waitlistCount: number;
  description?: string;
  /** Optional extras used for display when provided */
  end_time?: string | null;   // HH:mm
  durationMinutes?: number | null;
};