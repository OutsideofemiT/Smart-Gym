// src/connectDB.ts
import mongoose from "mongoose";

export async function connectDB() {
  const { MONGODB_URI, NODE_ENV } = process.env;

  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is missing from environment");
  }

  const isProd = NODE_ENV === "production";

  await mongoose.connect(MONGODB_URI, {
    autoIndex: NODE_ENV !== "production",
  });

  const conn = mongoose.connection;

  mongoose.connection.on("connected", () => {
    console.log("✅ MongoDB connected");
  });
  mongoose.connection.on("error", (err) => {
    console.error("❌ MongoDB connection error:", err);
  });
  mongoose.connection.on("disconnected", () => {
    console.warn("⚠️  MongoDB disconnected");
  });

  // graceful shutdown
  const close = async (signal: string) => {
    try {
      console.log(`\n${signal} received. Closing MongoDB connection…`);
      await mongoose.disconnect();
      console.log("👋 MongoDB connection closed.");
      process.exit(0);
    } catch (err) {
      console.error("Error during MongoDB disconnect:", err);
      process.exit(1);
    }
  };

  process.on("SIGINT", () => close("SIGINT"));
  process.on("SIGTERM", () => close("SIGTERM"));
}

export default connectDB;
