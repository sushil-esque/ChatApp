import { Server } from "socket.io";
import { Server as httpServer } from "http";
import { verifyAccessToken } from "./utils/jwt";
import { prisma } from "./db/prisma";

export function initSocket(httpServer: httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:5173",
      credentials: true,
    },
  });

  io.use((socket, next) => {
    void (async () => {
      try {
        const token = socket.handshake.auth.token as string;
        if (!token) {
          next(new Error("No token provided"));
          return;
        }

        const decoded = verifyAccessToken(token);

        const session = await prisma.refreshToken.findUnique({
          where: { id: decoded.sessionId },
        });
        if (!session) {
          next(new Error("Session revoked"));
          return;
        }

        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!user) {
          next(new Error("User not found"));
          return;
        }

        //attach user to socket
        socket.data.user = user;
        next();
      } catch {
        next(new Error("Invalid token"));
      }
    })();
  });

  io.on("connection", (socket) => {
    const user = socket.data.user as { id: string; name: string };
    console.log(`User connected: ${user.name}`);

    // join user to their own room so we can send them direct messages
    void socket.join(user.id);

    //join a conversation room
    socket.on("join:conversation", async (conversationId: string) => {
      try {
        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
        });

        if (!conversation) {
          socket.emit("join:error", { error: "Conversation not found" });
          return;
        }
        if (conversation.userAId !== user.id && conversation.userBId !== user.id) {
          socket.emit("join:error", { error: "Unauthorized" });
          return;
        }

        console.log(`user ${user.name} joined conversation room ${conversationId}`);
        await socket.join(conversationId);
      } catch (err) {
        console.error("Error joining conversation room:", err);
        socket.emit("join:error", { error: "Failed to join conversation" });
      }
    });

    // leave a conversation room
    socket.on("leave:conversation", (conversationId: string) => {
      console.log(`user ${user.name} left conversation room ${conversationId}`);
      void socket.leave(conversationId);
    });

    socket.on("message:send", async (data: { conversationId: string; content: string }) => {
      try {
        const { conversationId, content } = data;

        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
        });

        if (!conversation) {
          socket.emit("message:error", { error: "Conversation not found" });
          return;
        }
        if (conversation.userAId !== user.id && conversation.userBId !== user.id) {
          socket.emit("message:error", { error: "Unauthorized" });
          return;
        }
        const recipientId = conversation.userAId === user.id ? conversation.userBId : conversation.userAId;
        // check block
        const block = await prisma.block.findFirst({
          where: {
            OR: [
              { blockerId: user.id, blockedId: recipientId },
              { blockerId: recipientId, blockedId: user.id },
            ],
          },
        });
        if (block) {
          socket.emit("message:error", { error: "You are blocked" });
          return;
        }
        if(!content || content.trim() === '') {
      socket.emit('message:error', { error: 'Message is required' })
      return
    }
        // save message to db
        const [message] = await prisma.$transaction([
          prisma.message.create({
            data: { conversationId, senderId: user.id, content },
            include: {
              sender: { select: { id: true, name: true, avatarUrl: true } },
            },
          }),
          prisma.conversation.update({
            where: { id: conversationId },
            data: { lastMessageAt: new Date() },
          }),
        ]);

        // Emit to the conversation room AND the recipient's personal room.
        // Chaining .to().to() makes socket.io send only ONCE per socket even if
        // that socket is in both rooms (avoids duplicates for active participants).
        io.to(conversationId).to(recipientId).emit("message:received", message);
      } catch (error) {
        console.error("error sending message:", error);
        socket.emit("message:error", { error: "Failed to send message" });
      }
    });

    // mark messages as read
    socket.on("messages:read", async (data: { conversationId: string }) => {
      try {
        const { conversationId } = data;

        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
        });
        if (!conversation) return;
        if (conversation.userAId !== user.id && conversation.userBId !== user.id) return;

        const isUserA = conversation.userAId === user.id;

        // update lastReadAt in db
        await prisma.conversation.update({
          where: { id: conversationId },
          data: {
            userALastReadAt: isUserA ? new Date() : undefined,
            userBLastReadAt: isUserA ? undefined : new Date(),
          },
        });

        // tell the other user that messages were read
        const recipientId = isUserA ? conversation.userBId : conversation.userAId;

        io.to(recipientId).emit("messages:seen", {
          conversationId,
          seenBy: user.id,
          seenAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error("Error marking messages as read:", err);
      }
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${user.name}`);
    });
  });

  return io;
}
