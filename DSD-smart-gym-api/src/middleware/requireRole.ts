import { Response, NextFunction } from "express";
import { IAuthenticatedRequest } from "../types/interface";

export const requireRole = (roles: string[] | string) => {
  return (req: IAuthenticatedRequest, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;

    if (!userRole) {
      return res.status(401).json({ error: "Unauthorized: No role found." });
    }

    const allowed = Array.isArray(roles) ? roles.includes(userRole) : userRole === roles;
    if (!allowed) {
      return res.status(403).json({ error: "Access denied." });
    }

    return next();
  };
};
