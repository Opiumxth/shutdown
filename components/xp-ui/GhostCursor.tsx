"use client";

import type { CSSProperties } from "react";

type GhostCursorProps = {
  x: number;
  y: number;
};

export function GhostCursor({ x, y }: GhostCursorProps) {
  if (x === 0 && y === 0) {
    return null;
  }

  const style: CSSProperties = {
    position: "fixed",
    left: x,
    top: y,
    width: 24,
    height: 24,
    zIndex: 4,
    pointerEvents: "none",
    transition: "all 0.05s linear",
  };

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/win-xp-pack/Cursor/arrow_r.png"
      alt="Cursor del rival"
      aria-hidden="true"
      className="[image-rendering:pixelated]"
      style={style}
    />
  );
}
