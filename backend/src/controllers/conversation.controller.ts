import { createConversationDto } from "../dtos/conversation.dto.js";
import { getMessagesDto, sendMessageDto, paramsConversationDto, paramsMessageIdDto } from "../dtos/message.dto.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
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
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload", details: parsed.error.issues });
  const paramsParsed = paramsConversationDto.safeParse(req.params);
  if (!paramsParsed.success) return res.status(400).json({ error: "Invalid conversation id", details: paramsParsed.error.issues });
  const conversationId = paramsParsed.data.id;
  const message = await messageService.sendMessage(conversationId, req.user.id, parsed.data.content);
  res.status(201).json(message);
});

export const getMessages = asyncHandler(async (req, res) => {
  const parsed = getMessagesDto.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload", details: parsed.error.issues });
  const paramsParsed = paramsConversationDto.safeParse(req.params);
  if (!paramsParsed.success) return res.status(400).json({ error: "Invalid conversation id", details: paramsParsed.error.issues });
  const messages = await messageService.getMessages(paramsParsed.data.id, req.user.id, parsed.data.cursor);
  res.status(200).json(messages);
});
export const deleteMessage = asyncHandler(async (req, res) => {
  const paramsParsed = paramsMessageIdDto.safeParse(req.params);
  if (!paramsParsed.success) return res.status(400).json({ error: "Invalid message id", details: paramsParsed.error.issues });
  const convParamsParsed = paramsConversationDto.safeParse(req.params);
  if (!convParamsParsed.success) return res.status(400).json({ error: "Invalid conversation id", details: convParamsParsed.error.issues });
  const deletedMessage = await messageService.deleteMessage(convParamsParsed.data.id, paramsParsed.data.messageId, req.user.id);
  res.status(200).json(deletedMessage);
});
