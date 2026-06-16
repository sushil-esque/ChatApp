import { User, RefreshToken} from '@prisma/client'

declare global {
  namespace Express {
    interface Request {
      user: User,
      session: RefreshToken
    }
  }
}