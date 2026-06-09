import type { Request, Response, NextFunction } from "express";
import { CustomError } from "../errors/customError";
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  if (err instanceof CustomError) {
    return res.status(err.status).json({ error: err.message });
  }
  res.status(500).json({ error: err.message || "Internal Server Error" });
};
