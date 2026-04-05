export type Point = { x: number; y: number };

export type Segment = { from: Point; to: Point };

export type Tool = "select" | "pen" | "eraser" | "draw-shape";

export type ShapeType =
  | "rectangle"
  | "ellipse"
  | "line"
  | "plus"
  | "triangle-up"
  | "triangle-down"
  | "triangle-left"
  | "triangle-right";

export type StrokeEvent = {
  segments: Segment[];
  tool: string;
  lineWidth: number;
  color?: string;
  startPoint?: Point;
  endPoint?: Point;
  shapeType?: ShapeType;
};

export type TextAttributes = {
  fontSize: number;
  fontFamily: string;
  color: string;
  align: "left" | "center" | "right";
};

export type ImageObject = {
  id: string;
  type: "image";
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};

export type LatexObject = {
  id: string;
  type: "latex";
  src: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};

export type TextObject = {
  id: string;
  type: "text";
  text: string;
  x: number;
  y: number;
  width: number;
  rotation: number;
} & TextAttributes;

export type TimerObject = {
  id: string;
  type: "timer";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  endTime: number | null;
  remainingMs: number;
  initialMs: number;
  running: boolean;
};

export type CanvasObject = ImageObject | LatexObject | TextObject | TimerObject;
