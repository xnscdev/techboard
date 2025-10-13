import { clamp } from "@mantine/hooks";

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
