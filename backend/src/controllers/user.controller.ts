import { Request, Response } from "express";

import { asyncHandler } from "../middlewares/asyncHandler.js";
import { searchUsersDto, updateUserDto } from "../dtos/user.dto.js";
import { CustomError } from "../errors/customError.js";
import * as userService from "../services/user.service.js";

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.getMe(req.user.id);
  if (!user) throw new CustomError("User not found", 404);
  res.status(200).json(user);
});

export const searchUsers = asyncHandler(async (req: Request, res: Response) => {
  const parsed = searchUsersDto.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Invalid query", details: parsed.error.issues });

  const users = await userService.searchUsers(parsed.data.q, req.user.id);
  res.status(200).json(users);
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const parsed = updateUserDto.safeParse(req.body);
  if (!parsed.success) throw new CustomError("Invalid request", 400);

  await userService.updateProfile(req.user.id, parsed.data);
  res.status(200).json({ message: "Profile updated successfully" });
});
