// src/controllers/user.controller.ts
import { Request, Response } from "express";
import { Types, MongooseError } from "mongoose";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";

import { User } from "../models/user.model";
import { Gym } from "../models/gym.model";
import { MemberProfile } from "../models/memberProfile.model";
import { IAuthenticatedRequest } from "../types/interface";
import { hashPassword, comparePassword } from "../utils/passwords";

/** CREATE (admin) — create any user with a role */
export const createUser = async (req: IAuthenticatedRequest, res: Response) => {
  try {
    const { name, email: emailRaw, password, role = "member", gym_id } = req.body ?? {};
    if (!name || !emailRaw || !password || !gym_id) {
      return res.status(400).json({ error: "name, email, password, gym_id are required" });
    }
    if (!Types.ObjectId.isValid(gym_id)) {
      return res.status(400).json({ error: "Invalid gym_id" });
    }

    const email = String(emailRaw).toLowerCase().trim();

    const gym = await Gym.findById(gym_id).lean();
    if (!gym) return res.status(404).json({ error: "Gym doesn't exist" });

    const existing = await User.findOne({ email }).lean();
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const passwordHash = await hashPassword(password);

    await User.create({
      email,
      name,
      password: passwordHash,
      salt: "bcrypt",
      role,
      gym_id,
    });

    return res.status(201).json({ success: true });
  } catch (error) {
    if (error instanceof MongooseError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
};

/** LOGIN — bcrypt verify, then issue JWT */
export const login = async (req: Request, res: Response) => {
  try {
    const emailRaw = req.body?.email;
    const password = req.body?.password;
    if (!emailRaw || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const email = String(emailRaw).toLowerCase().trim();

    const user = await User.findOne({ email }).select("+password");
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await comparePassword(password, user.password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("JWT_SECRET not set at login time");
      return res.status(500).json({ error: "Server misconfiguration" });
    }

    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      gym_id: user.gym_id?.toString(),
    };

    const authToken = jwt.sign(payload, secret, { expiresIn: "7d" });

    return res.status(200).json({
      authToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        gym_id: user.gym_id?.toString(),
        name: user.name,
      },
    });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
};

/** SIGN UP — member self-serve */
export const signUp = async (req: Request, res: Response) => {
  try {
    const { name, email: emailRaw, password, gym_id: gymIdFromBody } = req.body ?? {};
    if (!name || !emailRaw || !password) {
      return res.status(400).json({ error: "Name, email, password are required." });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const email = String(emailRaw).toLowerCase().trim();

    const gym_id = gymIdFromBody || process.env.DEFAULT_GYM_ID;
    if (!gym_id || !Types.ObjectId.isValid(gym_id)) {
      return res.status(400).json({ error: "Invalid or missing gym_id." });
    }

    const gym = await Gym.findById(gym_id).lean();
    if (!gym) return res.status(404).json({ error: "Gym not found." });

    const existing = await User.findOne({ email }).lean();
    if (existing) return res.status(409).json({ error: "Email already registered." });

    const passwordHash = await hashPassword(password);

    const user = await User.create({
      email,
      name,
      password: passwordHash,
      salt: "bcrypt",
      role: "member",
      gym_id,
    });

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("JWT_SECRET not set at signup time");
      return res.status(500).json({ error: "Server misconfiguration" });
    }

    const authToken = jwt.sign(
      {
        sub: user._id.toString(),
        email: user.email,
        role: user.role,
        gym_id: user.gym_id?.toString(),
      },
      secret,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      authToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        gym_id: user.gym_id?.toString(),
        name: user.name,
      },
    });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
};

/** Me (combined user + member profile) */
export const getMyProfile = async (req: IAuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  const user = await User.findById(req.user.user_id).select("-password -salt").lean();
  if (!user) return res.status(404).json({ error: "User not found" });

  const profile = await MemberProfile.findOne({
    user_id: req.user.user_id,
    gym_id: req.user.gym_id,
    is_deleted: false,
  }).lean();

  return res.json({
    ...user,
    profile: profile || null,
  });
};

/** List users (admin) */
export const fetchAllUsers = async (_req: IAuthenticatedRequest, res: Response) => {
  try {
    const allUsers = await User.find();
    return res.status(200).json({ allUsers });
  } catch (error) {
    if (error instanceof MongooseError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json("Internal server error");
  }
};

/** Get user by :id (admin) */
export const fetchUserById = async (req: IAuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid user id" });
    }
    const user = await User.findById(id).select("-password -salt");
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.status(200).json({ user });
  } catch (error) {
    if (error instanceof MongooseError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json("Internal server error");
  }
};

/** Update user (admin or self) + sync MemberProfile when 'profile' data is provided */
export const updateUser = async (req: IAuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const isAdmin = req.user?.role === "admin";
    const isSelf = req.user?.user_id === id;
    if (!isAdmin && !isSelf) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const {
      password,
      salt,
      profile: profileBody,
      first_name,
      last_name,
      // ignore sensitive fields if sent
      role: _role,
      gym_id: _gym_id,
      ...safeUserBody
    } = req.body || {};

    // Update User (name/email etc.)
    const updatedUser = await User.findByIdAndUpdate(id, safeUserBody, {
      new: true,
      runValidators: true,
    }).select("-password -salt");

    if (!updatedUser) return res.status(404).json({ error: "User not found" });

    // Build MemberProfile update
    const setProfile: any = {};
    if (typeof first_name === "string") setProfile.first_name = first_name.trim();
    if (typeof last_name === "string") setProfile.last_name = last_name.trim();

    if (profileBody && typeof profileBody === "object") {
      if (profileBody.phone_e164) setProfile.phone_e164 = String(profileBody.phone_e164);
      if (profileBody.address) setProfile.address = profileBody.address;
      if (profileBody.avatar_url) setProfile.avatar_url = String(profileBody.avatar_url);
      if (typeof profileBody.marketing_op_in === "boolean")
        setProfile.marketing_op_in = profileBody.marketing_op_in;
      if (profileBody.communication_prefs)
        setProfile.communication_prefs = profileBody.communication_prefs;
      if (Array.isArray(profileBody.class_preferences))
        setProfile.class_preferences = profileBody.class_preferences;
      if (typeof profileBody.injury_notes === "string")
        setProfile.injury_notes = profileBody.injury_notes.trim();
      if (profileBody.home_location_id && Types.ObjectId.isValid(profileBody.home_location_id))
        setProfile.home_location_id = new Types.ObjectId(profileBody.home_location_id);
      // membership_* fields are not user-editable; ignore if present
    }

    if (Object.keys(setProfile).length > 0) {
      await MemberProfile.findOneAndUpdate(
        { user_id: new Types.ObjectId(id), gym_id: req.user?.gym_id, is_deleted: false },
        {
          $set: setProfile,
          $setOnInsert: {
            user_id: new Types.ObjectId(id),
            gym_id: req.user?.gym_id,
            membership_status: "active",
            join_date: new Date(),
          },
        },
        { new: true, upsert: true }
      );
    }

    // Return combined view
    const combinedProfile = await MemberProfile.findOne({
      user_id: updatedUser._id,
      gym_id: req.user?.gym_id,
      is_deleted: false,
    }).lean();

    return res.status(200).json({
      ...updatedUser.toObject(),
      profile: combinedProfile || null,
    });
  } catch (error) {
    if (error instanceof MongooseError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json("Internal server error");
  }
};

/** Update password (admin or self) — bcrypt re-hash */
export const updatePassword = async (req: IAuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { password } = req.body || {};
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid user id" });
    }
    const isAdmin = req.user?.role === "admin";
    const isSelf = req.user?.user_id === id;
    if (!isAdmin && !isSelf) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (!password) return res.status(400).json({ error: "Password required" });
    if (String(password).length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const user = await User.findById(id).select("+password");
    if (!user) return res.status(404).json({ error: "User not found" });

    user.password = await hashPassword(password);
    user.salt = "bcrypt";
    await user.save();

    return res.status(200).json({ success: true, message: "Password updated" });
  } catch (error) {
    if (error instanceof MongooseError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json("Internal server error");
  }
};

/** Delete (admin) */
export const deleteUser = async (req: IAuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid user id" });
    }
    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) return res.status(404).json({ error: "User not found" });
    return res.status(200).json({ success: true, message: "User successfully deleted" });
  } catch (error) {
    if (error instanceof MongooseError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json("Internal server error");
  }
};

