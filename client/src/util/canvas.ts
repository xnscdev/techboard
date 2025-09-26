import type { Point, StrokeEvent } from "@/util/types.ts";

export function setupCanvas(
  canvas: HTMLCanvasElement,
  logicalWidth: number,
  logicalHeight: number,
) {
  const ctx = canvas.getContext("2d")!;
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.style.width = `${logicalWidth}px`;
  canvas.style.height = `${logicalHeight}px`;
  canvas.width = Math.floor(logicalWidth * dpr);
  canvas.height = Math.floor(logicalHeight * dpr);
  ctx.scale(dpr, dpr);
  return ctx;
}

export function drawStroke(ctx: CanvasRenderingContext2D, stroke: StrokeEvent) {
  const saveOp = ctx.globalCompositeOperation;
  if (stroke.tool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "#000";
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = stroke.color ?? "#000";
  }
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = stroke.lineWidth;

  if (stroke.startPoint && stroke.endPoint) {
    switch (stroke.tool) {
      case "rectangle":
        drawRectangle(ctx, stroke.startPoint, stroke.endPoint);
        break;
      case "circle":
        drawCircle(ctx, stroke.startPoint, stroke.endPoint);
        break;
      case "line":
        drawLine(ctx, stroke.startPoint, stroke.endPoint);
        break;
    }
  } else {
    for (const s of stroke.segments) {
      ctx.beginPath();
      ctx.moveTo(s.from.x, s.from.y);
      ctx.lineTo(s.to.x, s.to.y);
      ctx.stroke();
    }
  }
  ctx.globalCompositeOperation = saveOp;
}

export function drawRectangle(
  ctx: CanvasRenderingContext2D,
  start: Point,
  end: Point,
) {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.stroke();
}

export function drawCircle(
  ctx: CanvasRenderingContext2D,
  start: Point,
  end: Point,
) {
  const centerX = (start.x + end.x) / 2;
  const centerY = (start.y + end.y) / 2;
  const radiusX = Math.abs(end.x - start.x) / 2;
  const radiusY = Math.abs(end.y - start.y) / 2;
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
  ctx.stroke();
}

export function drawLine(
  ctx: CanvasRenderingContext2D,
  start: Point,
  end: Point,
) {
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
}

export function replay(ctx: CanvasRenderingContext2D, strokes: StrokeEvent[]) {
  for (const stroke of strokes) {
    drawStroke(ctx, stroke);
  }
}
