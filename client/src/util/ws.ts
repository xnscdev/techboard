import { io, Socket } from "socket.io-client";

export type WS = {
  socket: Socket;
  createRoom: () => Promise<string>;
  joinRoom: (roomId: string) => Promise<boolean>;
  onInitDoc: (fn: (update: Uint8Array) => void) => void;
  onUpdateDoc: (fn: (update: Uint8Array) => void) => void;
  sendUpdateDoc: (update: Uint8Array) => void;
  onUserCount: (fn: (count: number) => void) => void;
  onDisconnect: (fn: () => void) => void;
  onReconnect: (fn: () => void) => void;
  onConnectError: (fn: (error: Error) => void) => void;
};

export function createWS(baseUrl: string): WS {
  const socket = io(baseUrl, {
    transports: ["websocket"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
    timeout: 20000,
  });
  return {
    socket,
    createRoom: () =>
      new Promise((res) =>
        socket.emit("createRoom", (roomId: string) => res(roomId)),
      ),
    joinRoom: (roomId: string) =>
      new Promise((res) =>
        socket.emit("joinRoom", roomId, (ok: boolean) => res(ok)),
      ),
    onInitDoc: (fn) =>
      socket.on("initDoc", (u: ArrayBuffer | Uint8Array) =>
        fn(u instanceof Uint8Array ? u : new Uint8Array(u)),
      ),
    onUpdateDoc: (fn) =>
      socket.on("updateDoc", (u: ArrayBuffer | Uint8Array) =>
        fn(u instanceof Uint8Array ? u : new Uint8Array(u)),
      ),
    sendUpdateDoc: (update) => socket.emit("updateDoc", update),
    onUserCount: (fn) => socket.on("userCount", fn),
    onDisconnect: (fn) => socket.on("disconnect", fn),
    onReconnect: (fn) => socket.on("reconnect", fn),
    onConnectError: (fn) => socket.on("connect_error", fn),
  };
}
