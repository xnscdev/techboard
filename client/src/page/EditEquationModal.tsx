import { useEffect, useMemo, useState } from "react";
import { Button, Group, Modal, Stack, Text, Textarea } from "@mantine/core";
import { latexToSvgDataUrl } from "@/util/latex.ts";

type EditEquationModalProps = {
  opened: boolean;
  onCancel: () => void;
  onConfirm: (text: string) => void;
  initial: string;
  title: string;
  confirmLabel: string;
};

export default function EditEquationModal({
  opened,
  onCancel,
  onConfirm,
  initial,
  title,
  confirmLabel,
}: EditEquationModalProps) {
  const [text, setText] = useState(initial.trim());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (opened) {
      setText(initial.trim());
      setError(null);
    }
  }, [opened, initial]);

  const previewSrc = useMemo(() => {
    try {
      if (!text.trim()) {
        return "";
      }
      return latexToSvgDataUrl(text.trim(), {
        display: true,
        encoding: "base64",
      });
    } catch {
      setError("Failed to render preview.");
      return "";
    }
  }, [text]);

  return (
    <Modal
      opened={opened}
      onClose={onCancel}
      title={title}
      size="lg"
      radius="md"
    >
      <Stack gap="sm">
        <Textarea
          placeholder="Enter LaTeX (e.g. \int_0^1 x^2\,dx)"
          label="Source"
          autosize
          minRows={3}
          value={text}
          onChange={(e) => {
            setText(e.currentTarget.value);
            if (error) {
              setError(null);
            }
          }}
          styles={{
            input: {
              fontFamily: "ui-monospace, monospace",
            },
          }}
        />
        {error ? (
          <Text c="red" size="sm">
            {error}
          </Text>
        ) : (
          previewSrc && (
            <div
              style={{
                padding: 8,
                border: "1px solid #eee",
                borderRadius: 8,
                background: "#fff",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <img
                src={previewSrc}
                alt="Preview"
                style={{ maxWidth: "100%", height: "auto" }}
              />
            </div>
          )
        )}
        <Group justify="flex-end" mt="xs">
          <Button variant="default" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(text.trim())}
            disabled={!text.trim()}
          >
            {confirmLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
