import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { getSocket, initSocket, disconnectSocket } from "@/services/socket";
import { getAccessToken } from "@/api/client";

export function useSocket() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) {
      disconnectSocket()
      return
    }
    const token = getAccessToken()
    if (!token) return

    initSocket(token)

    return () => {
      disconnectSocket()
    }
  }, [isAuthenticated])

  return getSocket()
}