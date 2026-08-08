"use client";

import type { CSSProperties } from "react";

type DecorativeXPErrorProps = {
  position: { top: string; left: string };
};

export function DecorativeXPError({ position }: DecorativeXPErrorProps) {
  const style: CSSProperties = {
    position: "absolute",
    top: position.top,
    left: position.left,
    width: 300,
    zIndex: 3,
    pointerEvents: "none",
  };

  return (
    <div className="xp-error" style={style}>
      <div className="xp-error-titlebar">
        <span className="xp-error-title">ERROR!</span>
        <button
          type="button"
          className="xp-error-close"
          tabIndex={-1}
          aria-hidden="true"
        >
          ×
        </button>
      </div>
      <div className="xp-error-body">
        <div className="xp-error-icon" aria-hidden="true">
          <span className="xp-error-icon-cross" />
        </div>
        <p className="xp-error-text">
          SYSTEM SHUTDOWN :: INITIATED BY EXTERNAL AGENT
        </p>
      </div>
      <div className="xp-error-actions">
        <button type="button" className="btn" tabIndex={-1}>
          OK
        </button>
      </div>
    </div>
  );
}
