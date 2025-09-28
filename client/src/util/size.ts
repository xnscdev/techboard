import { clamp } from "@mantine/hooks";

export function scaleSize(
  width: number,
  height: number,
  minSide?: number,
  maxSide?: number,
) {
  width = Math.max(1, Math.round(width));
  height = Math.max(1, Math.round(height));
  const minDim = Math.min(width, height);
  const maxDim = Math.max(width, height);
  let scale = 1;
  if (minSide && minDim < minSide) {
    scale = minSide / minDim;
  }
  if (maxSide && scale > maxSide / maxDim) {
    scale = maxSide / maxDim;
  }
  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));
  return { width, height };
}

export function scaleImage(
  el: HTMLImageElement,
  minSide?: number,
  maxSide?: number,
) {
  return scaleSize(el.naturalWidth, el.naturalHeight, minSide, maxSide);
}

export function scaleResize(width: number, height: number, min?: number) {
  width = Math.round(width);
  height = Math.round(height);
  if (min) {
    width = Math.max(min, width);
    height = Math.max(min, height);
  }
  return { width, height };
}

export function toClampedNumber(
  value: string | number,
  min: number,
  max: number,
) {
  if (typeof value === "string") {
    const n = Number(value);
    if (isNaN(n)) {
      return min;
    }
    return clamp(n, min, max);
  }
  return clamp(value, min, max);
}
