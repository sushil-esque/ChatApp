import { prisma } from "../db/prisma";
import { CustomError } from "../errors/customError";

export async function sendMessage(conversationId: string, senderId: string, content: string) {
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation) throw new CustomError("Conversation not found", 404);

  // make sure sender is part of this conversation
  if (conversation.userAId !== senderId && conversation.userBId !== senderId) {
    throw new CustomError("Unauthorized", 403);
  }

  const recipientId = conversation.userAId === senderId ? conversation.userBId : conversation.userAId;

  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: senderId, blockedId: recipientId },
        { blockerId: recipientId, blockedId: senderId },
      ],
    },
  });
  if (block) throw new CustomError("Cannot send message", 403);

  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        content,
        conversationId,
        senderId,
      },
    }),
    prisma.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        lastMessageAt: new Date(),
      },
    }),
  ]);
  return message;
}

export async function getMessages(conversationId: string, userId: string, cursor?: string) {
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation) throw new CustomError("Conversation not found", 404);
  if (conversation.userAId !== userId && conversation.userBId !== userId) {
    throw new CustomError("Unauthorized", 403);
  } // this is to make sure the user belongs to the conversation

  const isUserA = conversation.userAId === userId;
  const recipientLastReadAt = isUserA ? conversation.userBLastReadAt : conversation.userALastReadAt;
  const [messages] = await prisma.$transaction([
    prisma.message.findMany({
      where: { conversationId, isDeleted: false },
      orderBy: { createdAt: "desc" },
      take: 30,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
      },
    }),
    ...(!cursor ? [
      prisma.conversation.update({
        where: { id: conversationId },
        data: {
          userALastReadAt: isUserA ? new Date() : undefined,
          userBLastReadAt: isUserA ? undefined : new Date(),
        },
      })
    ] : [])
  ]);

  return messages.map((message) => {
    let isReadAt = false;
    if (message.senderId === userId) {
      if (recipientLastReadAt) {
        if (recipientLastReadAt < message.createdAt) {
          isReadAt = false;
        } else {
          isReadAt = true;
        }
      } else {
        isReadAt = false;
      }
    }

    return {
      ...message,
      read: isReadAt,
    };
  });
}

export async function deleteMessage(conversationId: string, messageId: string, userId: string) {
  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message) throw new CustomError("Message not found", 404);
  if (message.conversationId !== conversationId) throw new CustomError("Message does not belong to conversation", 400);
  if (message.senderId !== userId) throw new CustomError("Unauthorized", 403);

  return prisma.message.update({
    where: { id: messageId },
    data: { isDeleted: true, content: "This message was deleted" },
  });
}
