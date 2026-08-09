"use client";

import { useEffect } from "react";
import type { CSSProperties } from "react";
import { sound } from "@/lib/sound";

type DecorativeXPErrorProps = {
  position: { top: string; left: string };
};

export function DecorativeXPError({ position }: DecorativeXPErrorProps) {
  useEffect(() => {
    sound.playError();
  }, []);

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
        <span className="xp-error-icon" aria-hidden="true" />
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
