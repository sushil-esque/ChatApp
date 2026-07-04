import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function initSocket(accessToken: string): Socket {
  if (socket?.connected) return socket;

  socket = io("http://localhost:3000", {
    auth: { token: accessToken }, // sent to server middleware
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
