import { prisma } from "../db/prisma.js";
import { CustomError } from "../errors/customError.js";
import { getIo } from "../socket.js";

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
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
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
  const io = getIo();
  if (io) {
    const recipientId = conversation.userAId === senderId ? conversation.userBId : conversation.userAId;
    io.to(conversationId).to(recipientId).emit("message:received", message);
  }
  return message;
}

function normalizeMessageForClient(
  message: {
    senderId: string;
    createdAt: Date;
    sender?: { id: string; name: string; avatarUrl: string | null } | null;
  },
  userId: string,
  recipientLastReadAt: Date | null | undefined,
) {
  let isReadAt = false;
  if (message.senderId === userId) {
    if (recipientLastReadAt) {
      isReadAt = recipientLastReadAt >= message.createdAt;
    }
  }

  return {
    ...message,
    read: isReadAt,
  };
}

export async function getMessages(conversationId: string, userId: string, cursor?: string) {
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation) throw new CustomError("Conversation not found", 404);
  if (conversation.userAId !== userId && conversation.userBId !== userId) {
    throw new CustomError("Unauthorized", 403);
  } // this is to make sure the user belongs to the conversation

  const isUserA = conversation.userAId === userId;
  const recipientLastReadAt = isUserA ? conversation.userBLastReadAt : conversation.userALastReadAt;

  // Run findMany directly — no transaction needed for a read-only query.
  // Wrapping reads in $transaction holds a dedicated DB connection for the full
  // query duration, which exhausts the pool under concurrent load.
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: 30,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    include: {
      sender: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  // Mark conversation as read on first page load (fire-and-forget, non-blocking).
  if (!cursor) {
    void prisma.conversation
      .update({
        where: { id: conversationId },
        data: {
          userALastReadAt: isUserA ? new Date() : undefined,
          userBLastReadAt: isUserA ? undefined : new Date(),
        },
      })
      .catch((err: unknown) => {
        console.error("Error marking conversation as read:", err);
      });
  }

  return messages.map((message: any) => normalizeMessageForClient(message, userId, recipientLastReadAt));
}

export async function deleteMessage(conversationId: string, messageId: string, userId: string) {
  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message) throw new CustomError("Message not found", 404);
  if (message.conversationId !== conversationId) throw new CustomError("Message does not belong to conversation", 400);
  if (message.senderId !== userId) throw new CustomError("Unauthorized", 403);

  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation) throw new CustomError("Conversation not found", 404);

  const recipientLastReadAt = conversation.userAId === userId ? conversation.userBLastReadAt : conversation.userALastReadAt;

  const deletedMessage = await prisma.message.update({
    where: { id: messageId },
    data: { isDeleted: true, content: "This message was deleted" },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
    },
  });

  const normalizedDeletedMessage = normalizeMessageForClient(deletedMessage, userId, recipientLastReadAt);

  const io = getIo();
  if (io) {
    const recipientId = conversation.userAId === userId ? conversation.userBId : conversation.userAId;
    io.to(conversationId).to(recipientId).emit("message:deleted", normalizedDeletedMessage);
  }
  return normalizedDeletedMessage;
}
