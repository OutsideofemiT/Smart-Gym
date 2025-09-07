// src/app.ts (or server entry)
import fs from "fs";
import path from "path";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./connectDB";

import accessRoutes from "./routes/access.routes";
import userRoutes from "./routes/user.routes";
import classRoutes from "./routes/class.routes";
import cafeInventoryRoutes from "./routes/cafeInventory.routes";
import stripeRoutes from "./routes/stripe.routes";
import webhookRouter from "./routes/stripe.webhook";
import adminAnalyticsRoutes from "./routes/adminAnalytics.routes";

dotenv.config();

const app = express();

// CORS
app.use(cors({ origin: true, credentials: true }));

/** ---------- Stripe webhook must be BEFORE express.json() ---------- */
// Mount at a fixed path (e.g. /api/stripe/webhook) and keep raw body.
app.use("/api/stripe/webhook", webhookRouter);

/** ---------- JSON parser for everything else ---------- */
app.use(express.json());

// DB
connectDB();

// Ensure uploads/avatars exists before static serving
fs.mkdirSync(path.join(process.cwd(), "uploads", "avatars"), { recursive: true });



// Routes
app.get("/test", (req, res) => {
  res.json({ message: "Test route working" });
});

app.use("/api/users", userRoutes);
app.use("/api/cafe-inventory", cafeInventoryRoutes);
app.use("/api/adminAnalytics", adminAnalyticsRoutes);
app.use("/api/access", accessRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/stripe", stripeRoutes);

// Static files (avatars served under /uploads/avatars/<file>)
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// 404
app.use((req, res) => {
  console.log("404 hit:", req.originalUrl);
  res.status(404).json({ error: "Not found" });
});


// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({ error: err.message || "Server error" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  if (process.env.NODE_ENV !== "production") {
    // seed();
  }
});

export default app;
