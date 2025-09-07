// src/controllers/class.controller.ts
import { Response } from "express";
import { Types } from "mongoose";
import { IAuthenticatedRequest } from "../types/interface";
import { ClassSession, ClassBooking, Waitlist } from "../models/class.model";
import { User } from "../models/user.model";
import nodemailer from "nodemailer";

/* -------------------- mailer (optional) -------------------- */
const mailUser = process.env.NODE_USER;
const mailPass = process.env.NODE_PASS;

const transporter =
  mailUser && mailPass
    ? nodemailer.createTransport({
        service: "gmail",
        auth: { user: mailUser, pass: mailPass },
      })
    : null;

/* -------------------- helpers -------------------- */
const ymd = (s: string) => String(s ?? "").slice(0, 10);

const endOfClass = (dateYMD: string, endHHmm: string) => {
  const [y, m, d] = ymd(dateYMD).split("-").map(Number);
  const [hh, mm] = String(endHHmm).split(":").map(Number);
  return new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0);
};

const isTrainer = (req: IAuthenticatedRequest) => req.user?.role === "trainer";
const isAdmin = (req: IAuthenticatedRequest) => req.user?.role === "admin";
const uidStr = (req: IAuthenticatedRequest) => String(req.user!.user_id);

/** Trainers can manage only their classes; admins can manage any class. */
const assertCanManageClass = async (req: IAuthenticatedRequest, classId: string) => {
  const cls = await ClassSession.findById(classId);
  if (!cls) return { ok: false as const, status: 404 as const, error: "Class not found." };

  if (isAdmin(req)) return { ok: true as const, cls };

  if (isTrainer(req)) {
    if (String((cls as any).trainer_id) === uidStr(req)) {
      return { ok: true as const, cls };
    }
    return { ok: false as const, status: 403 as const, error: "Forbidden: not your class." };
  }

  return { ok: false as const, status: 403 as const, error: "Forbidden." };
};

/* ======================================================================
   CREATE / UPDATE
   ====================================================================== */

/**
 * Create a class *session*
 * Route: POST /api/classes/session
 * Roles: admin, trainer
 */
export const createSession = async (req: IAuthenticatedRequest, res: Response) => {
  try {
    const {
      title,
      description,
      date,
      start_time,
      end_time,
      capacity,
      gym_id,
      trainer_id, // only respected for admin
      room,
      level,
      duration_min,
      attendees,
      canceled,
    } = req.body ?? {};

    const errors: string[] = [];
    if (!title) errors.push("title is required");
    if (!date) errors.push("date is required");
    if (!start_time) errors.push("start_time is required");
    if (!end_time) errors.push("end_time is required");
    if (capacity == null) errors.push("capacity is required");
    if (!gym_id) errors.push("gym_id is required");

    const capNum = Number(capacity);
    if (!Number.isFinite(capNum) || capNum < 0)
      errors.push("capacity must be a non-negative number");

    if (errors.length) {
      return res.status(400).json({ ok: false, errors });
    }

    // Convert date + time strings to Date objects
    const dateStr = ymd(String(date)); // normalize to YYYY-MM-DD
    const startDateTime = new Date(`${dateStr}T${start_time}:00`);
    const endDateTime = new Date(`${dateStr}T${end_time}:00`);

    const body: any = {
      title: String(title),
      description: description ?? "",
      start_time: startDateTime,
      end_time: endDateTime,
      capacity: capNum,
      gym_id: String(gym_id),
      room: room ?? "",
      level: level ?? "",
      duration_min: duration_min ?? undefined,
      booked_count: Number(attendees ?? 0),
      status: Boolean(canceled ?? false) ? "canceled" : "scheduled",
    };

    // trainer ownership rules
    if (isTrainer(req)) {
      body.trainer_id = new Types.ObjectId(uidStr(req));
    } else if (isAdmin(req)) {
      // For admin, if trainer_id is provided, it should be a valid ObjectId
      // If it's an email, we need to look up the user first
      if (trainer_id) {
        try {
          // Try to use it as ObjectId first
          body.trainer_id = new Types.ObjectId(String(trainer_id));
        } catch {
          // If it fails, it might be an email - look up the user
          const trainer = await User.findOne({ email: String(trainer_id) });
          if (trainer) {
            body.trainer_id = trainer._id;
          } else {
            return res.status(400).json({ ok: false, error: "Trainer not found" });
          }
        }
      } else {
        // If no trainer_id provided for admin, use the admin's ID
        body.trainer_id = new Types.ObjectId(uidStr(req));
      }
    }

    // Convert gym_id to ObjectId
    body.gym_id = new Types.ObjectId(String(gym_id));

    const doc = await ClassSession.create(body);
    return res.status(201).json({ ok: true, id: doc._id, data: doc });
  } catch (err: any) {
    console.error("[createSession] error:", err?.message || err);
    return res.status(500).json({ ok: false, error: "Failed to create session" });
  }
};

