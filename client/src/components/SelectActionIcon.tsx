import type { Dispatch, JSX, SetStateAction } from "react";
import { ActionIcon, Button, Menu, SimpleGrid, Tooltip } from "@mantine/core";
import { IconChevronDown } from "@tabler/icons-react";

type SelectActionIconProps<T> = {
  value: T;
  setValue: Dispatch<SetStateAction<T>>;
  icons: Map<T, { name: string; icon: JSX.Element }>;
  callback?: (id: T) => void;
};

export default function SelectActionIcon<T>({
  value,
  setValue,
  icons,
  callback,
}: SelectActionIconProps<T>) {
  return (
    <Menu>
      <Menu.Target>
        <ActionIcon.GroupSection variant="default" size="md" px={0}>
          <Button variant="transparent" px={0}>
            <IconChevronDown size={12} />
          </Button>
        </ActionIcon.GroupSection>
      </Menu.Target>
      <Menu.Dropdown>
        <SimpleGrid cols={4} spacing="xs" verticalSpacing="xs">
          {Array.from(icons).map(([id, { name, icon }]) => (
            <Tooltip key={name} label={name} openDelay={300}>
              <ActionIcon
                variant={value === id ? "filled" : "default"}
                onClick={() => {
                  setValue(id);
                  callback?.(id);
                }}
                aria-pressed={value === id}
              >
                {icon}
              </ActionIcon>
            </Tooltip>
          ))}
        </SimpleGrid>
      </Menu.Dropdown>
    </Menu>
  );
}
