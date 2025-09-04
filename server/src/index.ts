import { createServer } from "http";
import express from "express";
import { Server } from "socket.io";
import { randomUUID } from "crypto";
import * as Y from "yjs";
import { RoomState } from "@/types";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

const rooms = new Map<string, RoomState>();

io.on("connection", (socket) => {
  let joinedRoom: RoomState | null = null;

  socket.on("createRoom", (callback: (roomId: string) => void) => {
    const id = randomUUID().slice(0, 8);
    const room: RoomState = {
      id,
      doc: new Y.Doc(),
      clients: new Set(),
    };
    rooms.set(id, room);
    callback(room.id);
    console.log(`createRoom: ${socket.id}: created new room ${id}`);
  });

  socket.on("joinRoom", (roomId: string, callback?: (ok: boolean) => void) => {
    const room = rooms.get(roomId);
    if (!room) {
      callback?.(false);
      console.log(`joinRoom: ${socket.id}: no such room ${roomId}`);
      return;
    }
    joinedRoom = room;
    room.clients.add(socket.id);
    socket.join(room.id);
    const update = Y.encodeStateAsUpdate(room.doc);
    socket.emit("initDoc", update);
    callback?.(true);
    console.log(`joinRoom: ${socket.id}: joined room ${roomId}`);
  });

  socket.on("updateDoc", (update: ArrayBuffer) => {
    if (!joinedRoom) {
      return;
    }
    const u8 = new Uint8Array(update);
    Y.applyUpdate(joinedRoom.doc, u8);
    socket.to(joinedRoom.id).emit("updateDoc", u8);
  });

  socket.on("disconnect", () => {
    if (!joinedRoom) {
      return;
    }
    joinedRoom.clients.delete(socket.id);
    console.log(
      `disconnect: ${socket.id}: disconnected from room ${joinedRoom.id}`,
    );
    if (joinedRoom.clients.size === 0) {
      joinedRoom.doc.destroy();
      rooms.delete(joinedRoom.id);
      console.log(`disconnect: deleted room ${joinedRoom.id}`);
    }
  });
});

const port = process.env.PORT || 5174;
httpServer.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});
