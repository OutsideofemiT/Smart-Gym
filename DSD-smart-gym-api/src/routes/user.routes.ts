// src/routes/user.routes.ts
import express, { Response } from "express";
import {
  createUser,
  signUp,
  deleteUser,
  fetchAllUsers,
  fetchUserById,
  login,
  updatePassword,
  updateUser,
  getMyProfile, // ← use controller instead of inlining DB access
} from "../controllers/user.controller";
import { getTrainerClasses } from "../controllers/class.controller";
import { requireAuth } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";
import { IAuthenticatedRequest } from "../types/interface";

const router = express.Router();

/** Auth */
router.post("/login", login);
router.post("/signup", signUp)
;
/** Self profile (full doc minus secrets) */
router.get("/profile", requireAuth, getMyProfile);

/** Compact current-user info */
router.get("/me", requireAuth, async (req: IAuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  // Keep this lightweight; no DB if you don’t need it.
  // If you want name too, you can move this into a controller and fetch once from User.
  const { user_id, email, role, gym_id } = req.user;
  return res.status(200).json({
    id: user_id,
    email: email ?? null,
    role,
    gym_id: gym_id ?? null,
  });
});

/** Trainer-only helper: list classes owned by the authenticated trainer (admins allowed) */
router.get(
  "/trainer/mine/list",
  requireAuth,
  requireRole(["trainer", "admin"]),
  getTrainerClasses
);

/** User management (admin-only for high-risk ops) */
router.post("/", requireAuth, requireRole(["admin"]), createUser);
router.get("/", requireAuth, requireRole(["admin"]), fetchAllUsers);

/** Admin: user by id */
router.get("/:id", requireAuth, requireRole(["admin"]), fetchUserById);

/** Update/delete by id (updateUser enforces admin-or-self) */
router.put("/:id", requireAuth, updateUser);
router.put("/:id/password", requireAuth, updatePassword);
router.delete("/:id", requireAuth, requireRole(["admin"]), deleteUser);



export default router;
