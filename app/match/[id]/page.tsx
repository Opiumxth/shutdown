"use client";

import { use } from "react";
import { usePortalMatch } from "@/hooks/usePortalMatch";
import { ErrorPopup } from "@/components/minigame/ErrorPopup";

export default function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const {
    status,
    participantCount,
    myHealth,
    opponentHealth,
    activeAttackPuzzle,
    activeDefensePuzzle,
    attack,
    resolveAttack,
    resolveDefense,
  } = usePortalMatch(id);

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
            <p>myHealth: {myHealth}</p>
            <p>opponentHealth: {opponentHealth}</p>
            <button type="button" onClick={() => attack("Software")}>
              Atacar
            </button>
          </div>
        </div>

        {activeAttackPuzzle && (
          <ErrorPopup
            key={activeAttackPuzzle.deadline}
            {...activeAttackPuzzle}
            onResult={resolveAttack}
          />
        )}
        {activeDefensePuzzle && (
          <ErrorPopup
            key={activeDefensePuzzle.deadline}
            {...activeDefensePuzzle}
            onResult={resolveDefense}
          />
        )}
      </div>
    </main>
  );
}
