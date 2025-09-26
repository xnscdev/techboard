import type { Point, Tool } from "@/util/types.ts";

export default function snap(tool: Tool, start: Point, end: Point) {
  switch (tool) {
    case "rectangle":
      return snapRectangle(start, end);
    case "ellipse":
      return snapEllipse(start, end);
    case "line":
      return snapLine(start, end);
    default:
      return end;
  }
}

function snapRectangle(start: Point, end: Point): Point {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const size = Math.max(Math.abs(deltaX), Math.abs(deltaY));
  return {
    x: start.x + (deltaX >= 0 ? size : -size),
    y: start.y + (deltaY >= 0 ? size : -size),
  };
}

function snapEllipse(start: Point, end: Point): Point {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const radius = Math.max(Math.abs(deltaX), Math.abs(deltaY)) / 2;
  return {
    x: start.x + (deltaX >= 0 ? radius * 2 : -radius * 2),
    y: start.y + (deltaY >= 0 ? radius * 2 : -radius * 2),
  };
}

function snapLine(start: Point, end: Point): Point {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const angle = Math.atan2(deltaY, deltaX);
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  const interval = Math.PI / 12;
  const snapAngle = Math.round(angle / interval) * interval;
  return {
    x: start.x + Math.cos(snapAngle) * distance,
    y: start.y + Math.sin(snapAngle) * distance,
  };
}
