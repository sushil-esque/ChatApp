import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../utils/jwt.js'
import { CustomError } from '../errors/customError.js'
import {prisma} from '../db/prisma.js'

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new CustomError('No token provided', 401)
  }

  const token = authHeader.split(' ')[1]  

  const decoded = verifyAccessToken(token)      

  const session = await prisma.refreshToken.findUnique({ where: { id: decoded.sessionId } })
  if (!session) throw new CustomError('Session revoked', 401)

  const user = await prisma.user.findUnique({ where: { id: decoded.userId } })
  if (!user) throw new CustomError('User not found', 401)

  req.user = user  // attach user to request
  req.session = session
  next()
}