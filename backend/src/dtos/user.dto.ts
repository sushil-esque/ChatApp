import { z } from "zod";

export const searchUsersDto = z.object({
  q: z.string().min(1).max(50),
});

export const updateUserDto = z.object({
  name: z.string().optional(),
  newPassword: z.string().optional(),
  oldPassword: z.string().optional(),
});