/**
 * Update a class *session*
 * Route: PUT /api/classes/:id
 * Roles: admin, trainer (only own sessions)
 */
export const updateSession = async (req: IAuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Missing class ID" });

    const guard = await assertCanManageClass(req, id);
    if (!guard.ok) return res.status(guard.status).json({ error: guard.error });

    // Only allow safe fields to be updated here (cancellation handled by dedicated endpoints)
    const {
      title,
      description,
      date,
      start_time,
      end_time,
      capacity,
      room,
      level,
      duration_min,
      trainer_id, // admin only
    } = req.body ?? {};

    const patch: any = {};
    if (title !== undefined) patch.title = String(title);
    if (description !== undefined) patch.description = String(description);
    
    // Handle date/time updates - combine date and time strings into Date objects
    if (date !== undefined && start_time !== undefined) {
      const startDateTime = new Date(`${date}T${start_time}`);
      if (isNaN(startDateTime.getTime())) {
        return res.status(400).json({ error: "Invalid start date/time format" });
      }
      patch.start_time = startDateTime;
    } else if (start_time !== undefined) {
      // If only start_time provided, assume today's date
      const today = new Date().toISOString().split('T')[0];
      const startDateTime = new Date(`${today}T${start_time}`);
      if (isNaN(startDateTime.getTime())) {
        return res.status(400).json({ error: "Invalid start time format" });
      }
      patch.start_time = startDateTime;
    }
    
    if (date !== undefined && end_time !== undefined) {
      const endDateTime = new Date(`${date}T${end_time}`);
      if (isNaN(endDateTime.getTime())) {
        return res.status(400).json({ error: "Invalid end date/time format" });
      }
      patch.end_time = endDateTime;
    } else if (end_time !== undefined) {
      // If only end_time provided, assume today's date
      const today = new Date().toISOString().split('T')[0];
      const endDateTime = new Date(`${today}T${end_time}`);
      if (isNaN(endDateTime.getTime())) {
        return res.status(400).json({ error: "Invalid end time format" });
      }
      patch.end_time = endDateTime;
    }
    
    if (capacity !== undefined) {
      const capNum = Number(capacity);
      if (!Number.isFinite(capNum) || capNum < 0)
        return res.status(400).json({ error: "capacity must be a non-negative number" });
      patch.capacity = capNum;
    }
    if (room !== undefined) patch.room = String(room);
    if (level !== undefined) patch.level = String(level);
    if (duration_min !== undefined) patch.duration_min = Number(duration_min);

    if (isAdmin(req) && trainer_id !== undefined) {
      // Convert trainer_id to ObjectId if it's an email, otherwise use as ObjectId
      if (trainer_id.includes('@')) {
        const trainer = await User.findOne({ email: trainer_id });
        if (!trainer) {
          return res.status(400).json({ error: "Trainer not found" });
        }
        patch.trainer_id = trainer._id;
      } else {
        try {
          patch.trainer_id = new Types.ObjectId(trainer_id);
        } catch (err) {
          return res.status(400).json({ error: "Invalid trainer ID format" });
        }
      }
    }
    // Trainers cannot reassign ownership to other trainers

    const updated = await ClassSession.findByIdAndUpdate(id, patch, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updated) return res.status(404).json({ error: "Class not found" });
    return res.status(200).json({ ok: true, data: updated });
  } catch (err: any) {
    console.error("[updateSession] error:", err?.message || err);
    return res.status(500).json({ error: "Failed to update session" });
  }
};

