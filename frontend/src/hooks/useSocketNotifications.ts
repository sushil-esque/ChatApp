import { useSocketContext } from "@/context/SocketContext";
import { useAuthStore } from "@/store/authStore";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function useSocketNotifications() {
  const socket = useSocketContext();
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const selectedConversationId = location.pathname.startsWith("/chat/")
    ? location.pathname.split("/chat/")[1]
    : undefined;
  useEffect(() => {
    if (!socket) return;

    const handleMessageReceived = (message: any) => {
      console.log(message);

      // Invalidate conversations query to keep unread badges fresh across the application
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });

      if (message.senderId === user?.id) return; // ignore own messages

      const isOnChatPage = location.pathname.startsWith("/chat");
      console.log(selectedConversationId, "selectedConversationId");
      const isCurrentConversation =
        message.conversationId === selectedConversationId;
      console.log(isOnChatPage, isCurrentConversation, "isCurrentConversation");

      if (!isOnChatPage || !isCurrentConversation) {
        const senderName = message.sender?.name || "Someone";
        const preview = message.isDeleted
          ? "This message was deleted"
          : message.content.length > 50
            ? message.content.slice(0, 50) + "..."
            : message.content;

        toast(senderName, {
          description: preview,
          action: {
            label: "View",
            onClick: () => navigate(`/chat/${message.conversationId}`),
          },
          duration: 4000,
        });
      }
    };

    socket.on("message:received", handleMessageReceived);

    return () => {
      socket.off("message:received", handleMessageReceived);
    };
  }, [socket, user?.id, location.pathname, selectedConversationId, navigate]);
}
