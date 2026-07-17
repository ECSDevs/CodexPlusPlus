import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) =>
    React.createElement("md-outlined-text-field", {
      ...props,
      className: cn("m3-text-field", className),
      ref,
      type,
    }),
);
Input.displayName = "Input";

export { Input };
