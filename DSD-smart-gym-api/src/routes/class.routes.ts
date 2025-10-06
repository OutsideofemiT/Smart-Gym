// src/routes/class.routes.ts
import express from "express";
import { requireAuth } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";
import {
  createSession,        // <-- This now exists in controller
  fetchClasses,
  fetchClassesByGym,
  fetchClassesByQuery,
  fetchUserClasses,
  getTrainerClasses,
  joinClass,
  leaveClass,
  cancelClass,
  uncancelClass,
  deleteClass,
  updateSession,        // <-- This now exists in controller
} from "../controllers/class.controller";

const router = express.Router();

/* ---- Create (admins & trainers) ---- */
router.post("/session", requireAuth, requireRole(["admin", "trainer"]), createSession);

/* ---- Read ---- */
router.get("/", requireAuth, fetchClasses);
router.get("/gym/:gymId", requireAuth, fetchClassesByGym);
router.get("/search", requireAuth, fetchClassesByQuery);
router.get("/userClasses", requireAuth, fetchUserClasses);
router.get("/trainer/mine", requireAuth, requireRole(["trainer", "admin"]), getTrainerClasses);

/* ---- Join / Leave ---- */
router.post("/:id/join", requireAuth, joinClass);
router.post("/:id/leave", requireAuth, leaveClass);

/* ---- Admin/Trainer controls ---- */
router.put("/:id/cancel", requireAuth, requireRole(["admin", "trainer"]), cancelClass);
router.put("/:id/uncancel", requireAuth, requireRole(["admin", "trainer"]), uncancelClass);
router.put("/:id", requireAuth, requireRole(["admin", "trainer"]), updateSession);
router.delete("/:id", requireAuth, requireRole(["admin", "trainer"]), deleteClass);

export default router;
