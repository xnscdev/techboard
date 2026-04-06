import type { CanvasObject } from "@/util/types.ts";

export const OBJECT_MIME_TYPE = "web application/x-techboard-object+json";

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable ||
    target.closest("input, textarea, [contenteditable='true']") !== null
  );
}

export async function handleClipboardEvent(
  e: ClipboardEvent,
  addImage: (file: File) => void,
  pasteText: (text: string) => void,
) {
  const target = e.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }
  if (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable ||
    target.closest("[contenteditable='true']") ||
    target.closest("input") ||
    target.closest("textarea")
  ) {
    return;
  }
  if (!e.clipboardData) {
    return;
  }
  const items = Array.from(e.clipboardData.items);
  const image = items.find((item) => item.type.startsWith("image/"));
  if (image) {
    const file = image.getAsFile();
    if (file) {
      e.preventDefault();
      addImage(file);
      return;
    }
  }
  if (e.clipboardData.types.includes("text/plain")) {
    const content = e.clipboardData.getData("text/plain").trim();
    const limit = 5000;
    const text = content.length > limit ? content.slice(0, limit) : content;
    if (text) {
      e.preventDefault();
      pasteText(text);
    }
  }
}

export async function handleClipboardRead(
  addObject: (data: Omit<CanvasObject, "id">) => void,
  addImage: (file: File) => void,
  pasteText: (text: string) => void,
) {
  const items = await navigator.clipboard.read().catch(() => null);
  if (!items) {
    return;
  }
  for (const item of items) {
    if (item.types.includes(OBJECT_MIME_TYPE)) {
      const blob = await item.getType(OBJECT_MIME_TYPE);
      const data = JSON.parse(await blob.text()) as Omit<CanvasObject, "id">;
      addObject(data);
      return;
    }
  }
  for (const item of items) {
    const imageType = item.types.find((t) => t.startsWith("image/"));
    if (imageType) {
      const blob = await item.getType(imageType);
      const file = new File([blob], "pasted", { type: imageType });
      addImage(file);
      return;
    }
  }
  for (const item of items) {
    if (item.types.includes("text/plain")) {
      const blob = await item.getType("text/plain");
      const raw = (await blob.text()).trim();
      const text = raw.length > 5000 ? raw.slice(0, 5000) : raw;
      if (text) {
        pasteText(text);
      }
      return;
    }
  }
}
