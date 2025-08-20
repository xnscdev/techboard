import type { StrokeEvent } from "@/util/types.ts";

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
  for (const s of stroke.segments) {
    ctx.beginPath();
    ctx.moveTo(s.from.x, s.from.y);
    ctx.lineTo(s.to.x, s.to.y);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = saveOp;
}

export function replay(ctx: CanvasRenderingContext2D, strokes: StrokeEvent[]) {
  for (const stroke of strokes) {
    drawStroke(ctx, stroke);
  }
}
