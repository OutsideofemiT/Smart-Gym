// src/utils/passwords.ts
import bcrypt from "bcrypt";

const DEFAULT_ROUNDS = 12;
const parsed = Number.parseInt(process.env.BCRYPT_ROUNDS ?? "", 10);
export const BCRYPT_ROUNDS =
  Number.isFinite(parsed) && parsed >= 10 && parsed <= 14 ? parsed : DEFAULT_ROUNDS;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS); // generates salt internally
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
