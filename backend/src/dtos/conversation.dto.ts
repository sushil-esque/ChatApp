import { z } from 'zod'

export const createConversationDto = z.object({
  userId: z.uuid()  
})