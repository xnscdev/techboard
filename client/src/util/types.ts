export type Point = { x: number; y: number };

export type Segment = { from: Point; to: Point };

export type Tool = "select" | "pen" | "eraser";

export type StrokeEvent = {
  segments: Segment[];
  tool: string;
  lineWidth: number;
  color?: string;
};
