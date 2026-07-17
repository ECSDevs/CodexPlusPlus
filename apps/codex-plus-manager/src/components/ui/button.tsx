import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "secondary" | "outline" | "ghost";
type ButtonSize = "default" | "sm" | "icon";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
}

const tagForVariant: Record<ButtonVariant, string> = {
  default: "md-filled-button",
  secondary: "md-filled-tonal-button",
  outline: "md-outlined-button",
  ghost: "md-text-button",
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild: _asChild = false, children, ...props }, ref) => {
    const tag = size === "icon" ? (variant === "outline" ? "md-outlined-icon-button" : "md-icon-button") : tagForVariant[variant];
    const content = React.Children.toArray(children);
    const firstChild = content[0];
    const hasIconElement = React.isValidElement(firstChild);

    if (size === "icon") {
      return React.createElement(tag, {
        ...props,
        className: cn("m3-button", `m3-button--${size}`, className),
        ref,
      }, children);
    }

    const hasLeadingIcon = hasIconElement;
    const labelContent = hasLeadingIcon ? content.slice(1) : content;
    const icon = hasLeadingIcon
      ? React.cloneElement(firstChild as React.ReactElement, { slot: "icon" } as React.Attributes)
      : null;
    const label = labelContent.length > 0
      ? React.createElement("span", { className: "m3-button-label" }, labelContent)
      : null;
    return React.createElement(tag, {
      ...props,
      className: cn("m3-button", `m3-button--${size}`, className),
      ref,
    }, icon, label);
  },
);
Button.displayName = "Button";

const buttonVariants = ({ className }: { className?: string } = {}) => cn("m3-button", className);

export { Button, buttonVariants };
