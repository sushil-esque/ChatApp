import z from "zod";

export const registerDto = z.object({
  email: z.email(),
  name: z.string().min(1),
  password: z.string().min(8),
});

export const loginDto = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export const otpDto = z.object({
  email: z.email(),
  otp: z.string().length(6),
});

export const resendOtpDto = z.object({
  email: z.email(),
});
