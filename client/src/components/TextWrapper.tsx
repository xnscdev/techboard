import { Text } from "react-konva";
import type Konva from "konva";
import type { TextObject } from "@/util/types.ts";

type TextWrapperProps = {
  obj: TextObject;
  active: boolean;
  nodeRef: (node: Konva.Text | null) => void;
  select: () => void;
  edit: () => void;
  update: (id: string, obj: Partial<Omit<TextObject, "id">>) => void;
};

export default function TextWrapper({
  obj,
  active,
  nodeRef,
  select,
  edit,
  update,
}: TextWrapperProps) {
  return (
    <Text
      ref={nodeRef}
      text={obj.text}
      x={obj.x}
      y={obj.y}
      width={obj.width}
      rotation={obj.rotation}
      draggable={active}
      onClick={select}
      onTap={select}
      onDblClick={edit}
      onDblTap={edit}
      onDragEnd={(e) => update(obj.id, { x: e.target.x(), y: e.target.y() })}
      onTransform={(e) => {
        const node = e.target as Konva.Text;
        node.width(node.width() * node.scaleX());
        node.scaleX(1);
        node.scaleY(1);
      }}
      onTransformEnd={(e) => {
        const node = e.target as Konva.Text;
        const newW = Math.max(30, node.width() * node.scaleX());
        const rotation = node.rotation();
        const newX = node.x();
        const newY = node.y();
        node.scaleX(1);
        node.scaleY(1);
        update(obj.id, {
          x: newX,
          y: newY,
          width: newW,
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
    />
  );
}
