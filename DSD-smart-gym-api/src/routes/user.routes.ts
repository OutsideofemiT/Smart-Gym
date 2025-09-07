// src/routes/user.routes.ts
import express, { Response } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import {
  createUser,
  signUp,
  deleteUser,
  fetchAllUsers,
  fetchUserById,
  login,
  updatePassword,
  updateUser,
  getMyProfile,
  uploadAvatar, // saves avatar_url on the user/profile and returns { avatar_url }
} from "../controllers/user.controller";
import { getTrainerClasses } from "../controllers/class.controller";
import { requireAuth } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";
import { IAuthenticatedRequest } from "../types/interface";

const router = express.Router();

/* ---------- Ensure upload dir exists ---------- */
const avatarDir = path.join(process.cwd(), "uploads", "avatars");
fs.mkdirSync(avatarDir, { recursive: true });

/* ---------- Multer for avatar upload ---------- */
const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, avatarDir),
  filename: (req, file, cb) => {
    const uid = (req as IAuthenticatedRequest)?.user?.user_id?.toString?.() ?? "anon";
    const ext = path.extname(file.originalname || "");
    cb(null, `u_${uid}_${Date.now()}${ext || ""}`);
  },
});

const upload = multer({
  storage: avatarStorage,
  limits: { fileSize: 4 * 1024 * 1024 }, // 4MB
  fileFilter: (_req, file, cb) => {
    // allow common image types; block everything else (including svg for safety)
    if (/^image\/(png|jpe?g|webp|gif)$/.test(file.mimetype)) return cb(null, true);
    cb(new Error("Only image files (png/jpg/jpeg/webp/gif) are allowed"));
  },
});

/* -------------------- Auth -------------------- */
router.post("/login", login);
router.post("/signup", signUp);

/* --------- Current user / profile --------- */
// Full profile doc (minus secrets)
router.get("/profile", requireAuth, getMyProfile);

// Compact info (no DB trip)
router.get("/me", requireAuth, async (req: IAuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  const { user_id, email, role, gym_id } = req.user;
  return res.status(200).json({
    id: user_id,
    email: email ?? null,
    role,
    gym_id: gym_id ?? null,
  });
});

// Avatar upload (multipart/form-data; field name: "avatar")
// Returns { avatar_url: string }
router.post("/profile/avatar", requireAuth, upload.single("avatar"), uploadAvatar);

/* ---- Trainer helper: classes for this trainer (admin ok) ---- */
router.get(
  "/trainer/mine/list",
  requireAuth,
  requireRole(["trainer", "admin"]),
  getTrainerClasses
);

/* ----------------- Admin / management ----------------- */
router.post("/", requireAuth, requireRole(["admin"]), createUser);
router.get("/", requireAuth, requireRole(["admin"]), fetchAllUsers);

// Admin: user by id
router.get("/:id", requireAuth, requireRole(["admin"]), fetchUserById);

// Update / delete by id (updateUser enforces admin-or-self)
router.put("/:id", requireAuth, updateUser);
router.put("/:id/password", requireAuth, updatePassword);
router.delete("/:id", requireAuth, requireRole(["admin"]), deleteUser);

export default router;
