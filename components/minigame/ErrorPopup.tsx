"use client";

import { useEffect, useState } from "react";
import { PuzzleGame } from "./PuzzleGame";
import type { PuzzleData, PuzzleResult } from "./types";

type ErrorPopupProps = PuzzleData & {
  onResult?: (result: PuzzleResult) => void;
  decorative?: boolean;
  defaultExpanded?: boolean;
  x?: number;
  y?: number;
  message?: string;
  isMinor?: boolean;
};

function randomPopupPosition() {
  // Popups must never cover the central Agent Marketplace (50%,50%) nor the
  // dedicated ATACAR node (80%,50%). Rejection-sample a clear position.
  for (let attempt = 0; attempt < 64; attempt += 1) {
    const top = 4 + Math.random() * 72;
    const left = 2 + Math.random() * 86;
    const nearCenter = Math.hypot(top - 50, left - 50) < 24;
    const nearAttackNode = Math.hypot(top - 50, left - 80) < 22;
    if (!nearCenter && !nearAttackNode) {
      return { top: `${top}%`, left: `${left}%` };
    }
  }
  return { top: "6%", left: "2%" };
}

function WarningIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M12 2 L22 21 H2 Z"
        fill="#ffcc00"
        stroke="#000"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <rect x="11" y="9" width="2" height="7" fill="#000" />
      <rect x="11" y="18" width="2" height="2" fill="#000" />
    </svg>
  );
}

export function ErrorPopup({
  onResult,
  decorative = false,
  defaultExpanded = false,
  x,
  y,
  message,
  isMinor = false,
  ...puzzle
}: ErrorPopupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [position, setPosition] = useState({ top: "10%", left: "10%" });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPosition(
      x !== undefined && y !== undefined
        ? { top: `${y}%`, left: `${x}%` }
        : randomPopupPosition(),
    );
  }, [x, y]);

  function handleResult(result: PuzzleResult) {
    setExpanded(false);
    onResult?.(result);
  }

  if (decorative) {
    return (
      <div
        className={`window absolute z-[9999] transition-transform ${
          isMinor ? "scale-75 opacity-95" : "scale-100 shadow-2xl"
        }`}
        style={{
          position: "absolute",
          top: position.top,
          left: position.left,
          width: isMinor ? 150 : 220,
          pointerEvents: "none",
          zIndex: 9999,
        }}
      >
        <div className="title-bar">
          <div className="title-bar-text">
            {isMinor ? "Alerta menor" : "Error del sistema"}
          </div>
        </div>
        <div className="window-body">
          {isMinor ? <WarningIcon /> : null}
          <p className="break-words">{message ?? puzzle.title}</p>
        </div>
      </div>
    );
  }

  if (!expanded) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setExpanded(true);
        }}
        className={`window absolute z-[9999] transition-transform ${
          isMinor ? "scale-75 opacity-95" : "scale-100 shadow-2xl"
        }`}
        style={{
          position: "absolute",
          top: position.top,
          left: position.left,
          width: isMinor ? 150 : 220,
          cursor: "pointer",
          zIndex: 9999,
        }}
      >
        <div className="title-bar">
          <div className="title-bar-text">
            {isMinor ? "Alerta menor" : "Error del sistema"}
          </div>
        </div>
        <div className="window-body">
          {isMinor ? <WarningIcon /> : null}
          <p className="break-words">{message ?? puzzle.title}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div className={isMinor ? "scale-75" : undefined}>
        <PuzzleGame {...puzzle} onResult={handleResult} />
      </div>
    </div>
  );
}
