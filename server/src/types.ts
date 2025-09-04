import * as Y from "yjs";

export type Point = { x: number; y: number };

export type Segment = { from: Point; to: Point };

export type Tool = "select" | "pen" | "eraser";

export type StrokeEvent = {
  segments: Segment[];
  tool: Tool;
  lineWidth: number;
  color?: string;
};

export type RoomState = {
  id: string;
  doc: Y.Doc;
  clients: Set<string>;
};
