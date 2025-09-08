// src/middleware/requireAuth.ts
import { NextFunction, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { IAuthenticatedRequest, IJwtPayload } from "../types/interface";

export const requireAuth = (req: IAuthenticatedRequest, res: Response, next: NextFunction) => {
  const JWT_SECRET = process.env.JWT_SECRET;                 // ← read per request
  if (!JWT_SECRET) {
    console.error("JWT_SECRET not set");
    return res.status(500).json({ error: "Server misconfiguration" });
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as IJwtPayload & JwtPayload;
    
    if (!decoded?.sub) return res.status(401).json({ error: "Unauthorized" });

    req.user = {
      user_id: String(decoded.sub),
      email: decoded.email,
      role: decoded.role,
      gym_id: decoded.gym_id,
    };
    next();
  } catch (err: any) {
    const isExpired = err?.name === "TokenExpiredError";
    return res.status(401).json({ error: isExpired ? "Token expired" : "Invalid token" });
  }
};
