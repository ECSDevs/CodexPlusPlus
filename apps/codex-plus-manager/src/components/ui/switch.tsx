import * as React from "react";

type MaterialSwitchElement = HTMLElement & { selected: boolean };

type MaterialSwitchProps = {
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
};

/** React adapter for Material Web's form-associated `md-switch`. */
export function MaterialSwitch({ checked, disabled = false, onCheckedChange }: MaterialSwitchProps) {
  return React.createElement("md-switch", {
    className: "m3-switch",
    disabled,
    selected: checked,
    onChange: (event: React.FormEvent<HTMLElement>) => {
      onCheckedChange((event.currentTarget as MaterialSwitchElement).selected);
    },
  });
}
