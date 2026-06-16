import { prisma } from "../db/prisma.js";
import { CustomError } from "../errors/customError.js";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt.js";
import { generateOtp, hashOtp } from "../utils/otp.js";
import bcrypt from "bcrypt";
import crypto from "crypto";

export async function sendOtp(userId: string) {
  const otp = generateOtp();
  const otpHash = await hashOtp(otp); // bcrypt hash

  // upsert — create if doesn't exist, replace if it does
  await prisma.otp.upsert({
    where: { userId },
    create: {
      userId,
      otpHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 mins from now
    },
    update: {
      otpHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // reset expiry on resend
    },
  });

  // send otp via email
  console.log(`OTP for ${userId}: ${otp}`);
}

async function createSession(userId: string, deviceName?: string, ipAddress?: string) {
  const refreshToken = generateRefreshToken(userId);
  const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
  const session = await prisma.refreshToken.create({
    data: {
      refreshTokenHash,
      userId,
      deviceName,
      ipAddress,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const accessToken = generateAccessToken(userId, session.id);

  return { accessToken, refreshTokenHash, refreshToken };
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
  const user = await prisma.user.create({
    data: { name, email, passwordHash },
  });
  await sendOtp(user.id);
  return user;
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
    prisma.user.update({ where: { id: user.id }, data: { verified: true } }),
  ]);
  const { accessToken, refreshToken } = await createSession(user.id, deviceName, ipAddress);

  return { accessToken, refreshToken, user };
}

export async function login(email: string, password: string, deviceName?: string, ipAddress?: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new CustomError("Invalid Credentials", 404);
  const hashedPassword = user.passwordHash;
  const isPasswordMatch = await bcrypt.compare(password, hashedPassword);
  if (!isPasswordMatch) throw new CustomError("Invalid Credentials", 404);
  const { accessToken, refreshToken } = await createSession(user.id, deviceName, ipAddress);
  return { accessToken, refreshToken, user };
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