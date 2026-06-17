import bcrypt from "bcrypt";
import crypto from "crypto";

import { prisma } from "../db/prisma.js";
import { CustomError } from "../errors/customError.js";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt.js";
import { generateOtp, hashOtp } from "../utils/otp.js";

export async function login(email: string, password: string, deviceName?: string, ipAddress?: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new CustomError("Invalid Credentials", 404);
  const hashedPassword = user.passwordHash;
  const isPasswordMatch = await bcrypt.compare(password, hashedPassword);
  if (!isPasswordMatch) throw new CustomError("Invalid Credentials", 404);
  if (!user.verified) throw new CustomError("Email not verified", 403);
  const { accessToken, refreshToken } = await createSession(user.id, deviceName, ipAddress);
  return { accessToken, refreshToken, user: sanitizeUser(user) };
}

export async function logout(refreshToken: string) {
  const refreshTokenHash = crypto
    .createHash('sha256')
    .update(refreshToken)
    .digest('hex')

  await prisma.refreshToken.deleteMany({ where: { refreshTokenHash } })
}

export async function logoutAll(userId: string) {
  await prisma.refreshToken.deleteMany({ where: { userId } })
}

export async function register(name: string, email: string, password: string) {
  const isAlreadyRegistered = await prisma.user.findUnique({
    where: {
      email,
    },
  });
  if (isAlreadyRegistered) {
    throw new CustomError("User already exists", 409);
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const otp = generateOtp();
  const otpHash = await hashOtp(otp);

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: { email, name, passwordHash },
    });
    await tx.otp.upsert({
      create: {
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        otpHash,
        userId: newUser.id,
      },
      update: {
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        otpHash,
      },
      where: { userId: newUser.id },
    });
    return newUser;
  });

  console.log(`OTP for ${user.id}: ${otp}`);
  return sanitizeUser(user);
}

export async function sendOtp(userId: string) {
  const otp = generateOtp();
  const otpHash = await hashOtp(otp); // bcrypt hash

  // upsert — create if doesn't exist, replace if it does
  await prisma.otp.upsert({
    create: {
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 mins from now
      otpHash,
      userId,
    },
    update: {
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // reset expiry on resend
      otpHash,
    },
    where: { userId },
  });

  // send otp via email
  console.log(`OTP for ${userId}: ${otp}`);
}

export async function verifyEmail(email: string, inputOtp: string, deviceName?: string, ipAddress?: string) {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });
  if (!user) throw new CustomError("User not found.", 404);
  const otp = await prisma.otp.findUnique({
    where: {
      userId: user.id,
    },
  });

  console.log(new Date());

  if (!otp) throw new CustomError("OTP not found", 404);

  if (otp.expiresAt < new Date()) throw new CustomError("OTP expired", 400);

  const isOptMatch = await bcrypt.compare(inputOtp, otp.otpHash);

  if (!isOptMatch) throw new CustomError("Invalid OTP", 400);

  await prisma.$transaction([
    prisma.otp.delete({ where: { userId: user.id } }),
    prisma.user.update({ data: { verified: true }, where: { id: user.id } }),
  ]);
  const { accessToken, refreshToken } = await createSession(user.id, deviceName, ipAddress);

  return { accessToken, refreshToken, user: sanitizeUser(user) };
}

async function createSession(userId: string, deviceName?: string, ipAddress?: string) {
  const refreshToken = generateRefreshToken(userId);
  const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
  const session = await prisma.refreshToken.create({
    data: {
      deviceName,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      ipAddress,
      refreshTokenHash,
      userId,
    },
  });

  const accessToken = generateAccessToken(userId, session.id);

  return { accessToken, refreshToken, refreshTokenHash };
}

// Sanitize user object to exclude sensitive fields (passwordHash)
function sanitizeUser(user: { [key: string]: unknown; passwordHash?: string }) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...sanitized } = user;
  return sanitized;
}