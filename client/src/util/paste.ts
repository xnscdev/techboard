export default async function handlePaste(
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
