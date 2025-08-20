import { Button, Group, Stack, TextInput, Title } from "@mantine/core";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createWS } from "@/util/ws.ts";

const wsUrl: string = import.meta.env.VITE_WS_URL ?? "http://localhost:5174";
const ws = createWS(wsUrl);

export default function App() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const onCreate = async () => {
    setBusy(true);
    try {
      const id = await ws.createRoom();
      navigate(`/room/${id}`);
    } finally {
      setBusy(false);
    }
  };

  const onJoin = async () => {
    if (!code.trim()) {
      return;
    }
    navigate(`/room/${code.trim()}`);
  };

  return (
    <Stack p="xl" gap="lg" align="center">
      <Title order={2}>TechBoard</Title>
      <Group>
        <Button loading={busy} onClick={onCreate}>
          Create room
        </Button>
      </Group>
      <Group align="end">
        <TextInput
          label="Invite code"
          placeholder="e.g. 7a3f1c2d"
          value={code}
          onChange={(e) => setCode(e.currentTarget.value)}
        />
        <Button onClick={onJoin}>Join</Button>
      </Group>
    </Stack>
  );
}
