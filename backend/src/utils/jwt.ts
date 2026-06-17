import jwt, { JwtPayload } from "jsonwebtoken";

interface AccessTokenPayload extends JwtPayload {
  sessionId: string;
  userId: string;
}

interface RefreshTokenPayload extends JwtPayload {
  userId: string;
}

// Validate JWT secrets at module initialization so misconfiguration fails fast
const JWT_SECRET = process.env.JWT_SECRET ?? (() => { throw new Error("Missing required JWT configuration: JWT_SECRET must be set in the environment."); })();
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? (() => { throw new Error("Missing required JWT configuration: JWT_REFRESH_SECRET must be set in the environment."); })();

export function generateAccessToken(userId: string, sessionId: string): string {
  return jwt.sign({ sessionId, userId }, JWT_SECRET, { expiresIn: "15m" });
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: "30d" });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, JWT_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, JWT_REFRESH_SECRET) as RefreshTokenPayload;
}
