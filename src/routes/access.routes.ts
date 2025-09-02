// src/routes/access.routes.ts
import express from "express";
import {
  createQRCode,
  handleCheckInOut,
  getAccessStatus,   // <-- add this controller
} from "../controllers/access.controller";
import { requireAuth } from "../middleware/requireAuth";

const router = express.Router();

/** ----- New, clean endpoints (recommended) ----- */
router.get("/status", requireAuth, getAccessStatus);           
router.post("/qr/create", requireAuth, createQRCode);          
router.post("/toggle", requireAuth, handleCheckInOut);         

/** ----- Legacy aliases (keep if frontend already uses these) ----- */
router.post("/generateQRCode", requireAuth, createQRCode);     
router.post("/checkInOut", requireAuth, handleCheckInOut);     

export default router;
