export type Point = { x: number; y: number };

export type Segment = { from: Point; to: Point };

export type Tool = "select" | "pen" | "eraser";

export type StrokeEvent = {
  segments: Segment[];
  tool: string;
  lineWidth: number;
  color?: string;
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
  fontSize: number;
  fontFamily: string;
  color: string;
  align: "left" | "center" | "right";
};

export type CanvasObject = ImageObject | LatexObject | TextObject;
