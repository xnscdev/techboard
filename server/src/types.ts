import * as Y from "yjs";

export type RoomState = {
  id: string;
  doc: Y.Doc;
  clients: Set<string>;
};
