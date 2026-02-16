import { io, Socket } from "socket.io-client";

class SocketClient {
  private static instance: SocketClient;
  public socket: Socket | null = null;

  private constructor() {
    //
  }

  public static getInstance(): SocketClient {
    if (!SocketClient.instance) {
      SocketClient.instance = new SocketClient();
    }
    return SocketClient.instance;
  }

  private pendingListeners: Array<{
    event: string;
    callback: (...args: any[]) => void;
  }> = [];

  public connect(token: string) {
    if (this.socket) return;

    // Connect to Flask backend
    // Connect to Flask backend
    // Strip /api if present in the URL
    let url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    if (url.endsWith("/api")) {
      url = url.slice(0, -4);
    }

    this.socket = io(url, {
      auth: {
        token: token,
      },
      transports: ["websocket", "polling"], // Allow polling fallback
      autoConnect: true,
      withCredentials: true,
      reconnectionAttempts: 5,
    });

    this.socket.on("connect", () => {
      console.log("Socket connected:", this.socket?.id);

      // Attach pending listeners
      this.pendingListeners.forEach(({ event, callback }) => {
        this.socket?.on(event, callback);
      });
      // Optionally clear pending listeners - but we keep them in case of strict mode re-runs or if we want to support reconnects preserving listeners?
      // Actually standard socket.io preserves listeners on reconnect.
      // But if we disconnect and reconnect manually (calling connect again), we might want them.
      // For now, let's just attach them. Since we check 'if (this.socket) return' at top of connect, we won't double-connect easily.
      // But if we use 'on' before connect, we should clear them from pending once attached?
      // The issue is if we call connect() multiple times.
      // Let's just clear pendingListeners after attaching to avoid duplicates if connect is called again (though the guard prevents it).
      this.pendingListeners = [];
    });

    this.socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    this.socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err);
    });
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  public on(event: string, callback: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    } else {
      this.pendingListeners.push({ event, callback });
    }
  }

  public off(event: string, callback?: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }

    // Also remove from pending
    this.pendingListeners = this.pendingListeners.filter(
      (l) => l.event !== event || (callback && l.callback !== callback),
    );
  }
}

export const socketClient = SocketClient.getInstance();
