import { z } from 'zod'

export const sendMessageDto = z.object({
  content: z.string().min(1).max(2000)
})

export const getMessagesDto = z.object({
  cursor: z.uuid().optional()  // for pagination
})