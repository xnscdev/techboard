import { io, Socket } from "socket.io-client";

export type WS = {
  socket: Socket;
  createRoom: () => Promise<string>;
  joinRoom: (roomId: string) => Promise<boolean>;
  onInitDoc: (fn: (update: Uint8Array) => void) => void;
  onUpdateDoc: (fn: (update: Uint8Array) => void) => void;
  sendUpdateDoc: (update: Uint8Array) => void;
};

export function createWS(baseUrl: string): WS {
  const socket = io(baseUrl, { transports: ["websocket"] });
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
  };
}
