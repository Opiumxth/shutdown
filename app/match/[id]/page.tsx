"use client";

import { use, useState } from "react";
import { usePortalMatch } from "@/hooks/usePortalMatch";
import { ErrorPopup } from "@/components/minigame/ErrorPopup";
import type { PuzzleData, PuzzleResult } from "@/components/minigame/types";

type PuzzleApiResponse = {
  attack: PuzzleData & { puzzleId: string };
  defense: PuzzleData & { puzzleId: string };
};

async function fetchMockPuzzle(): Promise<PuzzleData> {
  const response = await fetch("/api/puzzle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ theme: "Software" }),
  });
  const data: PuzzleApiResponse = await response.json();
  return data.attack;
}

export default function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { status, participantCount } = usePortalMatch(id);
  const [mockPuzzle, setMockPuzzle] = useState<PuzzleData | null>(null);
  const [lastResult, setLastResult] = useState<PuzzleResult | null>(null);

  async function handleTestPuzzle() {
    setLastResult(null);
    setMockPuzzle(await fetchMockPuzzle());
  }

  function handleResult(result: PuzzleResult) {
    setLastResult(result);
    setMockPuzzle(null);
  }

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div style={{ position: "relative", width: "100%", maxWidth: 640, minHeight: 420 }}>
        <div className="window" style={{ width: 320 }}>
          <div className="title-bar">
            <div className="title-bar-text">Partida {id}</div>
          </div>
          <div className="window-body">
            <p>Estado: {status}</p>
            <p>
              {participantCount < 2 ? "Esperando rival..." : "Rival conectado"}
            </p>
            <button type="button" onClick={handleTestPuzzle}>
              Probar minijuego (mock)
            </button>
            {lastResult && (
              <p>
                Último resultado:{" "}
                {lastResult.success ? "Resuelto" : "Fallado / timeout"} en{" "}
                {lastResult.elapsed}ms
              </p>
            )}
          </div>
        </div>

        {mockPuzzle && (
          <ErrorPopup
            key={mockPuzzle.deadline}
            {...mockPuzzle}
            onResult={handleResult}
          />
        )}
      </div>
    </main>
  );
}
