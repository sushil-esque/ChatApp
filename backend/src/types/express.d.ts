import { RefreshToken, User} from '@prisma/client'

declare global {
  namespace Express {
    interface Request {
      cookies: {
        refreshToken?: string
      }
      session: RefreshToken
       user: User
    }
  }
}

export {}