/* ======================================================================
   READ / LIST
   ====================================================================== */

export const fetchClassesByQuery = async (req: IAuthenticatedRequest, res: Response) => {
  try {
    const gymId =
      (req.query.gymId as string) ??
      (req.query.gym_id as string) ?? // support both keys
      undefined;

    const query = gymId ? { gym_id: gymId } : {};
    const classes = await ClassSession.find(query).lean();

    return res.status(200).json({ allClasses: classes });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

export const fetchClassesByGym = async (req: IAuthenticatedRequest, res: Response) => {
  try {
    const gymId = req.params.gymId;
    if (!gymId) return res.status(400).json({ error: "gymId is required" });

    const classes = await ClassSession.find({ gym_id: gymId }).lean();
    const classIds = classes.map((c) => String(c._id));

    // Aggregate waitlist counts by session_id
    const waitlistCounts = await Waitlist.aggregate([
      { $match: { session_id: { $in: classIds } } },
      { $group: { _id: "$session_id", count: { $sum: 1 } } },
    ]);

    const waitlistMap: Record<string, number> = {};
    waitlistCounts.forEach((w) => {
      waitlistMap[String(w._id)] = w.count;
    });

    const withCounts = classes.map((cls) => ({
      ...cls,
      waitlistCount: waitlistMap[String(cls._id)] || 0,
    }));

    return res.status(200).json({ allClasses: withCounts });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

export const fetchClasses = async (req: IAuthenticatedRequest, res: Response) => {
  try {
    const gymId =
      (req.params as any).gymId ||
      (req.query.gym_id as string) ||
      (req.params as any).id ||
      (req.user as any)?.gym_id;

    if (!gymId) return res.status(400).json({ error: "gym_id is required" });

    const classes = await ClassSession.find({ gym_id: gymId })
      .sort({ start_time: 1 })
      .lean();

    return res.status(200).json({ data: classes, allClasses: classes });
  } catch {
    return res.status(500).json({ error: "Failed to fetch classes" });
  }
};

export const fetchUserClasses = async (req: IAuthenticatedRequest, res: Response) => {
  try {
    // Use the same uidStr function as joinClass for consistency, then convert to ObjectId
    const user_id_string = uidStr(req);
    const user_id = new Types.ObjectId(user_id_string);

    // Get user's bookings using both ObjectId and string (for migration compatibility)
    const bookings = await ClassBooking.find({ 
      user_id: { $in: [user_id, user_id_string] }
    }).lean();

    const sessionIds = bookings.map((b) => String(b.session_id));
    const classes = await ClassSession.find().where("_id").in(sessionIds).lean();

    return res.status(200).json({ 
      userClasses: classes
    });
  } catch (error) {
    console.error("fetchUserClasses error:", error);
    return res.status(500).json({ error: "Failed to fetch user classes" });
  }
};



/* ======================================================================
   BOOK / UNBOOK
   ====================================================================== */

export const joinClass = async (req: IAuthenticatedRequest, res: Response) => {
  try {
    const userId = uidStr(req);
    const { id } = req.params;

    // Find the class session
    const gymClass = await ClassSession.findById(id).lean();
    if (!gymClass) return res.status(404).json({ error: "Class not found." });
    
    // Check if class is canceled
    if (gymClass.status === "canceled")
      return res.status(400).json({ error: "This class has been canceled." });

    // Check if class has ended using Date objects
    const classEndTime = new Date(gymClass.end_time);
    const now = new Date();
    if (classEndTime.getTime() < now.getTime()) {
      return res.status(400).json({ error: "This class has already ended." });
    }

    // Check if user is already booked (use session_id instead of class_id)
    const alreadyBooked = await ClassBooking.findOne({ session_id: id, user_id: new Types.ObjectId(userId) });
    if (alreadyBooked)
      return res.status(400).json({ error: "You are already booked for this class." });

    // Check if user is already waitlisted (use session_id instead of class_id)
    const alreadyWaitlisted = await Waitlist.findOne({ session_id: id, user_id: new Types.ObjectId(userId) });
    if (alreadyWaitlisted)
      return res.status(400).json({ error: "You are already waitlisted for this class." });

    // Check capacity against current bookings count
    const cap = Number(gymClass.capacity ?? 0);
    const currentBookings = await ClassBooking.countDocuments({ session_id: id, status: { $ne: "canceled" } });

    if (currentBookings >= cap) {
      // Add to waitlist with gym_id - convert user_id to ObjectId
      await Waitlist.create({ 
        session_id: id, 
        user_id: new Types.ObjectId(userId),
        gym_id: gymClass.gym_id,
        joined_at: new Date()
      });
      return res.status(200).json({ message: "Class is full. You have been waitlisted." });
    }

    // Create booking with gym_id - convert user_id to ObjectId
    await ClassBooking.create({ 
      session_id: id, 
      user_id: new Types.ObjectId(userId),
      gym_id: gymClass.gym_id,
      status: "booked",
      booked_at: new Date()
    });
    
    // Update booked count in session
    await ClassSession.findByIdAndUpdate(id, { $inc: { booked_count: 1 } });

    return res.status(200).json({
      message: "Successfully booked class.",
      waitlistCount: 0,
    });
  } catch (error) {
    console.error("Join class error:", error);
    return res.status(500).json({ error: "Failed to join class" });
  }
};

export const leaveClass = async (req: IAuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = uidStr(req);

  if (!id) return res.status(400).json({ error: "Missing class ID" });

  try {
    const booking = await ClassBooking.findOneAndDelete({ session_id: id, user_id: new Types.ObjectId(userId) });

    if (booking) {
      await ClassSession.findByIdAndUpdate(id, { $inc: { booked_count: -1 } });

      const gymClass = await ClassSession.findById(id);
      if (!gymClass) return res.sendStatus(200);

      const cap = Number(gymClass.capacity ?? 0);
      const currentBookings = await ClassBooking.countDocuments({ session_id: id, status: { $ne: "canceled" } });

      if (currentBookings < cap) {
        const nextInLine = await Waitlist.findOne({ session_id: id }).sort({ joined_at: 1 });

        if (nextInLine) {
          await nextInLine.deleteOne();
          await ClassBooking.create({ 
            session_id: id, 
            user_id: String(nextInLine.user_id),
            gym_id: nextInLine.gym_id,
            status: "booked",
            booked_at: new Date()
          });
          await ClassSession.findByIdAndUpdate(id, { $inc: { booked_count: 1 } });

          if (transporter) {
            try {
              const profile = await User.findById(nextInLine.user_id);
              const recipient = profile?.email;
              if (recipient) {
                await transporter.sendMail({
                  from: "'Smart Gym' <noreplysmartgym@gmail.com>",
                  to: recipient,
                  subject: "You’re in! A spot opened up",
                  html: `<p>Good news — you’ve been moved from waitlist to booked for <b>${
                    (gymClass as any)?.title || "your class"
                  }</b>.</p>`,
                });
              }
            } catch {
              /* swallow mail errors */
            }
          }
        }
      }

      return res.status(200).json({ message: "Booking canceled." });
    }

    const isWaitlisted = await Waitlist.findOneAndDelete({ session_id: id, user_id: new Types.ObjectId(userId) });
    if (isWaitlisted) return res.status(200).json({ message: "Removed from waitlist." });

    return res.status(404).json({ error: "You are not booked or waitlisted for this class." });
  } catch {
    return res.status(500).json({ error: "Failed to leave class" });
  }
};

/* ======================================================================
   ADMIN / TRAINER CONTROLS
   ====================================================================== */

export const cancelClass = async (req: IAuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const guard = await assertCanManageClass(req, id);
    if (!guard.ok) return res.status(guard.status).json({ error: guard.error });
    const cls = guard.cls!;

    if ((cls as any).canceled) return res.status(200).json({ message: "Class already canceled." });

    const { reason = "" } = req.body || {};
    (cls as any).canceled = true;
    (cls as any).cancel_reason = reason;
    (cls as any).canceled_at = new Date();
    await cls.save();

    const [bookingsAgg, waitlistedAgg] = await Promise.all([
      ClassBooking.aggregate<{ userId: string }>([
        { $match: { session_id: id } },
        { $project: { _id: 0, userId: "$user_id" } },
      ]),
      Waitlist.aggregate<{ userId: string }>([
        { $match: { session_id: id } },
        { $project: { _id: 0, userId: "$user_id" } },
      ]),
    ]);

    if (transporter) {
      const safeSend = async (to: string, subject: string, html: string) => {
        try {
          await transporter.sendMail({
            from: "'Smart Gym' <noreplysmartgym@gmail.com>",
            to,
            subject,
            html,
          });
        } catch {
          /* swallow mail errors */
        }
      };

      const notifyUser = async (userId: string) => {
        const profile = await User.findById(userId).lean();
        const recipient = (profile as any)?.email;
        if (!recipient) return;
        const html = `
          <p>We're sorry — your class <b>${(cls as any).title}</b> on
          <b>${new Date((cls as any).date).toLocaleDateString()}</b> at
          <b>${(cls as any).start_time}</b> has been <b>canceled</b>.</p>
          ${reason ? `<p>Reason: ${reason}</p>` : ""}
          <p>Please check the schedule for alternatives.</p>`;
        await safeSend(recipient, `Class canceled: ${(cls as any).title}`, html);
      };

      await Promise.all([...bookingsAgg, ...waitlistedAgg].map(({ userId }) => notifyUser(String(userId))));
    }

    await Waitlist.deleteMany({ session_id: id });

    return res.status(200).json({ message: "Class canceled and users notified." });
  } catch {
    return res.status(500).json({ error: "Failed to cancel class" });
  }
};

export const uncancelClass = async (req: IAuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const guard = await assertCanManageClass(req, id);
    if (!guard.ok) return res.status(guard.status).json({ error: guard.error });
    const cls = guard.cls!;

    (cls as any).canceled = false;
    (cls as any).cancel_reason = "";
    (cls as any).canceled_at = undefined;
    await cls.save();

    return res.status(200).json({ message: "Class restored." });
  } catch {
    return res.status(500).json({ error: "Failed to restore class" });
  }
};

export const deleteClass = async (req: IAuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Missing class ID" });

    const guard = await assertCanManageClass(req, id);
    if (!guard.ok) return res.status(guard.status).json({ error: guard.error });
    const cls = guard.cls!;

    await Promise.all([
      ClassBooking.deleteMany({ session_id: id }),
      Waitlist.deleteMany({ session_id: id }),
    ]);

    await cls.deleteOne();

    return res.status(200).json({ ok: true, id, message: "Class deleted." });
  } catch {
    return res.status(500).json({ error: "Failed to delete class" });
  }
};

/**
 * List the authenticated trainer’s own classes (admins can filter by ?trainer_id=<userIdString>)
 * Routes:
 *  - GET /api/classes/trainer/mine
 *  - GET /api/classes/trainer/list?trainer_id=<userIdString>  (admin only)  [optional if you wire it]
 */
export const getTrainerClasses = async (req: IAuthenticatedRequest, res: Response) => {
  try {
    if (isTrainer(req)) {
      const mine = await ClassSession.find({ trainer_id: uidStr(req) })
        .sort({ start_time: 1 })
        .lean();
      return res.status(200).json({ success: true, data: mine });
    }

    if (isAdmin(req)) {
      const trainerId = (req.query.trainer_id as string) || undefined;
      const q = trainerId ? { trainer_id: trainerId } : {};
      const list = await ClassSession.find(q).sort({ start_time: 1 }).lean();
      return res.status(200).json({ success: true, data: list });
    }

    return res.status(403).json({ error: "Forbidden." });
  } catch {
    return res.status(500).json({ error: "Failed to fetch trainer classes" });
  }
};
