import type { Point } from "@/util/types.ts";

export type PlacerOptions = {
  initialX: number;
  initialY: number;
  maxX: number;
  maxY: number;
  stepX: number;
  stepY: number;
  offsetX: number;
  offsetY: number;
};

export default function getPlacer({
  initialX = 60,
  initialY = 60,
  maxX = 400,
  maxY = 360,
  stepX = 30,
  stepY = 30,
  offsetX = 40,
  offsetY = 7,
}: Partial<PlacerOptions> = {}) {
  let baseX = initialX;
  let baseY = initialY;
  let x = initialX;
  let y = initialY;
  return (): Point => {
    let nextX = x + stepX;
    let nextY = y + stepY;
    if (nextY > maxY) {
      baseX += offsetX;
      baseY += offsetY;
      nextX = baseX;
      nextY = baseY;
    }
    if (nextX > maxX) {
      baseX = initialX;
      baseY = initialY;
      nextX = baseX;
      nextY = initialY;
    }
    const ret = { x, y };
    x = nextX;
    y = nextY;
    return ret;
  };
}
