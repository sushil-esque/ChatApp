import type { NextFunction, Request, Response } from "express";

import jwt from 'jsonwebtoken'

import { CustomError } from "../errors/customError";
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  if (err instanceof CustomError) {
    return res.status(err.status).json({ error: err.message });
  }

  if (err instanceof jwt.TokenExpiredError) {
    res.status(401).json({ code: 'TOKEN_EXPIRED', error: 'Token expired' })
    return
  }
  
  if (err instanceof jwt.JsonWebTokenError) {
    res.status(401).json({ code: 'TOKEN_INVALID', error: 'Invalid token' })
    return
  }

  res.status(500).json({ error: err.message || "Internal Server Error" });
};
