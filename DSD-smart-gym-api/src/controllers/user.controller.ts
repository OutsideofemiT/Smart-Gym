// src/controllers/user.controller.ts
import { Request, Response } from "express";
import { Types, MongooseError } from "mongoose";
import jwt from "jsonwebtoken";

import { User } from "../models/user.model";
import { Gym } from "../models/gym.model";
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
      password: passwordHash,     // bcrypt hash
      salt: "bcrypt",             // marker only (not used by bcrypt)
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

    // include password explicitly (select:false in model)
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

    // Prefer provided gym_id; otherwise use DEFAULT_GYM_ID from env
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

/** Me (safe) */
export const getMyProfile = async (req: IAuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  const me = await User.findById(req.user.user_id).select("-password -salt");
  if (!me) return res.status(404).json({ error: "User not found" });
  return res.json(me);
};

/** List users (admin) */
export const fetchAllUsers = async (_req: IAuthenticatedRequest, res: Response) => {
  try {
    const allUsers = await User.find(); // password/salt excluded by select:false
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

/** Update user (admin or self) — non-credential fields */
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

    const { password, salt, ...safeBody } = req.body || {};
    const updatedUser = await User.findByIdAndUpdate(id, safeBody, {
      new: true,
      runValidators: true,
    }).select("-password -salt");

    if (!updatedUser) return res.status(404).json({ error: "User not found" });
    return res.status(200).json({ updatedUser });
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
