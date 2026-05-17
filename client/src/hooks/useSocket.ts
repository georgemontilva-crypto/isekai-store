import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/_core/hooks/useAuth";

let socketInstance: Socket | null = null;

export function useSocket(): Socket | null {
  const { isAuthenticated } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      socketInstance = null;
      return;
    }

    if (socketInstance?.connected) {
      socketRef.current = socketInstance;
      return;
    }

    const socket = io(window.location.origin, {
      transports: ["websocket", "polling"],
      withCredentials: true,
    });

    socket.on("connect_error", () => {
      // Socket.io handles reconnection automatically
    });

    socketInstance = socket;
    socketRef.current = socket;
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated && socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
    }
  }, [isAuthenticated]);

  return socketRef.current;
}
