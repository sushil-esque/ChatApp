import { getAccessToken } from "@/api/client";
import { disconnectSocket, initSocket } from "@/services/socket";
import { useAuthStore } from "@/store/authStore";
import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import {SocketContext} from "./SocketContext";

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      disconnectSocket();
      return;
    }

    const token = getAccessToken();
    if (!token) return;

    const s = initSocket(token);

    const onConnect = () => setSocket(s);
    const onDisconnect = () => setSocket(null);

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);

    // already connected: use setTimeout to avoid synchronous setState in effect
    if (s.connected) {
      setTimeout(() => setSocket(s), 0);
    }

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      disconnectSocket();
      setTimeout(() => setSocket(null), 0);
    };
  }, [isAuthenticated, isLoading]);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
}
