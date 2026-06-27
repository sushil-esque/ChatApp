import { z } from "zod";

export const searchUsersDto = z.object({
  q: z.string().min(1).max(50),
});
