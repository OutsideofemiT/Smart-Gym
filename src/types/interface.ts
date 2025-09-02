// src/types/interface.ts
import { Request } from "express";
import { JwtPayload } from "jsonwebtoken";

export type UserRole = "admin" | "member" | "trainer";

/** User shape you might use server-side; adjust as needed */
export interface IUser {
  _id: string;          // Mongo ObjectId string
  email: string;
  name: string;
  password: string;     // select:false in model
  salt: string;         // select:false in model
  role: UserRole;
  gym_id: string;       // ObjectId string
}

export interface IGym {
  _id: string;
  name: string;
  address: string;
  city: string;
  zipcode: string;
  phone: string;
}

/** Legacy class interfaces left as-is for now */
export interface IClass {
  _id: string;
  title: string;
  description: string;
  trainer_id: string;
  gym_id: string;
  date: Date;
  start_time: string;
  end_time: string;
  attendees: number;
  capacity: number;
}

/** What’s actually inside the JWT we issue on login */
export interface IJwtPayload extends JwtPayload {
  /** Canonical user id (Mongo ObjectId) */
  sub: string;
  email?: string;
  role?: UserRole;
  gym_id?: string;
}

/** What we attach to req.user for downstream handlers */
export interface IAuthenticatedUser {
  /** Canonical user id (Mongo ObjectId) */
  user_id: string;
  email?: string;
  role?: UserRole;
  gym_id?: string;
}

/** Express request with authenticated user attached by requireAuth */
export interface IAuthenticatedRequest extends Request {
  user?: IAuthenticatedUser;
}

/** Café types (unchanged) */
export interface CafeInventory {
  _id?: string;
  item_name: string;
  quantity: number;
  price: number;
}

export interface CafeCartItem extends CafeInventory {
  quantityOrdered: number;
}
