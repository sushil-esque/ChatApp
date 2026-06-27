import { NextFunction, Request, Response } from 'express'

import {prisma} from '../db/prisma.js'
import { CustomError } from '../errors/customError.js'
import { verifyAccessToken } from '../utils/jwt.js'

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    throw new CustomError('No token provided', 401, 'TOKEN_MISSING')
  }

  const token = authHeader.split(' ')[1]  

  const decoded = verifyAccessToken(token)      

  const session = await prisma.refreshToken.findUnique({ where: { id: decoded.sessionId } })
  if (!session) throw new CustomError('Session revoked', 401, 'TOKEN_INVALID')

    if (session.expiresAt < new Date()) {
        await prisma.refreshToken.delete({ where: { id: session.id } })
        throw new CustomError('Session expired', 401, 'TOKEN_EXPIRED')
      }

  const user = await prisma.user.findUnique({ where: { id: decoded.userId } })
  if (!user) throw new CustomError('User not found', 404, 'USER_NOT_FOUND')

  req.user = user  // attach user to request
  req.session = session
  next()
}