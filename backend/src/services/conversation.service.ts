import { prisma } from "../db/prisma";
import { CustomError } from "../errors/customError";

export async function createConversation(userAId: string, userBId: string) {
  if (userAId === userBId) throw new CustomError("Cannot start conversation with yourself", 400);
  const otherUser = await prisma.user.findUnique({ where: { id: userBId } });
  if (!otherUser) throw new CustomError("User not found", 404);

  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: userAId, blockedId: userBId },
        { blockerId: userBId, blockedId: userAId },
      ],
    },
  });
  if (block) throw new CustomError("Cannot start conversation", 403);

  const [a, b] = [userAId, userBId].sort();

  const conversation = await prisma.conversation.upsert({
    where: { userAId_userBId: { userAId: a, userBId: b } },
    create: { userAId: a, userBId: b },
    update: {},
    include: {
      userA: { select: { id: true, name: true, avatarUrl: true } },
      userB: { select: { id: true, name: true, avatarUrl: true } },
    },
  });
  return conversation;
}

export async function getConversations(userId: string) {
  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [
        {
          userAId: userId,
        },
        { userBId: userId },
      ],
    },
    orderBy: { lastMessageAt: "desc" },
    include: {
      userA: { select: { id: true, name: true, avatarUrl: true } },
      userB: { select: { id: true, name: true, avatarUrl: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  return conversations;
}

export async function getConversationById(conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) throw new CustomError("Conversation not found", 404);

  // make sure user is part of this conversation
  if (conversation.userAId !== userId && conversation.userBId !== userId) {
    throw new CustomError("Unauthorized", 403);
  }

  return conversation;
}
