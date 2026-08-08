"use client";

import { use, useEffect, useState } from "react";
import { usePortalMatch } from "@/hooks/usePortalMatch";
import { ErrorPopup } from "@/components/minigame/ErrorPopup";
import { ATTACK_COOLDOWN_MS, MAX_HP } from "@/lib/constants";

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

  const corruption = Math.max(0, Math.min(1, myHealth / MAX_HP));

  const [cooldownLeft, setCooldownLeft] = useState(0);
  const onCooldown = cooldownLeft > 0;

  useEffect(() => {
    if (!onCooldown) return;
    const interval = setInterval(() => {
      setCooldownLeft((left) => Math.max(0, left - 250));
    }, 250);
    return () => clearInterval(interval);
  }, [onCooldown]);

  function handleAttack() {
    if (onCooldown) return;
    setCooldownLeft(ATTACK_COOLDOWN_MS);
    void attack("Software");
  }

  return (
    <main className="relative flex flex-1 items-center justify-center p-8">
      <div
        className="desktop"
        style={{
          filter: `saturate(${corruption}) grayscale(${1 - corruption})`,
        }}
      >
        <div className="window" style={{ width: 320 }}>
          <div className="title-bar">
            <div className="title-bar-text">Partida {id}</div>
          </div>
          <div className="window-body">
            <p>Estado: {status}</p>
            <p>
              {participantCount < 2 ? "Esperando rival..." : "Rival conectado"}
            </p>
            <p>myHealth: {myHealth.toFixed(2)}</p>
            <p>opponentHealth: {opponentHealth.toFixed(2)}</p>
            <button type="button" onClick={handleAttack} disabled={onCooldown}>
              {onCooldown ? `Atacar (${Math.ceil(cooldownLeft / 1000)}s)` : "Atacar"}
            </button>
            {onCooldown && (
              <progress
                max={ATTACK_COOLDOWN_MS}
                value={cooldownLeft}
                style={{ width: "100%", marginTop: 8 }}
              />
            )}
          </div>
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
    </main>
  );
}
