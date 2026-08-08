"use client";

import { useEffect, useState } from "react";
import { PuzzleGame } from "./PuzzleGame";
import type { PuzzleData, PuzzleResult } from "./types";

type ErrorPopupProps = PuzzleData & {
  onResult: (result: PuzzleResult) => void;
};

export function ErrorPopup({ onResult, ...puzzle }: ErrorPopupProps) {
  const [expanded, setExpanded] = useState(false);
  const [position, setPosition] = useState({ top: "10%", left: "10%" });

  useEffect(() => {
    // Random position is inherently client-only; one extra render on mount is fine here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPosition({
      top: `${Math.random() * 70}%`,
      left: `${Math.random() * 70}%`,
    });
  }, []);

  function handleResult(result: PuzzleResult) {
    setExpanded(false);
    onResult(result);
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
        className="window"
        style={{
          position: "absolute",
          top: position.top,
          left: position.left,
          width: 220,
          cursor: "pointer",
        }}
      >
        <div className="title-bar">
          <div className="title-bar-text">Error del sistema</div>
        </div>
        <div className="window-body">
          <p>⚠ {puzzle.title}</p>
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
      <PuzzleGame {...puzzle} onResult={handleResult} />
    </div>
  );
}
