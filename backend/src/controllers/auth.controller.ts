import type { Request, Response } from "express";
import { prisma } from "../db/prisma";
import { registerDto } from "../dtos/auth.dto";
import { asyncHandler } from "../middlewares/asyncHandler";
import { CustomError } from "../errors/customError";

export const register = asyncHandler(async (req: Request, res: Response) => {
  console.log(req.body);

  const parsed = registerDto.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid Payload", details: parsed.error.issues });
  const { email, name, password } = parsed.data;
  const isAlreadyRegistered = await prisma.user.findUnique({
    where: {
      email,
    },
  });
  if (isAlreadyRegistered) {
    throw new CustomError("User already exists", 409);
  }
  const user = await prisma.user.create({
    data: { name, email, passwordHash: password },
  });
  res.status(201).json(user);
});
