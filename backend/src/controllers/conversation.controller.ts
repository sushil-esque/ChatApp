import { createConversationDto } from "../dtos/conversation.dto";
import { getMessagesDto, sendMessageDto } from "../dtos/message.dto";
import { asyncHandler } from "../middlewares/asyncHandler";
import * as conversationService from "../services/conversation.service.js";
import * as messageService from "../services/message.service.js";

export const createConversation = asyncHandler(async (req, res) => {
  const parsed = createConversationDto.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload", details: parsed.error.issues });

  const conversation = await conversationService.createConversation(req.user.id, parsed.data.userId);
  res.status(201).json(conversation);
});

export const getConversations = asyncHandler(async (req, res) => {
  const conversations = await conversationService.getConversations(req.user.id);
  res.status(200).json(conversations);
});

export const sendMessage = asyncHandler(async (req, res) => {
  const parsed = sendMessageDto.safeParse(req.body);
  const conversationId = req.params.id as string;
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload", details: parsed.error.issues });
  const message = await messageService.sendMessage(conversationId, req.user.id, parsed.data.content);
  res.status(201).json(message);
});

export const getMessages = asyncHandler(async(req,res)=>{
    const parsed = getMessagesDto.safeParse(req.query)
      if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.issues })
        const messages = await messageService.getMessages(req.params.id as string,req.user.id,parsed.data.cursor)
      res.status(200).json(messages)
})
export const deleteMessage = asyncHandler(async (req, res) => {
  await messageService.deleteMessage(req.params.messageId as string, req.user.id)
  res.status(204).send()
})
