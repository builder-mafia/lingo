import { Select } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";

import styles from "./NoteFilterSelect.module.css";

export type NoteFilterOption = {
  readonly value: string;
  readonly label: string;
};

type NoteFilterSelectProps = {
  readonly label: string;
  readonly options: readonly NoteFilterOption[];
  readonly size: "status" | "sort" | "label";
  readonly value: string;
  readonly onValueChange: (value: string) => void;
};

export const NoteFilterSelect = ({
  label,
  options,
  size,
  value,
  onValueChange,
}: NoteFilterSelectProps) => (
  <Select.Root
    items={options}
    value={value}
    onValueChange={(nextValue) => {
      if (nextValue) onValueChange(nextValue);
    }}
  >
    <Select.Trigger
      className={styles.trigger}
      data-size={size}
      aria-label={label}
    >
      <Select.Value className={styles.value} />
      <Select.Icon className={styles.icon}>
        <ChevronDown aria-hidden="true" />
      </Select.Icon>
    </Select.Trigger>
    <Select.Portal>
      <Select.Positioner className={styles.positioner} sideOffset={5} align="start">
        <Select.Popup className={styles.popup}>
          <Select.List>
            {options.map((option) => (
              <Select.Item
                className={styles.item}
                key={option.value}
                value={option.value}
              >
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator className={styles.check}>
                  <Check aria-hidden="true" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.List>
        </Select.Popup>
      </Select.Positioner>
    </Select.Portal>
  </Select.Root>
);
