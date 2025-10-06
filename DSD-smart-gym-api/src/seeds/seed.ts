// src/seeds/seed.ts
import crypto from "crypto";
import { ClassSession } from "../models/class.model";
import { Gym } from "../models/gym.model";
import { User } from "../models/user.model";
import { CheckInOut } from "../models/access.model";

/* ------------ helpers ------------ */
function hashPassword(plain: string) {
  const salt = Date.now().toString();
  const password = crypto.createHash("sha256").update(plain + salt).digest("hex");
  return { salt, password };
}

/** Deterministic 24-hex string (acceptable as an ObjectId) */
function makeObjectId(seed: string) {
  return crypto.createHash("md5").update(seed).digest("hex").slice(0, 24);
}

/** days from now at HH:mm (local) -> Date */
function daysFromNow(days: number, hh = 9, mm = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hh, mm, 0, 0);
  return d;
}

/** upsert a user by email; returns the doc */
async function upsertUser(opts: {
  email: string;
  name: string;
  role: "admin" | "trainer" | "member";
  gymId: string;
  passwordPlain: string;
}) {
  const { email, name, role, gymId, passwordPlain } = opts;
  const existing = await User.findOne({ email });
  if (existing) return existing;

  const { salt, password } = hashPassword(passwordPlain);
  return User.create({ email, name, role, gym_id: gymId, salt, password });
}

/** upsert a class with deterministic ObjectId */
async function upsertClass(c: {
  title: string;
  description: string;
  trainer_id: string; // user _id string
  gym_id: string;     // gym _id string
  date: Date;
  start_time: string; // "HH:mm"
  end_time: string;   // "HH:mm"
  capacity: number;
  attendees?: number;
}) {
  const key = `${c.gym_id}|${c.trainer_id}|${c.title}|${c.start_time}|${c.date.toISOString().slice(0,10)}`;
  const _id = makeObjectId(`class:${key}`);

  await ClassSession.updateOne(
    { _id },
    {
      $setOnInsert: {
        _id,
        ...c,
        attendees: c.attendees ?? 0,
        canceled: false,
        cancel_reason: "",
        canceled_at: undefined,
      },
    },
    { upsert: true }
  );
}

/** optional: tiny dev check-ins */
async function seedDevCheckins(memberId: string, gymId: string) {
  const mk = (y: number, m: number, d: number, h = 8) => new Date(y, m, d, h, 0, 0, 0);
  const entries = [
    { in: mk(2024, 6, 15, 8), out: mk(2024, 6, 15, 9) },
    { in: mk(2024, 6, 16, 18), out: mk(2024, 6, 16, 19) },
  ];

  await Promise.all(
    entries.map(({ in: checked_in, out: checked_out }, idx) =>
      CheckInOut.updateOne(
        { _id: `${memberId}-ci-${idx}` },
        {
          $setOnInsert: {
            _id: `${memberId}-ci-${idx}`,
            user_id: memberId,
            gym_id: gymId,
            checked_in,
            checked_out,
          },
        },
        { upsert: true }
      )
    )
  );
}

export const seed = async () => {
  /* ---------- Gym (Smart Gym) ---------- */
  const gymName = "Smart Gym";
  let gym = await Gym.findOne({ name: gymName });
  if (!gym) {
    gym = await Gym.create({
      name: gymName,
      address: "100 Fitness Ave",
      city: "Austin",
      zipcode: "78701",
      phone: "5125550000",
    });
  }
  const gymId = String(gym._id);

  /* ---------- Users (admin + trainer + member) ---------- */
  // keep original passwords as requested
  const admin = await upsertUser({
    email: "admin@email.com",
    name: "Site Admin",
    role: "admin",
    gymId,
    passwordPlain: "123123123",
  });

  const trainer = await upsertUser({
    email: "trainer1@email.com",
    name: "Trainer Bob",
    role: "trainer",
    gymId,
    passwordPlain: "12341234",
  });

  const member = await upsertUser({
    email: "member1@email.com",
    name: "John Smith",
    role: "member",
    gymId,
    passwordPlain: "123161",
  });

  /* ---------- Classes (realistic; no “Netflix”) ---------- */
  await upsertClass({
    title: "Strength Foundations",
    description: "Full-body compound lifts with coaching on form. Great for all levels.",
    trainer_id: String(trainer._id),
    gym_id: gymId,
    date: daysFromNow(3, 8, 0),
    start_time: "08:00",
    end_time: "09:00",
    capacity: 10,
  });

  await upsertClass({
    title: "HIIT Express",
    description: "Fast-paced intervals to spike heart rate and burn calories in under an hour.",
    trainer_id: String(trainer._id),
    gym_id: gymId,
    date: daysFromNow(4, 12, 0),
    start_time: "12:00",
    end_time: "12:45",
    capacity: 14,
  });

  await upsertClass({
    title: "Mobility & Flexibility",
    description: "Guided mobility work to improve range of motion and reduce soreness.",
    trainer_id: String(trainer._id),
    gym_id: gymId,
    date: daysFromNow(5, 18, 0),
    start_time: "18:00",
    end_time: "19:00",
    capacity: 16,
  });

  /* ---------- Optional dev-only check-ins ---------- */
  if (process.env.SEED_DEV_CHECKINS === "true") {
    await seedDevCheckins(String(member._id), gymId);
  }

  console.log("✅ Seed complete");
  console.log("   Gym:", gymName, gymId);
  console.log("   Admin:", admin.email);
  console.log("   Trainer:", trainer.email);
  console.log("   Member:", member.email);
  console.log("   Tip: set DEFAULT_GYM_ID=%s so /signup works without a selector.", gymId);
};
