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

type ImageObject = {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};

export type ObjectLayerHandle = {
  addImage: (file: File) => void;
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
};

function loadHTMLImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export default forwardRef<ObjectLayerHandle, ObjectProps>(function ObjectLayer(
  { width, height, active, zIndex = 0, doc, objects, order, onSelectionChange },
  ref,
) {
  const [items, setItems] = useState<ImageObject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const nodeRefs = useRef<Record<string, Konva.Image | null>>({});

  const rebuildItems = () => {
    const arr: ImageObject[] = [];
    order.toArray().forEach((id) => {
      const m = objects.get(id);
      if (!m) {
        return;
      }
      const type = m.get("type");
      if (type !== "image") {
        return;
      }
      arr.push({
        id,
        src: m.get("src") as string,
        x: m.get("x") as number,
        y: m.get("y") as number,
        width: m.get("width") as number,
        height: m.get("height") as number,
        rotation: (m.get("rotation") ?? 0) as number,
      });
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
      const maxW = 1000;
      const scale = Math.min(1, maxW / (el.naturalWidth || el.width || maxW));
      const w = Math.max(
        20,
        Math.round((el.naturalWidth || el.width || maxW) * scale),
      );
      const h = Math.max(
        20,
        Math.round((el.naturalHeight || el.height || maxW) * scale),
      );
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(el, 0, 0, w, h);
      let url: string;
      try {
        url = canvas.toDataURL("image/webp", 0.8);
      } catch {
        url = canvas.toDataURL("image/jpeg", 0.85);
      }
      canvas.remove();
      const id = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      doc.transact(() => {
        const m = new Y.Map<unknown>();
        m.set("type", "image");
        m.set("src", url);
        m.set("x", 120);
        m.set("y", 120);
        m.set("width", w);
        m.set("height", h);
        m.set("rotation", 0);
        objects.set(id, m);
        order.push([id]);
      }, "local");
      setSelectedId(id);
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

  const updateItem = (id: string, patch: Partial<ImageObject>) => {
    const m = objects.get(id);
    if (!m) {
      return;
    }
    doc.transact(() => {
      Object.entries(patch).forEach(([k, v]) => m.set(k, v));
    }, "local");
  };

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
              img.src = it.src;
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
            onDragEnd={(e) =>
              updateItem(it.id, { x: e.target.x(), y: e.target.y() })
            }
            onTransformEnd={(e) => {
              const node = e.target as Konva.Image;
              const newW = Math.max(20, node.width() * node.scaleX());
              const newH = Math.max(20, node.height() * node.scaleY());
              const rotation = node.rotation();
              const newX = node.x();
              const newY = node.y();
              node.scaleX(1);
              node.scaleY(1);
              updateItem(it.id, {
                x: newX,
                y: newY,
                width: newW,
                height: newH,
                rotation,
              });
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
