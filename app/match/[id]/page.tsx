"use client";

import { use, useEffect, useState } from "react";
import { usePortalMatch } from "@/hooks/usePortalMatch";
import { ErrorPopup } from "@/components/minigame/ErrorPopup";
import { BSOD } from "@/components/xp-ui/BSOD";
import { VictoryWindow } from "@/components/xp-ui/VictoryWindow";
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

  const iLost = myHealth <= 0;
  const rivalLost = opponentHealth <= 0;
  const myCorruption = Math.max(0, Math.min(1, myHealth / MAX_HP));
  const rivalCorruption = Math.max(0, Math.min(1, opponentHealth / MAX_HP));

  return (
    <main className="relative flex h-dvh overflow-hidden p-4">
      <div className="grid w-full grid-cols-2 gap-3">
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
                <div className="window fill">
                  <div className="title-bar">
                    <div className="title-bar-text">MI SISTEMA — {id}</div>
                  </div>
                  <div className="window-body network-map">
                    <div className="network-ring ring-1" />
                    <div className="network-ring ring-2" />
                    <div className="network-ring ring-3" />
                    <p className="hud">Estado: {status}</p>
                    <p className="hud">
                      {participantCount < 2
                        ? "Esperando rival..."
                        : "Rival conectado"}
                    </p>
                    <p className="hud">HP: {myHealth.toFixed(2)}</p>
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
                  </div>
                </div>
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
                  onResult={resolveAttack}
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
                <div className="window fill">
                  <div className="title-bar">
                    <div className="title-bar-text">SISTEMA RIVAL</div>
                  </div>
                  <div className="window-body network-map">
                    <div className="network-ring ring-1" />
                    <div className="network-ring ring-2" />
                    <div className="network-ring ring-3" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className="network-node"
                      src="/assets/icons/network.png"
                      alt=""
                    />
                    <p className="hud">HP: {opponentHealth.toFixed(2)}</p>
                    <p className="hud">{iLost ? "Caído" : "En línea"}</p>
                  </div>
                </div>
              </div>

              {activeAttackPuzzle && (
                <ErrorPopup
                  key={`rival-def-${activeAttackPuzzle.deadline}`}
                  decorative
                  {...activeAttackPuzzle}
                />
              )}
              {activeDefensePuzzle && (
                <ErrorPopup
                  key={`rival-atk-${activeDefensePuzzle.deadline}`}
                  decorative
                  {...activeDefensePuzzle}
                />
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
