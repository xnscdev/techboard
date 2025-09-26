import * as Y from "yjs";

export type Point = { x: number; y: number };

export type Segment = { from: Point; to: Point };

export type Tool =
  | "select"
  | "pen"
  | "eraser"
  | "rectangle"
  | "circle"
  | "line";

export type StrokeEvent = {
  segments: Segment[];
  tool: Tool;
  lineWidth: number;
  color?: string;
  startPoint?: Point;
  endPoint?: Point;
};

export type RoomState = {
  id: string;
  doc: Y.Doc;
  clients: Set<string>;
};
