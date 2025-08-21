export type Point = { x: number; y: number };

export type Segment = { from: Point; to: Point };

export type Tool = "select" | "pen" | "eraser";

export type StrokeEvent = {
  segments: Segment[];
  tool: string;
  lineWidth: number;
  color?: string;
};

export type ObjectType = "image" | "latex";

export type CanvasObject = {
  id: string;
  type: ObjectType;
  src?: string;
  text?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};
