"use client";

import { use, useEffect, useState } from "react";
import { usePortalMatch } from "@/hooks/usePortalMatch";
import { ErrorPopup } from "@/components/minigame/ErrorPopup";
import { XPWindow } from "@/components/xp-ui/XPWindow";
import { NetworkMap } from "@/components/xp-ui/NetworkMap";
import { Taskbar } from "@/components/xp-ui/Taskbar";
import { DecorativeXPError } from "@/components/xp-ui/DecorativeXPError";
import { BSOD } from "@/components/xp-ui/BSOD";
import { VictoryWindow } from "@/components/xp-ui/VictoryWindow";
import type { PuzzleData, PuzzleResult } from "@/components/minigame/types";
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

  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [flashKey, setFlashKey] = useState(0);
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
    setFlashKey((key) => key + 1);
    void attack("Software");
  }

  const [rivalErrors, setRivalErrors] = useState<PuzzleData[]>([]);

  function handleResolveAttack(result: PuzzleResult) {
    if (result.success && activeAttackPuzzle) {
      const puzzle = activeAttackPuzzle;
      setRivalErrors((prev) =>
        prev.some((p) => p.deadline === puzzle.deadline)
          ? prev
          : [...prev, puzzle].slice(-5),
      );
    }
    void resolveAttack(result);
  }

  function positionFromSeed(seed: number) {
    const a = (seed * 1103515245 + 12345) % 2147483648;
    const b = (a * 1103515245 + 12345) % 2147483648;
    const top = a % 2 === 0 ? 6 + (a % 20) : 72 + (a % 18);
    const left = b % 2 === 0 ? 6 + (b % 20) : 72 + (b % 18);
    return { top: `${top}%`, left: `${left}%` };
  }

  const iLost = myHealth <= 0;
  const rivalLost = opponentHealth <= 0;
  const myCorruption = Math.max(0, Math.min(1, myHealth / MAX_HP));
  const rivalCorruption = Math.max(0, Math.min(1, opponentHealth / MAX_HP));

  return (
    <main className="relative flex h-dvh flex-col overflow-hidden">
      <div className="grid w-full flex-1 grid-cols-2 gap-3 p-4">
        <section className="relative min-h-0 overflow-hidden">
          {iLost ? (
            <BSOD stop="0x0000007B" code="ERR_RIVAL_TOO_GOOD" />
          ) : rivalLost ? (
            <VictoryWindow />
          ) : (
            <>
              <div
                className="pane"
                style={{
                  filter: `saturate(${myCorruption}) grayscale(${1 - myCorruption})`,
                }}
              >
                <XPWindow fill title={`MI SISTEMA — ${id}`}>
                  <NetworkMap
                    node={
                      <div className="attack-node">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/assets/icons/central-node.png"
                          alt="Atacar"
                          className={`w-16 h-16 object-contain [image-rendering:pixelated] ${
                            onCooldown
                              ? "opacity-40 cursor-not-allowed"
                              : "cursor-pointer"
                          }`}
                          onClick={handleAttack}
                        />
                        <div className="h-1 w-24 overflow-hidden bg-zinc-700">
                          <div
                            className="h-full bg-green-500"
                            style={{
                              width: `${(cooldownLeft / ATTACK_COOLDOWN_MS) * 100}%`,
                            }}
                          />
                        </div>
                        {onCooldown && (
                          <span className="hud" style={{ fontSize: 10 }}>
                            {Math.ceil(cooldownLeft / 1000)}s
                          </span>
                        )}
                      </div>
                    }
                  >
                    <p className="hud">Estado: {status}</p>
                    <p className="hud">
                      {participantCount < 2
                        ? "Esperando rival..."
                        : "Rival conectado"}
                    </p>
                    <p className="hud">HP: {myHealth.toFixed(2)}</p>
                  </NetworkMap>
                </XPWindow>
              </div>

              {activeDefensePuzzle && (
                <ErrorPopup
                  key={activeDefensePuzzle.deadline}
                  {...activeDefensePuzzle}
                  onResult={resolveDefense}
                />
              )}
              {activeAttackPuzzle && (
                <ErrorPopup
                  key={activeAttackPuzzle.deadline}
                  defaultExpanded
                  {...activeAttackPuzzle}
                  onResult={handleResolveAttack}
                />
              )}
            </>
          )}
        </section>

        <section className="relative min-h-0 overflow-hidden">
          {rivalLost ? (
            <BSOD stop="0x0000007B" code="ERR_RIVAL_TOO_GOOD" />
          ) : (
            <>
              <div
                className="pane"
                style={{
                  filter: `saturate(${rivalCorruption}) grayscale(${1 - rivalCorruption})`,
                }}
              >
                <XPWindow fill title="SISTEMA RIVAL">
                  <NetworkMap
                    node={
                      <span className="network-node win-icon" aria-hidden="true" />
                    }
                  >
                    <p className="hud">HP: {opponentHealth.toFixed(2)}</p>
                    <p className="hud">{iLost ? "Caído" : "En línea"}</p>
                  </NetworkMap>
                </XPWindow>
              </div>

              {rivalErrors.map((puzzle) => (
                <DecorativeXPError
                  key={puzzle.deadline}
                  position={positionFromSeed(puzzle.deadline)}
                />
              ))}
            </>
          )}
        </section>
      </div>

      {flashKey > 0 && (
        <div key={flashKey} className="screen-flash" aria-hidden="true" />
      )}

      <Taskbar tasks={["MI SISTEMA", "SISTEMA RIVAL"]} />
    </main>
  );
}
