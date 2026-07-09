import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { getSocket, initSocket, disconnectSocket } from "@/services/socket";
import { getAccessToken } from "@/api/client";
import type { Socket } from "socket.io-client";

export function useSocket() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const [socket, setSocket] = useState<Socket | null>(getSocket());

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      disconnectSocket();
      setSocket(null);
      return;
    }
    const token = getAccessToken();
    if (!token) return;

    const newSocket = initSocket(token);
    setSocket(newSocket);

    return () => {
      disconnectSocket();
      setSocket(null);
    };
  }, [isAuthenticated, isLoading]);

  return socket;
}
