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
  Popover,
  ScrollArea,
  Slider,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  IconArrowBarToDown,
  IconArrowBarToUp,
  IconArrowDown,
  IconArrowUp,
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
  IconTrashX,
  IconTypography,
} from "@tabler/icons-react";
import * as Y from "yjs";
import { useDisclosure } from "@mantine/hooks";
import { createWS } from "@/util/ws.ts";
import type { Point, Segment, StrokeEvent, Tool } from "@/util/types.ts";
import { drawStroke, replay, setupCanvas } from "@/util/canvas.ts";
import ObjectLayer, {
  type ObjectLayerHandle,
} from "@/components/ObjectLayer.tsx";
import EditEquationModal from "@/components/EditEquationModal.tsx";

const wsUrl: string = import.meta.env.VITE_WS_URL ?? "http://localhost:5174";
const boardWidth = 2400;
const boardHeight = 1600;

export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  const [wsReady, setWsReady] = useState(false);
  const wsRef = useRef(createWS(wsUrl));

  const docRef = useRef<Y.Doc | null>(null);
  const objectsRef = useRef<Y.Map<Y.Map<unknown>> | null>(null);
  const orderRef = useRef<Y.Array<string> | null>(null);

  const drawingRef = useRef(false);
  const lastPosRef = useRef<Point | null>(null);
  const pendingSegmentsRef = useRef<Segment[]>([]);
  const flushTimerRef = useRef<number | null>(null);
  const [tool, setTool] = useState<Tool>("select");
  const [color, setColor] = useState<string>("#000000");
  const [lineWidth, setLineWidth] = useState<number>(2);

  const objectLayerRef = useRef<ObjectLayerHandle | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
    const ws = wsRef.current;

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
      ws.sendUpdateDoc(update);
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
      setWsReady(false);
    };
  }, [roomId]);

  useEffect(() => {
    if (tool !== "select") {
      objectLayerRef.current?.clearSelection();
    }
  }, [tool]);

  const flush = () => {
    const segs = pendingSegmentsRef.current;
    pendingSegmentsRef.current = [];
    if (segs.length && wsReady) {
      const payload: StrokeEvent = { segments: segs, tool, lineWidth, color };
      wsRef.current.sendDraw(payload);
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
      color,
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
      wsRef.current.sendDraw({
        segments: pendingSegmentsRef.current,
        tool,
        lineWidth,
        color,
      });
      pendingSegmentsRef.current = [];
    }
  };

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
      <Box bd="1px solid #eee" bdrs={8} p={8} bg="#fafafa">
        <ScrollArea type="auto" scrollHideDelay={0}>
          <Group gap="xs" wrap="nowrap">
            <ActionIcon.Group>
              <Tooltip label="Select" openDelay={300}>
                <ActionIcon
                  variant={tool === "select" ? "filled" : "default"}
                  onClick={() => setTool("select")}
                  aria-pressed={tool === "select"}
                >
                  <IconPointer />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Pen" openDelay={300}>
                <ActionIcon
                  variant={tool === "pen" ? "filled" : "default"}
                  onClick={() => setTool("pen")}
                  aria-pressed={tool === "pen"}
                >
                  <IconPencil />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Eraser" openDelay={300}>
                <ActionIcon
                  variant={tool === "eraser" ? "filled" : "default"}
                  onClick={() => setTool("eraser")}
                  aria-pressed={tool === "eraser"}
                >
                  <IconEraser />
                </ActionIcon>
              </Tooltip>
            </ActionIcon.Group>
            <ActionIcon.Group>
              <Tooltip label="Insert image" openDelay={300}>
                <ActionIcon component="label" variant="default">
                  <IconPhotoPlus />
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
                  <IconMathFunction />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Insert text" openDelay={300}>
                <ActionIcon
                  variant="default"
                  onClick={() => objectLayerRef.current?.addText()}
                >
                  <IconTypography />
                </ActionIcon>
              </Tooltip>
            </ActionIcon.Group>
            <Divider orientation="vertical" />
            <Tooltip label="Pen color" openDelay={300}>
              <ColorInput
                value={color}
                onChange={setColor}
                size="xs"
                maw={120}
                placeholder="#000000"
                swatches={[
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
                ]}
              />
            </Tooltip>
            <Popover withArrow trapFocus>
              <Popover.Target>
                <Tooltip label="Line width" openDelay={300}>
                  <ActionIcon variant="default">
                    <IconRulerMeasure />
                  </ActionIcon>
                </Tooltip>
              </Popover.Target>
              <Popover.Dropdown>
                <Stack gap="xs" w={200}>
                  <Text size="sm">Line width</Text>
                  <Slider
                    min={1}
                    max={80}
                    step={1}
                    value={lineWidth}
                    onChange={setLineWidth}
                  />
                </Stack>
              </Popover.Dropdown>
            </Popover>
            <ActionIcon.Group>
              <Tooltip label="Bring forward" openDelay={300}>
                <ActionIcon
                  variant="default"
                  disabled={!selectedId}
                  onClick={() => objectLayerRef.current?.bringForward()}
                >
                  <IconArrowUp />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Send backward" openDelay={300}>
                <ActionIcon
                  variant="default"
                  disabled={!selectedId}
                  onClick={() => objectLayerRef.current?.sendBackward()}
                >
                  <IconArrowDown />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Bring to front" openDelay={300}>
                <ActionIcon
                  variant="default"
                  disabled={!selectedId}
                  onClick={() => objectLayerRef.current?.bringToFront()}
                >
                  <IconArrowBarToUp />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Send to back" openDelay={300}>
                <ActionIcon
                  variant="default"
                  disabled={!selectedId}
                  onClick={() => objectLayerRef.current?.sendToBack()}
                >
                  <IconArrowBarToDown />
                </ActionIcon>
              </Tooltip>
            </ActionIcon.Group>
            <Divider orientation="vertical" />
            <ActionIcon.Group>
              <Tooltip label="Delete object" openDelay={300}>
                <ActionIcon
                  variant="default"
                  disabled={!selectedId}
                  onClick={() => objectLayerRef.current?.deleteSelected()}
                >
                  <IconTrashX />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Delete all drawings" openDelay={300}>
                <ActionIcon
                  variant="default"
                  onClick={() => wsRef.current.sendClearDrawings()}
                >
                  <IconPencilX />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Delete all objects" openDelay={300}>
                <ActionIcon
                  variant="default"
                  onClick={() => objectLayerRef.current?.deleteAll()}
                >
                  <IconInputX />
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
              onSelectionChange={setSelectedId}
              onRequestEditLatex={(id, text) => {
                setEditingLatexId(id);
                setLatexInitial(text ?? "");
                latexModalOpen();
              }}
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
