import { useEffect, useMemo, useState } from "react";
import { Button, Group, Modal, Stack, TextInput } from "@mantine/core";
import { z } from "zod";

type InsertImageModalProps = {
  opened: boolean;
  onCancel: () => void;
  onConfirm: (url: string) => void;
};

const urlSchema = z.url();

export default function InsertImageModel({
  opened,
  onCancel,
  onConfirm,
}: InsertImageModalProps) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (opened) {
      setUrl("");
    }
  }, [opened]);

  const ok = useMemo(() => urlSchema.safeParse(url).success, [url]);

  return (
    <Modal
      opened={opened}
      onClose={onCancel}
      title="Insert Image"
      size="lg"
      radius="md"
    >
      <Stack gap="sm">
        <TextInput
          placeholder="Enter URL (e.g. https://example.com/image.png)"
          label="URL"
          value={url}
          onChange={(e) => setUrl(e.currentTarget.value)}
        />
        <Group justify="flex-end" mt="xs">
          <Button variant="default" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm(url)} disabled={!ok}>
            Insert
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
