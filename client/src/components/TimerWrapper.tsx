import { useEffect, useRef, useState } from "react";
import { Group, Rect } from "react-konva";
import { Html } from "react-konva-utils";
import type Konva from "konva";
import { ActionIcon, Group as MGroup, Paper, Stack, Text } from "@mantine/core";
import {
  IconPlayerPause,
  IconPlayerPlay,
  IconRotateClockwise,
} from "@tabler/icons-react";
import type { TimerObject } from "@/util/types.ts";

function formatTime(ms: number): string {
  ms = Math.max(0, ms);
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

type TimerWrapperProps = {
  obj: TimerObject;
  active: boolean;
  nodeRef: (node: Konva.Group | null) => void;
  select: () => void;
  edit: () => void;
  update: (id: string, fields: Partial<Omit<TimerObject, "id">>) => void;
};

export default function TimerWrapper({
  obj,
  active,
  nodeRef,
  select,
  edit,
  update,
}: TimerWrapperProps) {
  const [, setTick] = useState(0);
  const updateRef = useRef(update);
  updateRef.current = update;

  useEffect(() => {
    if (!obj.running) return;
    const interval = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(interval);
  }, [obj.running]);

  useEffect(() => {
    if (!obj.running || obj.endTime === null) return;
    const remaining = obj.endTime - Date.now();
    if (remaining <= 0) {
      updateRef.current(obj.id, {
        running: false,
        remainingMs: 0,
        endTime: null,
      });
      return;
    }
    const timeout = setTimeout(() => {
      updateRef.current(obj.id, {
        running: false,
        remainingMs: 0,
        endTime: null,
      });
    }, remaining);
    return () => clearTimeout(timeout);
  }, [obj.running, obj.endTime, obj.id]);

  const remainingMs =
    obj.running && obj.endTime !== null
      ? Math.max(0, obj.endTime - Date.now())
      : obj.remainingMs;

  const expired = remainingMs <= 0 && (obj.running || obj.remainingMs === 0);

  const handlePlayPause = () => {
    if (obj.running) {
      const remaining =
        obj.endTime !== null
          ? Math.max(0, obj.endTime - Date.now())
          : obj.remainingMs;
      update(obj.id, { running: false, endTime: null, remainingMs: remaining });
    } else {
      if (obj.remainingMs <= 0) return;
      update(obj.id, { running: true, endTime: Date.now() + obj.remainingMs });
    }
  };

  const handleReset = () => {
    update(obj.id, {
      running: false,
      endTime: null,
      remainingMs: obj.initialMs,
    });
  };

  const timeFontSize = Math.max(
    14,
    Math.min(52, Math.round(obj.height * 0.38)),
  );

  return (
    <Group
      ref={nodeRef}
      x={obj.x}
      y={obj.y}
      rotation={obj.rotation}
      draggable={active}
      onClick={select}
      onTap={select}
      onDblClick={edit}
      onDblTap={edit}
      onDragEnd={(e) => {
        const g = e.target as Konva.Group;
        update(obj.id, { x: g.x(), y: g.y() });
      }}
      onTransformEnd={(e) => {
        const g = e.target as Konva.Group;
        const newWidth = Math.max(160, obj.width * g.scaleX());
        const newHeight = Math.max(80, obj.height * g.scaleY());
        g.scaleX(1);
        g.scaleY(1);
        update(obj.id, {
          x: g.x(),
          y: g.y(),
          width: newWidth,
          height: newHeight,
          rotation: g.rotation(),
        });
      }}
      onMouseDown={select}
      onMouseEnter={(e) => {
        if (!active) return;
        e.target.getStage()?.container().style.setProperty("cursor", "move");
      }}
      onMouseLeave={(e) => {
        if (!active) return;
        e.target.getStage()?.container().style.removeProperty("cursor");
      }}
    >
      <Rect width={obj.width} height={obj.height} fill="transparent" />
      <Html divProps={{ style: { pointerEvents: "none" } }}>
        <Paper
          w={obj.width}
          h={obj.height}
          withBorder
          shadow="sm"
          radius="md"
          style={{
            borderColor: expired ? "var(--mantine-color-red-6)" : undefined,
            borderWidth: expired ? 2 : undefined,
            overflow: "hidden",
            boxSizing: "border-box",
          }}
        >
          <Stack h="100%" align="center" justify="center" gap={6}>
            <Text
              fw={700}
              c={expired ? "red" : undefined}
              style={{
                fontSize: timeFontSize,
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1,
              }}
            >
              {formatTime(remainingMs)}
            </Text>
            <MGroup gap="xs" style={{ pointerEvents: "auto" }}>
              <ActionIcon
                variant="default"
                size="md"
                onClick={(e) => {
                  e.stopPropagation();
                  select();
                  handlePlayPause();
                }}
                onDoubleClick={(e) => e.stopPropagation()}
              >
                {obj.running ? (
                  <IconPlayerPause size={18} />
                ) : (
                  <IconPlayerPlay size={18} />
                )}
              </ActionIcon>
              <ActionIcon
                variant="default"
                size="md"
                onClick={(e) => {
                  e.stopPropagation();
                  select();
                  handleReset();
                }}
                onDoubleClick={(e) => e.stopPropagation()}
              >
                <IconRotateClockwise size={18} />
              </ActionIcon>
            </MGroup>
          </Stack>
        </Paper>
      </Html>
    </Group>
  );
}
