import { useNavigate, useParams } from "react-router-dom";
import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActionIcon,
  Box,
  Button,
  ColorInput,
  CopyButton,
  Divider,
  Group,
  NumberInput,
  ScrollArea,
  Select,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  IconAlignCenter,
  IconAlignLeft,
  IconAlignRight,
  IconCheck,
  IconCopy,
  IconEraser,
  IconInputX,
  IconMathFunction,
  IconPencil,
  IconPencilX,
  IconPhotoPlus,
  IconPointer,
  IconRulerMeasure,
  IconStackBack,
  IconStackBackward,
  IconStackForward,
  IconStackFront,
  IconTextSize,
  IconTrashX,
  IconTypeface,
  IconTypography,
} from "@tabler/icons-react";
import * as Y from "yjs";
import { clamp, useDebouncedCallback, useDisclosure } from "@mantine/hooks";
import { createWS, type WS } from "@/util/ws.ts";
import type {
  CanvasObject,
  Point,
  Segment,
  StrokeEvent,
  TextAttributes,
  Tool,
} from "@/util/types.ts";
import { drawStroke, replay, setupCanvas } from "@/util/canvas.ts";
import ObjectLayer, {
  type ObjectLayerHandle,
} from "@/components/ObjectLayer.tsx";
import EditEquationModal from "@/components/EditEquationModal.tsx";

const wsUrl: string = import.meta.env.VITE_WS_URL ?? "http://localhost:5174";
const boardWidth = 2400;
const boardHeight = 1600;

const colorSwatches = [
  "#000000",
  "#868e96",
  "#fa5252",
  "#e64980",
  "#be4bdb",
  "#7950f2",
  "#4c6ef5",
  "#228be6",
  "#15aabf",
  "#12b886",
  "#40c057",
  "#82c91e",
  "#fab005",
  "#fd7e14",
];

function toClampedNumber(value: string | number, min: number, max: number) {
  if (typeof value === "string") {
    const n = Number(value);
    if (isNaN(n)) {
      return min;
    }
    return clamp(n, min, max);
  }
  return clamp(value, min, max);
}

