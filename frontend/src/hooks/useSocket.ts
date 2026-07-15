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

    // The socket object reference never changes after connect —
    // React won't re-render on its own when .connected flips to true.
    // Force a re-render so consumers always see the live connected state.
    const onConnect = () => setSocket((s) => (s ? s : newSocket));
    const onDisconnect = () => setSocket((s) => (s ? s : null));

    newSocket.on("connect", onConnect);
    newSocket.on("disconnect", onDisconnect);

    return () => {
      newSocket.off("connect", onConnect);
      newSocket.off("disconnect", onDisconnect);
      disconnectSocket();
      setSocket(null);
    };
  }, [isAuthenticated, isLoading]);

  return socket;
}

