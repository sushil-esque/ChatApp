import { io, Socket } from "socket.io-client";
import { getAccessToken } from "@/api/client";

let socket: Socket | null = null;

export function initSocket(accessToken: string): Socket {
  if (socket?.connected) return socket;

  // tear down existing socket before creating a new one
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io("http://localhost:3000", {
    // Use a callback so Socket.IO re-reads the token on every reconnect
    // attempt, picking up any token silently refreshed by the HTTP interceptor.
    auth: (cb) => cb({ token: getAccessToken() ?? accessToken }),
    withCredentials: true,
  });

  socket.on("connect", () => {
    console.log("Socket connected");
  });

  socket.on("connect_error", (err) => {
    console.error("Socket connection error:", err.message);
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected");
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