export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  const [wsReady, setWsReady] = useState(false);
  const wsRef = useRef<WS | null>(null);

  const docRef = useRef<Y.Doc | null>(null);
  const objectsRef = useRef<Y.Map<Y.Map<unknown>> | null>(null);
  const orderRef = useRef<Y.Array<string> | null>(null);

  const drawingRef = useRef(false);
  const lastPosRef = useRef<Point | null>(null);
  const pendingSegmentsRef = useRef<Segment[]>([]);
  const flushTimerRef = useRef<number | null>(null);
  const [tool, setTool] = useState<Tool>("select");

  const [penColor, setPenColor] = useState<string>("#000000");
  const [lineWidth, setLineWidth] = useState<number>(2);

  const [fontFamily, setFontFamily] = useState<string>("Arial");
  const [fontSize, setFontSize] = useState<number>(20);
  const [textColor, setTextColor] = useState<string>("#000000");
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">(
    "center",
  );

  const objectLayerRef = useRef<ObjectLayerHandle | null>(null);
  const [selectedObject, setSelectedObject] = useState<CanvasObject | null>(
    null,
  );
  const [showDragOverlay, setShowDragOverlay] = useState(false);

  const [latexModalOpened, { open: latexModalOpen, close: latexModalClose }] =
    useDisclosure(false);
  const [latexInitial, setLatexInitial] = useState<string>("");
  const [editingLatexId, setEditingLatexId] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    ctxRef.current = setupCanvas(canvas, boardWidth, boardHeight);
  }, []);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    const ws = createWS(wsUrl);
    wsRef.current = ws;

    const clearCanvas = (
      ctx: CanvasRenderingContext2D,
      canvas: HTMLCanvasElement,
    ) => {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    };

    const onInit = (strokes: StrokeEvent[]) => {
      if (!ctxRef.current) {
        return;
      }
      const canvas = canvasRef.current!;
      const ctx = ctxRef.current!;
      clearCanvas(ctx, canvas);
      replay(ctx, strokes);
    };

    const onDraw = (stroke: StrokeEvent) => {
      if (!ctxRef.current) {
        return;
      }
      drawStroke(ctxRef.current, stroke);
    };

    const onClearDrawings = () => {
      if (!ctxRef.current) {
        return;
      }
      const canvas = canvasRef.current!;
      const ctx = ctxRef.current!;
      clearCanvas(ctx, canvas);
    };

    const doc = new Y.Doc();
    docRef.current = doc;
    objectsRef.current = doc.getMap("objects");
    orderRef.current = doc.getArray("order");

    const onLocalUpdateDoc = (update: Uint8Array, origin: unknown) => {
      if (origin === "remote") {
        return;
      }
      wsRef.current?.sendUpdateDoc(update);
    };
    doc.on("update", onLocalUpdateDoc);

    ws.onInitCanvas(onInit);
    ws.onDraw(onDraw);
    ws.onClearDrawings(onClearDrawings);
    ws.onInitDoc((u) => Y.applyUpdate(doc, u, "remote"));
    ws.onUpdateDoc((u) => Y.applyUpdate(doc, u, "remote"));

    (async () => {
      const ok = await ws.joinRoom(roomId);
      if (!ok) {
        navigate("/");
        return;
      }
      setWsReady(true);
    })();

    return () => {
      ws.socket.removeListener("initCanvas", onInit);
      ws.socket.removeListener("draw", onDraw);
      ws.socket.removeAllListeners("clearDrawings");
      ws.socket.removeAllListeners("initDoc");
      ws.socket.removeAllListeners("updateDoc");
      docRef.current?.off("update", onLocalUpdateDoc);
      docRef.current?.destroy();
      docRef.current = null;
      objectsRef.current = null;
      orderRef.current = null;
      setWsReady(false);
      ws.socket.disconnect();
      wsRef.current = null;
    };
  }, [roomId, navigate]);

  useEffect(() => {
    if (tool !== "select") {
      objectLayerRef.current?.clearSelection();
    }
  }, [tool]);

  useEffect(() => {
    if (selectedObject?.type === "text") {
      setFontFamily(selectedObject.fontFamily);
      setFontSize(selectedObject.fontSize);
      setTextColor(selectedObject.color);
      setTextAlign(selectedObject.align);
    }
  }, [selectedObject]);

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
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
          objectLayerRef.current?.addImage(file);
          setTool("select");
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
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  });

  const flush = () => {
    const segs = pendingSegmentsRef.current;
    pendingSegmentsRef.current = [];
    if (segs.length && wsReady) {
      const payload: StrokeEvent = {
        segments: segs,
        tool,
        lineWidth,
        color: penColor,
      };
      wsRef.current?.sendDraw(payload);
    }
  };

  const scheduleFlush = () => {
    if (flushTimerRef.current !== null) {
      return;
    }
    flushTimerRef.current = window.setTimeout(() => {
      flushTimerRef.current = null;
      flush();
    }, 20);
  };

  const getPos = (e: PointerEvent): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!ctxRef.current || tool === "select") {
      return;
    }
    canvasRef.current!.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastPosRef.current = getPos(e.nativeEvent);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !ctxRef.current || tool === "select") {
      return;
    }
    const curr = getPos(e.nativeEvent);
    const prev = lastPosRef.current!;
    const seg: Segment = { from: prev, to: curr };
    drawStroke(ctxRef.current, {
      segments: [seg],
      tool,
      lineWidth,
      color: penColor,
    });
    pendingSegmentsRef.current.push(seg);
    scheduleFlush();
    lastPosRef.current = curr;
  };

  const onPointerUp = () => {
    if (!drawingRef.current || tool === "select") {
      return;
    }
    drawingRef.current = false;
    lastPosRef.current = null;
    if (pendingSegmentsRef.current.length && wsReady) {
      wsRef.current?.sendDraw({
        segments: pendingSegmentsRef.current,
        tool,
        lineWidth,
        color: penColor,
      });
      pendingSegmentsRef.current = [];
    }
  };

  const updateTextAttributes = (attr: Partial<TextAttributes>) => {
    if (selectedObject) {
      objectLayerRef.current?.updateText(selectedObject.id, attr);
    }
  };

  const updateTextAttributesDebounced = useDebouncedCallback(
    updateTextAttributes,
    200,
  );

  const pasteText = useDebouncedCallback((text: string) => {
    objectLayerRef.current?.addText(text, {
      fontFamily,
      fontSize,
      color: textColor,
      align: textAlign,
    });
    setTool("select");
  }, 300);

  return (
    <Stack p="md" gap="md" h="100vh">
      <Group justify="space-between" wrap="nowrap">
        <Group gap="xs">
          <Title order={3} m={0}>
            Room: {roomId}
          </Title>
          <Text size="sm" c="dimmed">
            Invite Link: {window.location.origin}/room/{roomId}
          </Text>
          <CopyButton
            value={`${window.location.origin}/room/${roomId}`}
            timeout={2000}
          >
            {({ copied, copy }) => (
              <Tooltip
                label={copied ? "Copied" : "Copy"}
                withArrow
                position="right"
              >
                <ActionIcon
                  color={copied ? "teal" : "gray"}
                  variant="default"
                  onClick={copy}
                >
                  {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                </ActionIcon>
              </Tooltip>
            )}
          </CopyButton>
        </Group>
        <Button variant="light" onClick={() => navigate("/")}>
          Leave
        </Button>
      </Group>
      <Box bd="1px solid #eee" bdrs={8} bg="#fafafa">
        <ScrollArea type="auto" scrollHideDelay={0} p={10}>
          <Group gap="xs" wrap="nowrap">
            <ActionIcon.Group>
              <Tooltip label="Select" openDelay={300}>
                <ActionIcon
                  variant={tool === "select" ? "filled" : "default"}
                  onClick={() => setTool("select")}
                  aria-pressed={tool === "select"}
                >
                  <IconPointer size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Pen" openDelay={300}>
                <ActionIcon
                  variant={tool === "pen" ? "filled" : "default"}
                  onClick={() => setTool("pen")}
                  aria-pressed={tool === "pen"}
                >
                  <IconPencil size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Eraser" openDelay={300}>
                <ActionIcon
                  variant={tool === "eraser" ? "filled" : "default"}
                  onClick={() => setTool("eraser")}
                  aria-pressed={tool === "eraser"}
                >
                  <IconEraser size={18} />
                </ActionIcon>
              </Tooltip>
            </ActionIcon.Group>
            <ActionIcon.Group>
              <Tooltip label="Insert image" openDelay={300}>
                <ActionIcon component="label" variant="default">
                  <IconPhotoPlus size={18} />
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.currentTarget.files?.[0];
                      if (!file) {
                        return;
                      }
                      objectLayerRef.current?.addImage(file);
                      setTool("select");
                      e.currentTarget.value = "";
                    }}
                  />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Insert equation" openDelay={300}>
                <ActionIcon
                  variant="default"
                  onClick={() => {
                    setEditingLatexId(null);
                    setLatexInitial("");
                    latexModalOpen();
                  }}
                >
                  <IconMathFunction size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Insert text" openDelay={300}>
                <ActionIcon
                  variant="default"
                  onClick={() => {
                    objectLayerRef.current?.addText("Double-click to edit", {
                      fontFamily,
                      fontSize,
                      color: textColor,
                      align: textAlign,
                    });
                    setTool("select");
                  }}
                >
                  <IconTypography size={18} />
                </ActionIcon>
              </Tooltip>
            </ActionIcon.Group>
            <Divider orientation="vertical" />
            <Tooltip label="Pen color" openDelay={300}>
              <ColorInput
                value={penColor}
                onChange={setPenColor}
                disallowInput
                size="xs"
                maw={120}
                placeholder="#000000"
                rightSection={<IconPencil size={18} />}
                swatches={colorSwatches}
              />
            </Tooltip>
            <Tooltip label="Line width" openDelay={300}>
              <NumberInput
                value={lineWidth}
                onChange={(value) => setLineWidth(value as number)}
                size="xs"
                leftSection={<IconRulerMeasure size={18} />}
                maw={80}
                min={1}
                max={80}
                stepHoldDelay={300}
                stepHoldInterval={(t) => Math.max(1000 / t ** 2, 50)}
              />
            </Tooltip>
            <Divider orientation="vertical" />
            <Tooltip label="Text font" openDelay={300}>
              <Select
                size="xs"
                leftSection={<IconTypeface size={18} />}
                maw={160}
                value={fontFamily}
                onChange={(value) => {
                  const v = value as string;
                  setFontFamily(v);
                  updateTextAttributes({ fontFamily: v });
                }}
                data={[
                  "Arial",
                  "Helvetica",
                  "Times New Roman",
                  "Georgia",
                  "Courier New",
                  "Verdana",
                  "Comic Sans MS",
                ]}
              />
            </Tooltip>
            <Tooltip label="Font size" openDelay={300}>
              <NumberInput
                value={fontSize}
                onChange={(value) => {
                  const v = toClampedNumber(value, 6, 120);
                  setFontSize(v);
                  updateTextAttributesDebounced({ fontSize: v });
                }}
                size="xs"
                leftSection={<IconTextSize size={18} />}
                maw={80}
                min={6}
                max={120}
                stepHoldDelay={300}
                stepHoldInterval={(t) => Math.max(1000 / t ** 2, 50)}
              />
            </Tooltip>
            <Tooltip label="Text color" openDelay={300}>
              <ColorInput
                value={textColor}
                onChange={(value) => {
                  setTextColor(value);
                  updateTextAttributesDebounced({ color: value });
                }}
                disallowInput
                size="xs"
                maw={120}
                placeholder="#000000"
                rightSection={<IconTypography size={18} />}
                swatches={colorSwatches}
              />
            </Tooltip>
            <ActionIcon.Group>
              <Tooltip label="Align left" openDelay={300}>
                <ActionIcon
                  variant={textAlign === "left" ? "filled" : "default"}
                  onClick={() => {
                    setTextAlign("left");
                    updateTextAttributes({ align: "left" });
                  }}
                  aria-pressed={textAlign === "left"}
                >
                  <IconAlignLeft size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Align center" openDelay={300}>
                <ActionIcon
                  variant={textAlign === "center" ? "filled" : "default"}
                  onClick={() => {
                    setTextAlign("center");
                    updateTextAttributes({ align: "center" });
                  }}
                  aria-pressed={textAlign === "center"}
                >
                  <IconAlignCenter size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Align right" openDelay={300}>
                <ActionIcon
                  variant={textAlign === "right" ? "filled" : "default"}
                  onClick={() => {
                    setTextAlign("right");
                    updateTextAttributes({ align: "right" });
                  }}
                  aria-pressed={textAlign === "right"}
                >
                  <IconAlignRight size={18} />
                </ActionIcon>
              </Tooltip>
            </ActionIcon.Group>
            <Divider orientation="vertical" />
            <ActionIcon.Group>
              <Tooltip label="Bring forward" openDelay={300}>
                <ActionIcon
                  variant="default"
                  disabled={!selectedObject}
                  onClick={() => objectLayerRef.current?.bringForward()}
                >
                  <IconStackForward size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Send backward" openDelay={300}>
                <ActionIcon
                  variant="default"
                  disabled={!selectedObject}
                  onClick={() => objectLayerRef.current?.sendBackward()}
                >
                  <IconStackBackward size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Bring to front" openDelay={300}>
                <ActionIcon
                  variant="default"
                  disabled={!selectedObject}
                  onClick={() => objectLayerRef.current?.bringToFront()}
                >
                  <IconStackFront size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Send to back" openDelay={300}>
                <ActionIcon
                  variant="default"
                  disabled={!selectedObject}
                  onClick={() => objectLayerRef.current?.sendToBack()}
                >
                  <IconStackBack size={18} />
                </ActionIcon>
              </Tooltip>
            </ActionIcon.Group>
            <ActionIcon.Group>
              <Tooltip label="Delete object" openDelay={300}>
                <ActionIcon
                  variant="default"
                  disabled={!selectedObject}
                  onClick={() => objectLayerRef.current?.deleteSelected()}
                >
                  <IconTrashX size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Delete all drawings" openDelay={300}>
                <ActionIcon
                  variant="default"
                  onClick={() => wsRef.current?.sendClearDrawings()}
                >
                  <IconPencilX size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Delete all objects" openDelay={300}>
                <ActionIcon
                  variant="default"
                  onClick={() => objectLayerRef.current?.deleteAll()}
                >
                  <IconInputX size={18} />
                </ActionIcon>
              </Tooltip>
            </ActionIcon.Group>
          </Group>
        </ScrollArea>
      </Box>
      <Box
        flex={1}
        bd="1px solid #ddd"
        bdrs={8}
        pos="relative"
        style={{ overflow: "auto" }}
      >
        <div
          style={{
            width: boardWidth,
            height: boardHeight,
            position: "relative",
          }}
          onDragEnter={() => setShowDragOverlay(true)}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={() => setShowDragOverlay(false)}
          onDrop={(e) => {
            e.preventDefault();
            setShowDragOverlay(false);
            const files = Array.from(e.dataTransfer.files);
            files
              .filter((file) => file.type.startsWith("image/"))
              .forEach((file) => objectLayerRef.current?.addImage(file));
            setTool("select");
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              position: "absolute",
              inset: 0,
              touchAction: "none",
              display: "block",
              zIndex: 1,
              pointerEvents: tool === "select" ? "none" : "auto",
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onPointerLeave={onPointerUp}
          />
          {docRef.current && objectsRef.current && (
            <ObjectLayer
              ref={objectLayerRef}
              width={boardWidth}
              height={boardHeight}
              active={tool === "select"}
              zIndex={0}
              doc={docRef.current}
              objects={objectsRef.current}
              order={orderRef.current!}
              onSelectionChange={setSelectedObject}
              onRequestEditLatex={(id, text) => {
                setEditingLatexId(id);
                setLatexInitial(text ?? "");
                latexModalOpen();
              }}
            />
          )}
          {showDragOverlay && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                zIndex: 5,
                border: "2px dashed #339af0",
                background: "rgb(51, 154, 240, 0.06)",
                borderRadius: 8,
              }}
              aria-hidden
            />
          )}
        </div>
      </Box>
      <EditEquationModal
        opened={latexModalOpened}
        onCancel={latexModalClose}
        onConfirm={(text) => {
          if (!text) {
            latexModalClose();
            return;
          }
          if (editingLatexId) {
            objectLayerRef.current?.updateLatex(editingLatexId, text);
          } else {
            objectLayerRef.current?.addLatex(text);
            setTool("select");
          }
          latexModalClose();
        }}
        initial={latexInitial}
        title={editingLatexId ? "Edit LaTeX Equation" : "Insert LaTeX Equation"}
        confirmLabel={editingLatexId ? "Update" : "Insert"}
      />
    </Stack>
  );
}
