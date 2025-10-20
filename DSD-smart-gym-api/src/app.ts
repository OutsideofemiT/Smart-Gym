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
import membershipRoutes from "./routes/membership.routes";

dotenv.config();

const app = express();

// Explicit CORS origins
const allowedOrigins = [
  "https://smart-gym-jxxx.onrender.com",
  "http://localhost:3000" // for local dev/testing
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg =
          "The CORS policy for this site does not allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use("/api/stripe/webhook", webhookRouter);

app.use(express.json());

connectDB();

fs.mkdirSync(path.join(process.cwd(), "uploads", "avatars"), { recursive: true });

app.get("/test", (_req, res) => {
  res.json({ message: "Test route working" });
});

app.use("/api/users", userRoutes);
app.use("/api/cafe-inventory", cafeInventoryRoutes);
app.use("/api/adminAnalytics", adminAnalyticsRoutes);
app.use("/api/access", accessRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/stripe", stripeRoutes);
app.use("/api/membership", membershipRoutes);

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

const clientBuildPath = path.join(process.cwd(), "public");
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));

  // Serve index.html for non-API routes using middleware (avoid path-to-regexp wildcard parsing)
  app.use((req, res, next) => {
    const p = req.path || "";
    if (p.startsWith("/api") || p.startsWith("/uploads") || p.startsWith("/stripe")) {
      return next();
    }
    res.sendFile(path.join(clientBuildPath, "index.html"));
  });
}

// Compatibility redirect: if frontend is hosted separately (not copied into backend/public),
// redirect client-side route requests to the frontend host so they resolve there instead of returning 404.
// Uses CLIENT_URL environment variable (set to your frontend URL in production).
app.get(["/member/*", "/nonmember/*"], (req, res) => {
  const client = process.env.CLIENT_URL || "https://smart-gym-jxxx.onrender.com";
  // Preserve the path and query when redirecting to the frontend host
  const dest = `${client}${req.originalUrl}`;
  return res.redirect(302, dest);
});

app.use((_req, res) => {
  console.log("404 hit:", _req.originalUrl);
  res.status(404).json({ error: "Not found" });
});

app.use(
  (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(err.status || 500).json({ error: err.message || "Server error" });
  }
);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

export default app;
