import type { Request, Response, NextFunction } from "express";
import { CustomError } from "../errors/customError";
import jwt from 'jsonwebtoken'
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  if (err instanceof CustomError) {
    return res.status(err.status).json({ error: err.message });
  }

  if (err instanceof jwt.TokenExpiredError) {
    res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' })
    return
  }
  
  if (err instanceof jwt.JsonWebTokenError) {
    res.status(401).json({ error: 'Invalid token', code: 'TOKEN_INVALID' })
    return
  }

  res.status(500).json({ error: err.message || "Internal Server Error" });
};
