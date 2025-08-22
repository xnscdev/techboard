import { Image } from "react-konva";
import type Konva from "konva";
import type { ImageObject, LatexObject } from "@/util/types.ts";

type ImageWrapperProps = {
  obj: ImageObject | LatexObject;
  active: boolean;
  nodeRef: (node: Konva.Image | null) => void;
  select: () => void;
  edit: () => void;
  update: (
    id: string,
    obj: Partial<Omit<ImageObject | LatexObject, "id">>,
  ) => void;
};

export default function ImageWrapper({
  obj,
  active,
  nodeRef,
  select,
  edit,
  update,
}: ImageWrapperProps) {
  return (
    <Image
      ref={nodeRef}
      image={(function () {
        const img = new window.Image();
        img.src = obj.src;
        return img;
      })()}
      x={obj.x}
      y={obj.y}
      width={obj.width}
      height={obj.height}
      rotation={obj.rotation}
      draggable={active}
      onClick={select}
      onTap={select}
      onDblClick={edit}
      onDblTap={edit}
      onDragEnd={(e) => update(obj.id, { x: e.target.x(), y: e.target.y() })}
      onTransformEnd={(e) => {
        const node = e.target as Konva.Image;
        const newW = Math.max(20, node.width() * node.scaleX());
        const newH = Math.max(20, node.height() * node.scaleY());
        const rotation = node.rotation();
        const newX = node.x();
        const newY = node.y();
        node.scaleX(1);
        node.scaleY(1);
        update(obj.id, {
          x: newX,
          y: newY,
          width: newW,
          height: newH,
          rotation,
        });
      }}
      onMouseDown={select}
      onMouseEnter={(e) => {
        if (!active) {
          return;
        }
        e.target.getStage()?.container().style.setProperty("cursor", "move");
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
