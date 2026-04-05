import { useEffect, useState } from "react";
import { Button, Group, Modal, NumberInput, Stack, Text } from "@mantine/core";

type EditTimerModalProps = {
  opened: boolean;
  onCancel: () => void;
  onConfirm: (totalMs: number) => void;
  initialMs: number;
};

export default function EditTimerModal({
  opened,
  onCancel,
  onConfirm,
  initialMs,
}: EditTimerModalProps) {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(1);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (opened) {
      const totalSeconds = Math.floor(initialMs / 1000);
      setHours(Math.floor(totalSeconds / 3600));
      setMinutes(Math.floor((totalSeconds % 3600) / 60));
      setSeconds(totalSeconds % 60);
    }
  }, [opened, initialMs]);

  const totalMs = (hours * 3600 + minutes * 60 + seconds) * 1000;

  return (
    <Modal
      opened={opened}
      onClose={onCancel}
      title="Set timer"
      size="sm"
      radius="md"
    >
      <Stack gap="sm">
        <Group gap="xs" align="flex-end">
          <NumberInput
            label="Hours"
            value={hours}
            onChange={(v) =>
              setHours(typeof v === "number" ? Math.max(0, v) : 0)
            }
            min={0}
            max={99}
            miw={80}
            maw={80}
          />
          <Text pb={6} c="dimmed" fw={700} size="lg">
            :
          </Text>
          <NumberInput
            label="Minutes"
            value={minutes}
            onChange={(v) =>
              setMinutes(
                typeof v === "number" ? Math.max(0, Math.min(59, v)) : 0,
              )
            }
            min={0}
            max={59}
            miw={80}
            maw={80}
          />
          <Text pb={6} c="dimmed" fw={700} size="lg">
            :
          </Text>
          <NumberInput
            label="Seconds"
            value={seconds}
            onChange={(v) =>
              setSeconds(
                typeof v === "number" ? Math.max(0, Math.min(59, v)) : 0,
              )
            }
            min={0}
            max={59}
            miw={80}
            maw={80}
          />
        </Group>
        <Group justify="flex-end" mt="xs">
          <Button variant="default" onClick={onCancel}>
            Cancel
          </Button>
          <Button disabled={totalMs <= 0} onClick={() => onConfirm(totalMs)}>
            Set timer
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
