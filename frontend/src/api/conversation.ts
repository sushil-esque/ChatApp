import api from "./client";
import type { Conversation, Message } from "../types/conversation.types";

export const conversationApi = {
  getConversations: () => api.get<Conversation[]>("/conversations"),

  createConversation: (userId: string) =>
    api.post<Conversation>("/conversations", { userId }),

  getMessages: (conversationId: string, cursor?: string) =>
    api.get<Message[]>(`/conversations/${conversationId}/messages`, {
      params: cursor ? { cursor } : {},
    }),

  sendMessage: (conversationId: string, content: string) =>
    api.post<Message>(`/conversations/${conversationId}/messages`, { content }),

  deleteMessage: (conversationId: string, messageId: string) =>
    api.delete(`/conversations/${conversationId}/messages/${messageId}`),
};
