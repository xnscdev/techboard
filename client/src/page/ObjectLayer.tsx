import {
  type CSSProperties,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import type Konva from "konva";
import * as Y from "yjs";
import { Layer, Stage, Image as KImage, Transformer } from "react-konva";
import type { CanvasObject } from "@/util/types.ts";
import { latexToSvgDataUrl } from "@/util/latex.ts";

export type ObjectLayerHandle = {
  addImage: (file: File) => void;
  addLatex: (text: string) => void;
  updateLatex: (id: string, text: string) => void;
  clearSelection: () => void;
  bringForward: () => void;
  sendBackward: () => void;
  bringToFront: () => void;
  sendToBack: () => void;
  deleteSelected: () => void;
  deleteAll: () => void;
};

type ObjectProps = {
  width: number;
  height: number;
  active: boolean;
  zIndex?: number;
  doc: Y.Doc;
  objects: Y.Map<Y.Map<unknown>>;
  order: Y.Array<string>;
  onSelectionChange?: (id: string | null) => void;
  onRequestEditLatex?: (id: string, text: string) => void;
};

function setObjectToMap<T extends Record<string, unknown>>(
  m: Y.Map<unknown>,
  obj: T,
) {
  for (const [k, v] of Object.entries(obj)) {
    m.set(k, v);
  }
}

function getObjectFromMap<T = Record<string, unknown>>(m: Y.Map<unknown>) {
  return Object.fromEntries(m.entries()) as T;
}

function loadHTMLImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function scaleImage(el: HTMLImageElement, maxW = 1000) {
  const scale = Math.min(1, maxW / (el.naturalWidth || el.width || maxW));
  const w = Math.max(
    20,
    Math.round((el.naturalWidth || el.width || maxW) * scale),
  );
  const h = Math.max(
    20,
    Math.round((el.naturalHeight || el.height || maxW) * scale),
  );
  return { width: w, height: h };
}

export default forwardRef<ObjectLayerHandle, ObjectProps>(function ObjectLayer(
  {
    width,
    height,
    active,
    zIndex = 0,
    doc,
    objects,
    order,
    onSelectionChange,
    onRequestEditLatex,
  },
  ref,
) {
  const [items, setItems] = useState<CanvasObject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const nodeRefs = useRef<Record<string, Konva.Image | null>>({});

  const rebuildItems = () => {
    const arr: CanvasObject[] = [];
    order.toArray().forEach((id) => {
      const m = objects.get(id);
      if (!m) {
        return;
      }
      const obj = getObjectFromMap<Omit<CanvasObject, "id">>(m);
      if (obj.type !== "image" && obj.type !== "latex") {
        return;
      }
      arr.push({ id, ...obj });
    });
    setItems(arr);
  };

  useEffect(() => {
    if (selectedId && !items.some((it) => it.id === selectedId)) {
      setSelectedId(null);
    }
  }, [items, selectedId]);

  useEffect(() => {
    const onUpdate = () => rebuildItems();
    doc.on("update", onUpdate);
    rebuildItems();
    return () => doc.off("update", onUpdate);
  }, [doc, objects, order]);

  useImperativeHandle(ref, () => ({
    async addImage(file: File) {
      if (!file) {
        return;
      }
      const objectUrl = URL.createObjectURL(file);
      const el = await loadHTMLImage(objectUrl);
      const { width, height } = scaleImage(el);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(el, 0, 0, width, height);
      let url: string;
      try {
        url = canvas.toDataURL("image/webp", 0.8);
      } catch {
        url = canvas.toDataURL("image/jpeg", 0.85);
      }
      canvas.remove();
      const id = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const obj: Omit<CanvasObject, "id"> = {
        type: "image",
        src: url,
        x: 120,
        y: 120,
        width,
        height,
        rotation: 0,
      };
      doc.transact(() => {
        const m = new Y.Map<unknown>();
        setObjectToMap(m, obj);
        objects.set(id, m);
        order.push([id]);
      }, "local");
      setSelectedId(id);
    },
    async addLatex(text: string) {
      text = text.trim();
      if (!text) {
        return;
      }
      const url = latexToSvgDataUrl(text, {
        display: true,
        encoding: "base64",
      });
      const el = await loadHTMLImage(url);
      const { width, height } = scaleImage(el);
      const id = `eq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const obj: Omit<CanvasObject, "id"> = {
        type: "latex",
        text,
        src: url,
        x: 140,
        y: 140,
        width,
        height,
        rotation: 0,
      };
      doc.transact(() => {
        const m = new Y.Map<unknown>();
        setObjectToMap(m, obj);
        objects.set(id, m);
        order.push([id]);
      }, "local");
      setSelectedId(id);
    },
    async updateLatex(id: string, text: string) {
      text = (text || "").trim();
      const m = objects.get(id);
      if (!m) {
        return;
      }
      const obj = getObjectFromMap<Omit<CanvasObject, "id">>(m);
      if (obj.type !== "latex") {
        return;
      }
      const url = latexToSvgDataUrl(text, {
        display: true,
        encoding: "base64",
      });
      const el = await loadHTMLImage(url);
      const natW = el.naturalWidth || el.width || 1;
      const natH = el.naturalHeight || el.height || 1;
      const newWidth = Math.max(20, obj.width ?? 120);
      const newHeight = Math.max(20, Math.round(newWidth * (natH / natW)));
      doc.transact(() => {
        setObjectToMap(m, {
          text,
          src: url,
          width: newWidth,
          height: newHeight,
        });
      }, "local");
    },
    clearSelection() {
      setSelectedId(null);
    },
    bringForward() {
      if (!selectedId) {
        return;
      }
      doc.transact(() => {
        const idx = order.toArray().indexOf(selectedId);
        if (idx < 0 || idx === order.length - 1) {
          return;
        }
        order.delete(idx, 1);
        order.insert(idx + 1, [selectedId]);
      });
    },
    sendBackward() {
      if (!selectedId) {
        return;
      }
      doc.transact(() => {
        const idx = order.toArray().indexOf(selectedId);
        if (idx <= 0) {
          return;
        }
        order.delete(idx, 1);
        order.insert(idx - 1, [selectedId]);
      });
    },
    bringToFront() {
      if (!selectedId) {
        return;
      }
      doc.transact(() => {
        const idx = order.toArray().indexOf(selectedId);
        if (idx < 0) {
          return;
        }
        order.delete(idx, 1);
        order.push([selectedId]);
      });
    },
    sendToBack() {
      if (!selectedId) {
        return;
      }
      doc.transact(() => {
        const idx = order.toArray().indexOf(selectedId);
        order.delete(idx, 1);
        order.unshift([selectedId]);
      });
    },
    deleteSelected() {
      if (!selectedId) {
        return;
      }
      doc.transact(() => {
        objects.delete(selectedId);
        const idx = order.toArray().indexOf(selectedId);
        order.delete(idx, 1);
      });
      setSelectedId(null);
    },
    deleteAll() {
      doc.transact(() => {
        objects.clear();
        order.delete(0, order.length);
      });
      setSelectedId(null);
    },
  }));

  useEffect(() => {
    const tr = trRef.current;
    if (!tr) {
      return;
    }
    if (!selectedId) {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      return;
    }
    const node = nodeRefs.current[selectedId];
    if (node) {
      tr.nodes([node]);
      tr.getLayer()?.batchDraw();
    }
  }, [selectedId, items]);

  useEffect(() => {
    onSelectionChange?.(selectedId);
  }, [selectedId, onSelectionChange]);

  const stageStyle: CSSProperties = useMemo(
    () => ({
      position: "absolute",
      inset: 0,
      pointerEvents: active ? "auto" : "none",
      zIndex,
    }),
    [active, zIndex],
  );

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      style={stageStyle}
      onMouseDown={(e) => {
        const stage = e.target.getStage();
        if (e.target === stage) {
          setSelectedId(null);
        }
      }}
      onTouchStart={(e) => {
        const stage = e.target.getStage();
        if (e.target === stage) {
          setSelectedId(null);
        }
      }}
    >
      <Layer listening={active}>
        {items.map((it) => (
          <KImage
            key={it.id}
            ref={(node) => {
              if (node) {
                nodeRefs.current[it.id] = node;
              } else {
                delete nodeRefs.current[it.id];
              }
            }}
            image={(function () {
              const img = new window.Image();
              img.src = it.src!;
              return img;
            })()}
            x={it.x}
            y={it.y}
            width={it.width}
            height={it.height}
            rotation={it.rotation}
            draggable={active}
            onClick={() => setSelectedId(it.id)}
            onTap={() => setSelectedId(it.id)}
            onDblClick={() => {
              if (it.type === "latex") {
                setSelectedId(it.id);
                onRequestEditLatex?.(it.id, it.text || "");
              }
            }}
            onDragEnd={(e) => {
              const m = objects.get(it.id);
              if (!m) {
                return;
              }
              doc.transact(
                () => setObjectToMap(m, { x: e.target.x(), y: e.target.y() }),
                "local",
              );
            }}
            onTransformEnd={(e) => {
              const node = e.target as Konva.Image;
              const newW = Math.max(20, node.width() * node.scaleX());
              const newH = Math.max(20, node.height() * node.scaleY());
              const rotation = node.rotation();
              const newX = node.x();
              const newY = node.y();
              node.scaleX(1);
              node.scaleY(1);
              const m = objects.get(it.id);
              if (!m) {
                return;
              }
              doc.transact(
                () =>
                  setObjectToMap(m, {
                    x: newX,
                    y: newY,
                    width: newW,
                    height: newH,
                    rotation,
                  }),
                "local",
              );
            }}
            onMouseDown={() => setSelectedId(it.id)}
            onMouseEnter={(e) => {
              if (!active) {
                return;
              }
              e.target
                .getStage()
                ?.container()
                .style.setProperty("cursor", "move");
            }}
            onMouseLeave={(e) => {
              if (!active) {
                return;
              }
              e.target.getStage()?.container().style.removeProperty("cursor");
            }}
          />
        ))}
        <Transformer
          ref={trRef}
          rotateEnabled
          keepRatio={false}
          anchorSize={8}
          anchorStroke="#333"
          borderStroke="#333"
          enabledAnchors={[
            "top-left",
            "top-right",
            "bottom-left",
            "bottom-right",
            "middle-left",
            "middle-right",
            "top-center",
            "bottom-center",
          ]}
        />
      </Layer>
    </Stage>
  );
});
