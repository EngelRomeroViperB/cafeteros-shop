import type { KeyboardEvent } from "react";

/**
 * Returns an onKeyDown handler that triggers `action` on Enter or Space,
 * matching native button behaviour for clickable non-button elements.
 */
export function onActivate(action: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      action();
    }
  };
}
