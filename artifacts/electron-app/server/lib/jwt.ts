import jwt from "jsonwebtoken";

const SECRET = process.env["SESSION_SECRET"] ?? "al-hikmah-desktop-secret-2024";
const EXPIRES_IN = "7d"; // longer expiry for desktop

export interface TokenPayload {
  userId: number;
  username: string;
  name: string;
  role: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, SECRET) as TokenPayload;
}