/** Avatar upload — expects multer.single("avatar") on the route */
export const uploadAvatar = async (req: IAuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const avatar_url = `${req.protocol}://${req.get("host")}/uploads/avatars/${req.file.filename}`;

  await MemberProfile.findOneAndUpdate(
    { user_id: req.user.user_id, gym_id: req.user.gym_id, is_deleted: false },
    {
      $set: { avatar_url },
      $setOnInsert: {
        user_id: req.user.user_id,
        gym_id: req.user.gym_id,
        membership_status: "active",
        join_date: new Date(),
      },
    },
    { upsert: true, new: true }
  );

  return res.status(200).json({ avatar_url });
};

/** Delete avatar (clear avatar_url and remove file from disk if local) */
export const deleteAvatar = async (req: IAuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  try {
    const profile = await MemberProfile.findOne({
      user_id: req.user.user_id,
      gym_id: req.user.gym_id,
      is_deleted: false,
    }).lean();

    // If there's an avatar_url on the profile, attempt to delete the local file
    if (profile && profile.avatar_url) {
      let filename: string | null = null;
      try {
        const parsed = new URL(profile.avatar_url);
        filename = path.basename(parsed.pathname);
      } catch (e) {
        // fallback: naive parse
        const parts = String(profile.avatar_url).split("/");
        filename = parts[parts.length - 1] || null;
      }

      if (filename) {
        const filepath = path.join(process.cwd(), "uploads", "avatars", filename);
        try {
          if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
        } catch (err) {
          // ignore file deletion errors — clearing DB is primary
          const msg = err instanceof Error ? err.message : String(err);
          console.warn("Failed to delete avatar file:", msg);
        }
      }
    }

    // Clear avatar_url on the member profile (if exists)
    await MemberProfile.findOneAndUpdate(
      { user_id: req.user.user_id, gym_id: req.user.gym_id, is_deleted: false },
      { $unset: { avatar_url: "" } },
      { new: true }
    );

    return res.status(200).json({ avatar_url: null });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};
