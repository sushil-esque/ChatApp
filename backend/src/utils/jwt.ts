import jwt, { JwtPayload } from "jsonwebtoken";

export function generateAccessToken(userId: string, sessionId: string): string {
  return jwt.sign({  userId, sessionId }, process.env.JWT_SECRET!, { expiresIn: "15m" });
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET!, { expiresIn: "30d" });
}

interface AccessTokenPayload extends JwtPayload {
  userId: string;
  sessionId: string;
}

interface RefreshTokenPayload extends JwtPayload {
  userId: string;
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, process.env.JWT_SECRET!) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as RefreshTokenPayload;
}
