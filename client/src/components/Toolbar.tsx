import type { Dispatch, SetStateAction } from "react";
import { useDebouncedCallback } from "@mantine/hooks";
import {
  ActionIcon,
  Box,
  ColorInput,
  Divider,
  Group,
  NumberInput,
  ScrollArea,
  Select,
  Tooltip,
} from "@mantine/core";
import {
  IconAlignCenter,
  IconAlignLeft,
  IconAlignRight,
  IconArrowBackUp,
  IconArrowForwardUp,
  IconCircle,
  IconDownload,
  IconEraser,
  IconInputX,
  IconLine,
  IconMathFunction,
  IconPencil,
  IconPencilX,
  IconPhotoPlus,
  IconPointer,
  IconRectangle,
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
import { toClampedNumber } from "@/util/size.ts";
import type { CanvasObject, TextAttributes, Tool } from "@/util/types.ts";
import type { ObjectLayerHandle } from "@/components/ObjectLayer.tsx";

type ToolbarProps = {
  tool: Tool;
  setTool: (tool: Tool) => void;
  penColor: string;
  setPenColor: Dispatch<SetStateAction<string>>;
  lineWidths: Omit<Record<Tool, number>, "select">;
  setLineWidths: Dispatch<SetStateAction<Omit<Record<Tool, number>, "select">>>;
  fontFamily: string;
  setFontFamily: Dispatch<SetStateAction<string>>;
  fontSize: number;
  setFontSize: Dispatch<SetStateAction<number>>;
  textColor: string;
  setTextColor: Dispatch<SetStateAction<string>>;
  textAlign: "left" | "center" | "right";
  setTextAlign: Dispatch<SetStateAction<"left" | "center" | "right">>;
  objectLayerHandle: ObjectLayerHandle | null;
  selectedObject: CanvasObject | null;
  undoManager: Y.UndoManager | null;
  canUndo: boolean;
  canRedo: boolean;
  insertEquation: () => void;
  clearDrawings: () => void;
  handleDownload: () => void;
};

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

export default function Toolbar({
  tool,
  setTool,
  penColor,
  setPenColor,
  lineWidths,
  setLineWidths,
  fontFamily,
  setFontFamily,
  fontSize,
  setFontSize,
  textColor,
  setTextColor,
  textAlign,
  setTextAlign,
  objectLayerHandle,
  selectedObject,
  undoManager,
  canUndo,
  canRedo,
  insertEquation,
  clearDrawings,
  handleDownload,
}: ToolbarProps) {
  const updateTextAttributes = (attr: Partial<TextAttributes>) => {
    if (selectedObject) {
      objectLayerHandle?.updateText(selectedObject.id, attr);
    }
  };

  const updateTextAttributesDebounced = useDebouncedCallback(
    updateTextAttributes,
    200,
  );

  return (
    <Box bd="1px solid #eee" bdrs={8} bg="#fafafa">
      <ScrollArea type="hover" scrollHideDelay={800} p={10}>
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
            <Tooltip label="Rectangle" openDelay={300}>
              <ActionIcon
                variant={tool === "rectangle" ? "filled" : "default"}
                onClick={() => setTool("rectangle")}
                aria-pressed={tool === "rectangle"}
              >
                <IconRectangle size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Ellipse" openDelay={300}>
              <ActionIcon
                variant={tool === "ellipse" ? "filled" : "default"}
                onClick={() => setTool("ellipse")}
                aria-pressed={tool === "ellipse"}
              >
                <IconCircle size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Line" openDelay={300}>
              <ActionIcon
                variant={tool === "line" ? "filled" : "default"}
                onClick={() => setTool("line")}
                aria-pressed={tool === "line"}
              >
                <IconLine size={18} />
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
                    objectLayerHandle?.addImage(file);
                    setTool("select");
                    e.currentTarget.value = "";
                  }}
                />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Insert equation" openDelay={300}>
              <ActionIcon variant="default" onClick={insertEquation}>
                <IconMathFunction size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Insert text" openDelay={300}>
              <ActionIcon
                variant="default"
                onClick={() => {
                  objectLayerHandle?.addText("Double-click to edit", {
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
              miw={120}
              maw={120}
              placeholder="#000000"
              rightSection={<IconPencil size={18} />}
              swatches={colorSwatches}
            />
          </Tooltip>
          <Tooltip label="Line width" openDelay={300}>
            <NumberInput
              value={tool === "select" ? "" : lineWidths[tool]}
              onChange={(value) =>
                tool !== "select" &&
                setLineWidths((p) => ({ ...p, [tool]: value as number }))
              }
              size="xs"
              disabled={tool === "select"}
              leftSection={<IconRulerMeasure size={18} />}
              miw={80}
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
              miw={160}
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
              miw={80}
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
              miw={120}
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
            <Tooltip label="Undo" openDelay={300}>
              <ActionIcon
                variant="default"
                disabled={!canUndo}
                onClick={() => undoManager?.undo()}
              >
                <IconArrowBackUp size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Redo" openDelay={300}>
              <ActionIcon
                variant="default"
                disabled={!canRedo}
                onClick={() => undoManager?.redo()}
              >
                <IconArrowForwardUp size={18} />
              </ActionIcon>
            </Tooltip>
          </ActionIcon.Group>
          <ActionIcon.Group>
            <Tooltip label="Bring forward" openDelay={300}>
              <ActionIcon
                variant="default"
                disabled={!selectedObject}
                onClick={() => objectLayerHandle?.bringForward()}
              >
                <IconStackForward size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Send backward" openDelay={300}>
              <ActionIcon
                variant="default"
                disabled={!selectedObject}
                onClick={() => objectLayerHandle?.sendBackward()}
              >
                <IconStackBackward size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Bring to front" openDelay={300}>
              <ActionIcon
                variant="default"
                disabled={!selectedObject}
                onClick={() => objectLayerHandle?.bringToFront()}
              >
                <IconStackFront size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Send to back" openDelay={300}>
              <ActionIcon
                variant="default"
                disabled={!selectedObject}
                onClick={() => objectLayerHandle?.sendToBack()}
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
                onClick={() => objectLayerHandle?.deleteSelected()}
              >
                <IconTrashX size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Delete all drawings" openDelay={300}>
              <ActionIcon variant="default" onClick={clearDrawings}>
                <IconPencilX size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Delete all objects" openDelay={300}>
              <ActionIcon
                variant="default"
                onClick={() => objectLayerHandle?.deleteAll()}
              >
                <IconInputX size={18} />
              </ActionIcon>
            </Tooltip>
          </ActionIcon.Group>
          <Divider orientation="vertical" />
          <Tooltip label="Download image" openDelay={300}>
            <ActionIcon variant="default" onClick={handleDownload}>
              <IconDownload size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </ScrollArea>
    </Box>
  );
}
