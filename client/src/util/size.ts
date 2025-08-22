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
    scale = Math.max(scale, maxSide / maxDim);
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
