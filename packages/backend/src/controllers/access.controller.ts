// src/controllers/access.controller.ts
import { Response } from "express";
import { MongooseError, Types } from "mongoose";
import crypto from "crypto";
import { IAuthenticatedRequest } from "../types/interface";
import { CheckInOut, QRCode } from "../models/access.model";

function getAuthIds(req: IAuthenticatedRequest) {
  const uid = req.user?.user_id;
  const gid = req.user?.gym_id;
  if (!uid || !Types.ObjectId.isValid(uid)) { const e:any = new Error("Invalid user_id"); e.status = 401; throw e; }
  if (!gid || !Types.ObjectId.isValid(gid)) { const e:any = new Error("Invalid gym_id");  e.status = 401; throw e; }
  return { userId: new Types.ObjectId(uid), gymId: new Types.ObjectId(gid) };
}

/** For modal: current state (checked in or not) + since when */
export const getAccessStatus = async (req: IAuthenticatedRequest, res: Response) => {
  try {
    const { userId, gymId } = getAuthIds(req);
    const active = await CheckInOut
      .findOne({ user_id: userId, gym_id: gymId, checked_out: null })
      .select("checked_in")
      .lean();

    return res.status(200).json({
      active: !!active,
      checked_in_at: active?.checked_in ?? null,
      can_check_in: !active,
      can_check_out: !!active,
    });
  } catch (error: any) {
    if (error instanceof MongooseError) return res.status(400).json({ error: error.message });
    return res.status(error?.status ?? 500).json({ error: error?.message ?? "Internal server error" });
  }
};

/** For modal: create or reuse member’s QR (purely visual; not scanned) */
export const createQRCode = async (req: IAuthenticatedRequest, res: Response) => {
  try {
    const { userId, gymId } = getAuthIds(req);

    // Reuse active (unexpired) QR so the code stays stable for a week
    const existing = await QRCode.findOne({
      user_id: userId,
      gym_id: gymId,
      expires_at: { $gt: new Date() },
    }).select("qr_code expires_at");

    if (existing) {
      return res.status(200).json({
        success: true,
        qrCode: { qr_code: existing.qr_code, expires_at: existing.expires_at },
      });
    }

    const token = crypto.randomBytes(12).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const doc = await QRCode.create({
      user_id: userId,
      gym_id: gymId,
      qr_code: token,
      expires_at: expiresAt,
    });

    return res.status(201).json({
      success: true,
      qrCode: { qr_code: doc.qr_code, expires_at: doc.expires_at },
    });
  } catch (error: any) {
    if (error instanceof MongooseError) return res.status(400).json({ error: error.message });
    return res.status(error?.status ?? 500).json({ error: error?.message ?? "Internal server error" });
  }
};

/** Button in modal: toggle check-in / check-out */
export const handleCheckInOut = async (req: IAuthenticatedRequest, res: Response) => {
  try {
    const { userId, gymId } = getAuthIds(req);

    // If active → check out
    const active = await CheckInOut.findOne({ user_id: userId, gym_id: gymId, checked_out: null });
    if (active) {
      active.checked_out = new Date();
      await active.save();
      return res.status(200).json({ success: true, action: "check_out", message: "Checked out" });
    }

    // Otherwise check in (partial-unique index will prevent races)
    await CheckInOut.create({
      user_id: userId,
      gym_id: gymId,
      checked_in: new Date(),
      checked_out: null,
    });

    return res.status(200).json({ success: true, action: "check_in", message: "Checked in" });
  } catch (error: any) {
    if (error?.code === 11000) {
      // race: another request created the active record
      return res.status(200).json({ success: true, action: "none", message: "Already checked in" });
    }
    if (error instanceof MongooseError) return res.status(400).json({ error: error.message });
    return res.status(error?.status ?? 500).json({ error: error?.message ?? "Internal server error" });
  }
};
