
import crypto from "crypto";

import { prisma } from "../db/prisma";
import { loginDto, otpDto, registerDto } from "../dtos/auth.dto";
import { CustomError } from "../errors/customError";
import { asyncHandler } from "../middlewares/asyncHandler";
import * as authService from "../services/auth.service";
import { generateAccessToken, verifyRefreshToken } from "../utils/jwt";

export const register = asyncHandler(async (req, res) => {
  console.log(req.body);
  const parsed = registerDto.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ details: parsed.error.issues, error: "Invalid Payload" });
  const { email, name, password } = parsed.data;
  const user = await authService.register(name, email, password);
  res.status(201).json(user);
});

export const verifyEmail = asyncHandler(async (req, res) => {
  console.log(req.body);

  const parsed = otpDto.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ details: parsed.error.issues, error: "Invalid Payload" });
  const { email, otp } = parsed.data;

  const deviceName = req.headers["user-agent"];
  const ipAddress = req.ip;

  const { accessToken, refreshToken, user } = await authService.verifyEmail(email, otp, deviceName, ipAddress);

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });

  res.status(200).json({ accessToken, message: "Email verified successfully", user });
});

export const getMe = asyncHandler(async (req, res) => {
  res.status(200).json(req.user);
});

export const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) throw new CustomError("No refresh token", 401);
  const decoded = verifyRefreshToken(refreshToken);
  const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
  const session = await prisma.refreshToken.findUnique({ where: { refreshTokenHash } });
  if (!session) throw new CustomError("Session not found", 401);

  if (session.expiresAt < new Date()) {
    await prisma.refreshToken.delete({ where: { refreshTokenHash } });
    throw new CustomError("Refresh token expired", 401);
  }

  const accessToken = generateAccessToken(decoded.userId, session.id);

  res.status(200).json({ accessToken });
});

export const login = asyncHandler(async (req, res) => {
  const parsed = loginDto.safeParse(req.body);

  if (!parsed.success) return res.status(400).json({ details: parsed.error.issues, error: "Invalid Payload" });

  const { email, password } = parsed.data;
  const deviceName = req.headers["user-agent"];
  const ipAddress = req.ip;
  const { accessToken, refreshToken, user } = await authService.login(email, password, deviceName, ipAddress);
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
  return res.status(200).json({ accessToken, message: "Login successful", user });
});

export const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  
  if (refreshToken) {
    await authService.logout(refreshToken)  
  }

  res.clearCookie('refreshToken', {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  })

  res.status(200).json({ message: 'Logged out successfully' })
})
export const logoutAll = asyncHandler(async (req, res) => {
  await authService.logoutAll(req.user.id)  // delete all sessions for user

  res.clearCookie('refreshToken', {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  })

  res.status(200).json({ message: 'Logged out from all devices' })
})