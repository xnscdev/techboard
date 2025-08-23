import { Text } from "react-konva";
import type Konva from "konva";
import type { TextObject } from "@/util/types.ts";
import {
  type CSSProperties,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Html } from "react-konva-utils";

type TextWrapperProps = {
  obj: TextObject;
  active: boolean;
  nodeRef: (node: Konva.Text | null) => void;
  select: () => void;
  update: (id: string, obj: Partial<Omit<TextObject, "id">>) => void;
  onEditChange: (editing: boolean) => void;
  saveText: (text: string) => void;
};

export default function TextWrapper({
  obj,
  active,
  nodeRef,
  select,
  update,
  onEditChange,
  saveText,
}: TextWrapperProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editStyle, setEditStyle] = useState<CSSProperties>({});
  const textNodeRef = useRef<Konva.Text | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const objStr = JSON.stringify(obj);

  useEffect(() => onEditChange(isEditing), [isEditing, onEditChange]);

  useEffect(() => {
    if (!taRef.current) {
      return;
    }
    const ta = taRef.current;
    const onClick = (e: MouseEvent) => {
      if (e.target !== ta) {
        saveText(ta.value);
        setIsEditing(false);
      }
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [saveText, taRef]);

  useLayoutEffect(() => {
    if (!isEditing || !textNodeRef.current) {
      return;
    }
    const node = textNodeRef.current;
    const stage = node.getStage();
    if (!stage) {
      return;
    }
    const { x, y } = node.absolutePosition();
    setEditStyle({
      position: "absolute",
      top: `${y}px`,
      left: `${x}px`,
      width: `${node.width() - node.padding() * 2}px`,
      height: `${node.height() - node.padding() * 2 + 5}px`,
      fontFamily: node.fontFamily(),
      fontSize: `${node.fontSize()}px`,
      color: node.fill() as string,
      textAlign: node.align() as "left" | "center" | "right",
      lineHeight: node.lineHeight(),
      border: "none",
      padding: 0,
      margin: 0,
      overflow: "hidden",
      background: "none",
      outline: "none",
      resize: "none",
      transformOrigin: "left top",
      transform: `rotateZ(${node.rotation()}deg)`,
    });
  }, [isEditing, textNodeRef, objStr]);

  return (
    <>
      <Text
        ref={(node) => {
          textNodeRef.current = node;
          nodeRef(node);
        }}
        text={obj.text}
        x={obj.x}
        y={obj.y}
        width={obj.width}
        rotation={obj.rotation}
        fontFamily={obj.fontFamily}
        fontSize={obj.fontSize}
        fill={obj.color}
        align={obj.align}
        draggable={active}
        onClick={select}
        onTap={select}
        onDblClick={() => setIsEditing(true)}
        onDblTap={() => setIsEditing(true)}
        onDragEnd={(e) => update(obj.id, { x: e.target.x(), y: e.target.y() })}
        onTransform={(e) => {
          const node = e.target as Konva.Text;
          node.width(node.width() * node.scaleX());
          node.scaleX(1);
          node.scaleY(1);
        }}
        onTransformEnd={(e) => {
          const node = e.target as Konva.Text;
          const x = node.x();
          const y = node.y();
          const width = node.width() * node.scaleX();
          const rotation = node.rotation();
          node.scaleX(1);
          node.scaleY(1);
          update(obj.id, {
            x,
            y,
            width,
            rotation,
          });
        }}
        onMouseDown={select}
        onMouseEnter={(e) => {
          if (!active) {
            return;
          }
          e.target.getStage()?.container().style.setProperty("cursor", "text");
        }}
        onMouseLeave={(e) => {
          if (!active) {
            return;
          }
          e.target.getStage()?.container().style.removeProperty("cursor");
        }}
        visible={!isEditing}
      />
      {isEditing && (
        <Html>
          <textarea
            ref={taRef}
            defaultValue={obj.text}
            style={editStyle}
            onChange={(e) => {
              e.currentTarget.style.height = "auto";
              e.currentTarget.style.height = `${e.currentTarget.scrollHeight + 3}px`;
            }}
          />
        </Html>
      )}
    </>
  );
}
