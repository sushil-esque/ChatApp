  import { io, Socket } from "socket.io-client";
  import { BASE_URL, getAccessToken } from "@/api/client";

  let socket: Socket | null = null;
  const listeners = new Set<() => void>();

  function notify() {
    listeners.forEach((listener) => listener());
  }

  export function subscribeSocket(onChange: () => void) {
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
    };
  }

  export function initSocket(accessToken: string): Socket {
    if (socket?.connected) return socket;

    // tear down existing socket before creating a new one
    if (socket) {
      socket.disconnect();
      socket = null;
    }

    // Strip /api suffix from BASE_URL for socket connection, so Socket.IO connects to root namespace '/'
    const socketUrl = BASE_URL.replace(/\/api\/?$/, "");

    socket = io(socketUrl, {
      // Use a callback so Socket.IO re-reads the token on every reconnect
      // attempt, picking up any token silently refreshed by the HTTP interceptor.
      auth: (cb) => cb({ token: getAccessToken() ?? accessToken }),
      withCredentials: true,
    });

    notify();

    socket.on("connect", () => {
      console.log("Socket connected");
      notify();
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
      notify();
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
      notify();
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
      notify();
    }
  }

