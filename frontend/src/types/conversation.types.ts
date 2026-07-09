export interface ConversationUser {
  id: string
  name: string
  avatarUrl: string | null
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  content: string
  isDeleted: boolean
  createdAt: string
  read: boolean
  sender: ConversationUser
}

export interface Conversation {
  id: string
  userAId: string
  userBId: string
  lastMessageAt: string | null
  userALastReadAt: string | null
  userBLastReadAt: string | null
  unreadCount: number
  createdAt: string
  userA: ConversationUser
  userB: ConversationUser
  messages: Message[]  // last message only, from getConversations
}