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
import { Layer, Stage, Transformer } from "react-konva";
import type {
  CanvasObject,
  ImageObject,
  LatexObject,
  TextAttributes,
  TextObject,
} from "@/util/types.ts";
import { latexToSvgDataUrl } from "@/util/latex.ts";
import { scaleImage, scaleResize } from "@/util/size.ts";
import ImageWrapper from "@/components/ImageWrapper.tsx";
import TextWrapper from "@/components/TextWrapper.tsx";

export type ObjectLayerHandle = {
  addImage: (file: File) => void;
  addImageUrl: (url: string) => void;
  addLatex: (text: string) => void;
  updateLatex: (id: string, text: string) => void;
  addText: (attr: TextAttributes) => void;
  updateText: (id: string, attr: Partial<TextAttributes>) => void;
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
  onSelectionChange?: (obj: CanvasObject | null) => void;
  onTextAttributesChange?: (attr: TextAttributes) => void;
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

function loadHTMLImage(src: string, cors: boolean): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (cors) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
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
  const [isEditingText, setIsEditingText] = useState<boolean>(false);
  const trRef = useRef<Konva.Transformer>(null);
  const nodeRefs = useRef<Record<string, Konva.Node | null>>({});

  const selectedObject = useMemo(
    () =>
      selectedId ? items.find((it) => it.id === selectedId) || null : null,
    [items, selectedId],
  );

  useEffect(() => {
    if (selectedId && !selectedObject) {
      setSelectedId(null);
    }
  }, [selectedId, selectedObject]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Backspace" && selectedId && !isEditingText) {
        doc.transact(() => {
          objects.delete(selectedId);
          const idx = order.toArray().indexOf(selectedId);
          order.delete(idx, 1);
        });
        setSelectedId(null);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  });

  useEffect(() => {
    const rebuildItems = () => {
      const arr: CanvasObject[] = [];
      order.toArray().forEach((id) => {
        const m = objects.get(id);
        if (!m) {
          return;
        }
        const obj = getObjectFromMap<Omit<CanvasObject, "id">>(m);
        const newObj = { id, ...obj } as CanvasObject;
        arr.push(newObj);
      });
      setItems(arr);
    };
    const onUpdate = () => rebuildItems();
    doc.on("update", onUpdate);
    rebuildItems();
    return () => doc.off("update", onUpdate);
  }, [doc, objects, order]);

  const addImageFromUrl = async (url: string, cors: boolean) => {
    const el = await loadHTMLImage(url, cors);
    const { width, height } = scaleImage(el, 20, 1000);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(el, 0, 0, width, height);
    let newUrl: string;
    try {
      newUrl = canvas.toDataURL("image/webp", 0.8);
    } catch {
      newUrl = canvas.toDataURL("image/jpeg", 0.85);
    }
    canvas.remove();
    const id = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const obj: Omit<ImageObject, "id"> = {
      type: "image",
      src: newUrl,
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
  };

  useImperativeHandle(ref, () => ({
    async addImage(file: File) {
      if (!file) {
        return;
      }
      const objectUrl = URL.createObjectURL(file);
      await addImageFromUrl(objectUrl, false);
    },
    async addImageUrl(url: string) {
      await addImageFromUrl(url, true);
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
      const el = await loadHTMLImage(url, false);
      const { width, height } = scaleImage(el, 20);
      const id = `eq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const obj: Omit<LatexObject, "id"> = {
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
      const el = await loadHTMLImage(url, false);
      const { width, height } = scaleImage(el, 20);
      doc.transact(() => {
        setObjectToMap(m, {
          text,
          src: url,
          width,
          height,
        });
      }, "local");
    },
    addText(attr: TextAttributes) {
      const id = `txt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const obj: Omit<TextObject, "id"> = {
        type: "text",
        text: "Double-click to edit",
        x: 140,
        y: 140,
        width: 240,
        rotation: 0,
        ...attr,
      };
      doc.transact(() => {
        const m = new Y.Map<unknown>();
        setObjectToMap(m, obj);
        objects.set(id, m);
        order.push([id]);
      }, "local");
      setSelectedId(id);
    },
    updateText(id: string, attr: Partial<TextAttributes>) {
      const m = objects.get(id);
      if (!m) {
        return;
      }
      const obj = getObjectFromMap<Omit<CanvasObject, "id">>(m);
      if (obj.type !== "text") {
        return;
      }
      doc.transact(() => setObjectToMap(m, attr), "local");
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
    if (!selectedId || isEditingText) {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      return;
    }
    const node = nodeRefs.current[selectedId];
    if (node) {
      tr.nodes([node]);
      tr.getLayer()?.batchDraw();
    }
  }, [selectedId, items, isEditingText]);

  useEffect(() => {
    onSelectionChange?.(selectedObject);
  }, [selectedObject, onSelectionChange]);

  const stageStyle: CSSProperties = useMemo(
    () => ({
      position: "absolute",
      inset: 0,
      pointerEvents: active ? "auto" : "none",
      zIndex,
    }),
    [active, zIndex],
  );

  const editObject = (obj: CanvasObject) => {
    if (obj.type === "latex") {
      setSelectedId(obj.id);
      onRequestEditLatex?.(obj.id, obj.text || "");
    }
  };

  const updateObject = (id: string, obj: Partial<Omit<CanvasObject, "id">>) => {
    const m = objects.get(id);
    if (!m) {
      return;
    }
    doc.transact(() => setObjectToMap(m, obj), "local");
  };

  return (
    <Stage
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
        {items.map((it) => {
          if (it.type === "image" || it.type === "latex") {
            return (
              <ImageWrapper
                key={it.id}
                obj={it}
                active={active}
                nodeRef={(node) => {
                  if (node) {
                    nodeRefs.current[it.id] = node;
                  } else {
                    delete nodeRefs.current[it.id];
                  }
                }}
                select={() => setSelectedId(it.id)}
                edit={() => editObject(it)}
                update={updateObject}
              />
            );
          } else if (it.type === "text") {
            return (
              <TextWrapper
                key={it.id}
                obj={it}
                active={active}
                nodeRef={(node) => {
                  if (node) {
                    nodeRefs.current[it.id] = node;
                  } else {
                    delete nodeRefs.current[it.id];
                  }
                }}
                select={() => setSelectedId(it.id)}
                update={updateObject}
                onEditChange={setIsEditingText}
                saveText={(text) =>
                  updateObject(it.id, { text } as Partial<
                    Omit<TextObject, "id">
                  >)
                }
              />
            );
          } else {
            return null;
          }
        })}
        <Transformer
          ref={trRef}
          rotateEnabled
          flipEnabled={false}
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
          boundBoxFunc={(_oldBox, newBox) => ({
            ...newBox,
            ...scaleResize(newBox.width, newBox.height, 20),
          })}
        />
      </Layer>
    </Stage>
  );
});
