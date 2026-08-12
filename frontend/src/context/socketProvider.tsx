import { getAccessToken } from "@/api/client";
import { disconnectSocket, getSocket, initSocket, subscribeSocket } from "@/services/socket";
import { useAuthStore } from "@/store/authStore";
import { useEffect, useSyncExternalStore } from "react";
import { SocketContext } from "./SocketContext";

export function SocketProvider({ children }: { children: React.ReactNode }) {
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

    initSocket(token);
  }, [isAuthenticated, isLoading]);

  const socket = useSyncExternalStore(subscribeSocket, getSocket, () => null);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
}

