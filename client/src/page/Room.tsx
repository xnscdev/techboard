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
  CopyButton,
  Group,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import * as Y from "yjs";
import { YArrayEvent } from "yjs";
import { useDebouncedCallback, useDisclosure } from "@mantine/hooks";
import { createWS, type WS } from "@/util/ws.ts";
import snap from "@/util/snap.ts";
import handlePaste from "@/util/paste.ts";
import type {
  CanvasObject,
  Point,
  Segment,
  StrokeEvent,
  Tool,
} from "@/util/types.ts";
import {
  drawStroke,
  drawRectangle,
  drawCircle,
  drawLine,
  replay,
  setupCanvas,
  downloadCanvas,
} from "@/util/canvas.ts";
import ObjectLayer, {
  type ObjectLayerHandle,
} from "@/components/ObjectLayer.tsx";
import EditEquationModal from "@/components/EditEquationModal.tsx";
import Toolbar from "@/components/Toolbar.tsx";

const wsUrl: string = import.meta.env.VITE_WS_URL ?? "http://localhost:5174";
const boardWidth = 2400;
const boardHeight = 1600;

export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  const [wsReady, setWsReady] = useState(false);
  const wsRef = useRef<WS | null>(null);

  const docRef = useRef<Y.Doc | null>(null);
  const objectsRef = useRef<Y.Map<Y.Map<unknown>> | null>(null);
  const orderRef = useRef<Y.Array<string> | null>(null);
  const strokesRef = useRef<Y.Array<StrokeEvent> | null>(null);
  const undoRef = useRef<Y.UndoManager | null>(null);

  const drawingRef = useRef(false);
  const lastPosRef = useRef<Point | null>(null);
  const pendingSegmentsRef = useRef<Segment[]>([]);
  const shapeStartRef = useRef<Point | null>(null);
  const shapeEndRef = useRef<Point | null>(null);
  const [tool, setTool] = useState<Tool>("select");
  const [shiftKey, setShiftKey] = useState(false);

  const [penColor, setPenColor] = useState<string>("#000000");
  const [lineWidths, setLineWidths] = useState<
    Omit<Record<Tool, number>, "select">
  >({ pen: 2, eraser: 36, rectangle: 2, ellipse: 2, line: 2 });
  const [fontFamily, setFontFamily] = useState<string>("Arial");
  const [fontSize, setFontSize] = useState<number>(20);
  const [textColor, setTextColor] = useState<string>("#000000");
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">(
    "center",
  );

  const objectLayerRef = useRef<ObjectLayerHandle | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const [selectedObject, setSelectedObject] = useState<CanvasObject | null>(
    null,
  );
  const [showDragOverlay, setShowDragOverlay] = useState(false);

  const [latexModalOpened, { open: latexModalOpen, close: latexModalClose }] =
    useDisclosure(false);
  const [latexInitial, setLatexInitial] = useState<string>("");
  const [editingLatexId, setEditingLatexId] = useState<string | null>(null);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current!;
    ctxRef.current = setupCanvas(canvas, boardWidth, boardHeight);
    const previewCanvas = previewCanvasRef.current!;
    previewCtxRef.current = setupCanvas(previewCanvas, boardWidth, boardHeight);
  }, []);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    const ws = createWS(wsUrl);
    wsRef.current = ws;

    const doc = new Y.Doc();
    docRef.current = doc;
    objectsRef.current = doc.getMap("objects");
    orderRef.current = doc.getArray("order");
    strokesRef.current = doc.getArray("strokes");

    const handleStackChanged = () => {
      setCanUndo(undoRef.current?.canUndo() ?? false);
      setCanRedo(undoRef.current?.canRedo() ?? false);
    };
    const undoManager = new Y.UndoManager(doc, {
      trackedOrigins: new Set(["local"]),
    });
    undoManager.on("stack-cleared", handleStackChanged);
    undoManager.on("stack-item-added", handleStackChanged);
    undoManager.on("stack-item-popped", handleStackChanged);
    undoRef.current = undoManager;

    const onLocalUpdateDoc = (update: Uint8Array, origin: unknown) => {
      if (origin === "remote") {
        return;
      }
      wsRef.current?.sendUpdateDoc(update);
    };
    doc.on("update", onLocalUpdateDoc);
    ws.onInitDoc((u) => Y.applyUpdate(doc, u, "remote"));
    ws.onUpdateDoc((u) => Y.applyUpdate(doc, u, "remote"));

    const onStrokesChange = (e: YArrayEvent<StrokeEvent>) => {
      if (
        e.transaction.origin === "local" ||
        !ctxRef.current ||
        !canvasRef.current
      ) {
        return;
      }
      let redraw = false;
      for (const d of e.changes.delta) {
        if (d.insert) {
          for (const stroke of d.insert) {
            drawStroke(ctxRef.current, stroke);
          }
        } else if (d.delete) {
          redraw = true;
          break;
        }
      }
      if (redraw) {
        clearCanvas(ctxRef.current, canvasRef.current);
        replay(ctxRef.current, strokesRef.current?.toArray() ?? []);
      }
    };
    strokesRef.current.observe(onStrokesChange);

    ws.joinRoom(roomId).then((ok) => {
      if (!ok) {
        navigate("/");
        return;
      }
      setWsReady(true);
    });

    return () => {
      ws.socket.removeAllListeners("initDoc");
      ws.socket.removeAllListeners("updateDoc");
      docRef.current?.off("update", onLocalUpdateDoc);
      docRef.current?.destroy();
      docRef.current = null;
      objectsRef.current = null;
      orderRef.current = null;
      strokesRef.current?.unobserve(onStrokesChange);
      strokesRef.current = null;
      undoRef.current?.off("stack-cleared", handleStackChanged);
      undoRef.current?.off("stack-item-added", handleStackChanged);
      undoRef.current?.off("stack-item-popped", handleStackChanged);
      undoRef.current?.destroy();
      undoRef.current = null;
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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        setShiftKey(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        setShiftKey(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const addImage = (file: File) => {
      objectLayerRef.current?.addImage(file);
      setTool("select");
    };
    const handler = (e: ClipboardEvent) => handlePaste(e, addImage, pasteText);
    document.addEventListener("paste", handler);
    return () => document.removeEventListener("paste", handler);
  });

  const flushStrokes = useDebouncedCallback(() => {
    if (
      pendingSegmentsRef.current.length &&
      docRef.current &&
      wsReady &&
      tool !== "select"
    ) {
      const stroke: StrokeEvent = {
        segments: pendingSegmentsRef.current,
        tool,
        lineWidth: lineWidths[tool],
        color: penColor,
      };
      docRef.current.transact(
        () => strokesRef.current?.push([stroke]),
        "local",
      );
      pendingSegmentsRef.current = [];
    }
  }, 20);

  const clearCanvas = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
  ) => {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
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
    const pos = getPos(e.nativeEvent);
    if (tool === "rectangle" || tool === "ellipse" || tool === "line") {
      shapeStartRef.current = pos;
    } else {
      lastPosRef.current = pos;
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !ctxRef.current || tool === "select") {
      return;
    }
    const curr = getPos(e.nativeEvent);
    if (tool === "rectangle" || tool === "ellipse" || tool === "line") {
      if (shapeStartRef.current && previewCtxRef.current) {
        let drawEnd = curr;
        if (shiftKey) {
          drawEnd = snap(tool, shapeStartRef.current, curr);
        }
        shapeEndRef.current = drawEnd;
        clearCanvas(previewCtxRef.current, previewCanvasRef.current!);
        previewCtxRef.current.save();
        previewCtxRef.current.strokeStyle = penColor;
        previewCtxRef.current.lineWidth = lineWidths[tool];
        previewCtxRef.current.lineCap = "round";
        previewCtxRef.current.lineJoin = "round";
        switch (tool) {
          case "rectangle":
            drawRectangle(
              previewCtxRef.current,
              shapeStartRef.current,
              drawEnd,
            );
            break;
          case "ellipse":
            drawCircle(previewCtxRef.current, shapeStartRef.current, drawEnd);
            break;
          case "line":
            drawLine(previewCtxRef.current, shapeStartRef.current, drawEnd);
            break;
        }
        previewCtxRef.current.restore();
      }
    } else {
      const prev = lastPosRef.current!;
      const seg: Segment = { from: prev, to: curr };
      drawStroke(ctxRef.current, {
        segments: [seg],
        tool,
        lineWidth: lineWidths[tool],
        color: penColor,
      });
      pendingSegmentsRef.current.push(seg);
      flushStrokes();
      lastPosRef.current = curr;
    }
  };

  const onPointerUp = () => {
    if (!drawingRef.current || tool === "select") {
      return;
    }
    drawingRef.current = false;
    if (tool === "rectangle" || tool === "ellipse" || tool === "line") {
      if (
        ctxRef.current &&
        shapeStartRef.current &&
        shapeEndRef.current &&
        docRef.current &&
        wsReady
      ) {
        const stroke: StrokeEvent = {
          segments: [],
          tool,
          lineWidth: lineWidths[tool],
          color: penColor,
          startPoint: shapeStartRef.current,
          endPoint: shapeEndRef.current,
        };
        docRef.current.transact(
          () => strokesRef.current?.push([stroke]),
          "local",
        );
        undoRef.current?.stopCapturing();
        drawStroke(ctxRef.current, stroke);
      }
      if (previewCtxRef.current) {
        clearCanvas(previewCtxRef.current, previewCanvasRef.current!);
      }
      shapeStartRef.current = null;
      shapeEndRef.current = null;
    } else {
      lastPosRef.current = null;
      flushStrokes.flush();
    }
  };

  const pasteText = useDebouncedCallback((text: string) => {
    objectLayerRef.current?.addText(text, {
      fontFamily,
      fontSize,
      color: textColor,
      align: textAlign,
    });
    setTool("select");
  }, 300);

  const getViewportOffset = (): Point => {
    if (!canvasContainerRef.current) {
      return { x: 0, y: 0 };
    }
    return {
      x: canvasContainerRef.current.scrollLeft,
      y: canvasContainerRef.current.scrollTop,
    };
  };

  const insertEquation = () => {
    setEditingLatexId(null);
    setLatexInitial("");
    latexModalOpen();
  };

  const clearDrawings = () => {
    docRef.current?.transact(() => {
      strokesRef.current?.delete(0, strokesRef.current?.length ?? 0);
    }, "local");
    clearCanvas(ctxRef.current!, canvasRef.current!);
  };

  const handleDownload = () => {
    if (!canvasRef.current) {
      return;
    }
    const layers = [canvasRef.current];
    const objectCanvas = objectLayerRef.current?.getCanvas() ?? null;
    if (objectCanvas) layers.push(objectCanvas);
    const timestamp = new Date()
      .toISOString()
      .slice(0, 16)
      .replace(/[:.]/g, "-");
    const filename = `techboard-${roomId}-${timestamp}`;
    downloadCanvas(layers, boardWidth, boardHeight, filename);
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
      <Toolbar
        tool={tool}
        setTool={setTool}
        penColor={penColor}
        setPenColor={setPenColor}
        lineWidths={lineWidths}
        setLineWidths={setLineWidths}
        fontFamily={fontFamily}
        setFontFamily={setFontFamily}
        fontSize={fontSize}
        setFontSize={setFontSize}
        textColor={textColor}
        setTextColor={setTextColor}
        textAlign={textAlign}
        setTextAlign={setTextAlign}
        objectLayerHandle={objectLayerRef.current}
        selectedObject={selectedObject}
        undoManager={undoRef.current}
        canUndo={canUndo}
        canRedo={canRedo}
        insertEquation={insertEquation}
        clearDrawings={clearDrawings}
        handleDownload={handleDownload}
      />
      <Box
        ref={canvasContainerRef}
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
          <canvas
            ref={previewCanvasRef}
            style={{
              position: "absolute",
              inset: 0,
              touchAction: "none",
              display: "block",
              zIndex: 2,
              pointerEvents: "none",
            }}
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
              getViewportOffset={getViewportOffset}
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
