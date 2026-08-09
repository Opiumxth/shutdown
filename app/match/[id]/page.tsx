"use client";

import { use, useEffect, useRef, useState } from "react";
import { usePortalMatch } from "@/hooks/usePortalMatch";
import { ErrorPopup } from "@/components/minigame/ErrorPopup";
import { XPWindow } from "@/components/xp-ui/XPWindow";
import { NetworkMap } from "@/components/xp-ui/NetworkMap";
import { Taskbar } from "@/components/xp-ui/Taskbar";
import { DecorativeXPError } from "@/components/xp-ui/DecorativeXPError";
import { BSOD } from "@/components/xp-ui/BSOD";
import { VictoryWindow } from "@/components/xp-ui/VictoryWindow";
import { SystemLog } from "@/components/xp-ui/SystemLog";
import { AgentMarketplace, type AgentType } from "@/components/xp-ui/AgentMarketplace";
import { ActionNode } from "@/components/xp-ui/ActionNode";
import type { PuzzleData, PuzzleResult } from "@/components/minigame/types";
import { ATTACK_COOLDOWN_MS, MAX_HP } from "@/lib/constants";
import { sound } from "@/lib/sound";

export type NodeRole = "idle" | AgentType;

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
  const [shaking, setShaking] = useState(false);
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [tokens, setTokens] = useState(0);
  const [nodeRoles, setNodeRoles] = useState<NodeRole[]>([
    "idle",
    "idle",
    "idle",
  ]);
  const prevHealthRef = useRef(myHealth);
  const prevOpponentHealthRef = useRef(opponentHealth);
  const wasRivalConnectedRef = useRef(participantCount >= 2);
  const lastDefenseDeadlineRef = useRef<number | null>(null);
  const onCooldown = cooldownLeft > 0;

  const [myLogs, setMyLogs] = useState<string[]>([
    "> [SYS] Conectando a canal seguro...",
    "> [INFO] Estado: Ready.",
  ]);
  const [rivalLogs, setRivalLogs] = useState<string[]>([]);

  useEffect(() => {
    const connected = participantCount >= 2;
    if (connected && !wasRivalConnectedRef.current) {
      setMyLogs((prev) => [
        ...prev,
        "> [NET] Conexión establecida con nodo rival.",
      ]);
    }
    wasRivalConnectedRef.current = connected;
  }, [participantCount]);

  useEffect(() => {
    if (opponentHealth < prevOpponentHealthRef.current) {
      setMyLogs((prev) => [
        ...prev,
        `> [SUCCESS] Daño infligido. HP Rival: ${opponentHealth.toFixed(2)}.`,
      ]);
      setRivalLogs((prev) => [
        ...prev,
        "> [WARN] Alerta: Invasión detectada en sector secundario.",
      ]);
    }
    prevOpponentHealthRef.current = opponentHealth;
  }, [opponentHealth]);

  useEffect(() => {
    if (myHealth < prevHealthRef.current) {
      setShaking(true);
      setMyLogs((prev) => [
        ...prev,
        "> [WARN] Alerta: Invasión detectada en sector secundario.",
      ]);
    }
    prevHealthRef.current = myHealth;
  }, [myHealth]);

  useEffect(() => {
    if (
      activeDefensePuzzle &&
      activeDefensePuzzle.deadline !== lastDefenseDeadlineRef.current
    ) {
      lastDefenseDeadlineRef.current = activeDefensePuzzle.deadline;
      setMyLogs((prev) => [
        ...prev,
        "> [WARN] Alerta: Invasión detectada en sector secundario.",
      ]);
    }
  }, [activeDefensePuzzle]);

  useEffect(() => {
    if (!shaking) return;
    const timeout = setTimeout(() => setShaking(false), 220);
    return () => clearTimeout(timeout);
  }, [shaking]);

  useEffect(() => {
    if (!onCooldown) return;
    const interval = setInterval(() => {
      setCooldownLeft((left) => Math.max(0, left - 250));
    }, 250);
    return () => clearInterval(interval);
  }, [onCooldown]);

  function handleAttack() {
    if (onCooldown) return;
    sound.playClick();
    setCooldownLeft(ATTACK_COOLDOWN_MS);
    setMyLogs((prev) => [
      ...prev,
      "> [ATTACK] Desplegando vector de ataque...",
    ]);
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
      setTokens((prev) => prev + 25);
    }
    void resolveAttack(result);
  }

  const NODE_COSTS: Record<AgentType, number> = {
    miner: 50,
    defender: 100,
    attacker: 150,
  };

  function handleNodeClick(index: number) {
    const role = nodeRoles[index];
    if (role === "idle") {
      if (tokens < NODE_COSTS.miner) {
        setMyLogs((prev) => [
          ...prev,
          "> [WARN] Tokens insuficientes para asignar nodo.",
        ]);
        return;
      }
      sound.playClick();
      setTokens((prev) => prev - NODE_COSTS.miner);
      setNodeRoles((prev) =>
        prev.map((r, i) => (i === index ? "miner" : r)),
      );
      setMyLogs((prev) => [
        ...prev,
        "> [NET] Nodo asignado como MINER (+tokens/s).",
      ]);
      return;
    }
    if (role === "attacker") {
      handleAttack();
      return;
    }
    sound.playClick();
    setMyLogs((prev) => [
      ...prev,
      `> [INFO] Nodo ${index + 1} (${role.toUpperCase()}) seleccionado.`,
    ]);
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
  const critical = !iLost && myHealth / MAX_HP < 0.3;

  const mainClass = [
    "relative",
    "flex",
    "h-dvh",
    "flex-col",
    "overflow-hidden",
    shaking ? "screen-shake" : "",
    critical ? "screen-critical" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <main className={mainClass}>
      <div className="grid w-full flex-1 grid-cols-2 gap-3 p-4">
        <section className="relative flex min-h-0 flex-col overflow-hidden">
          <div
            className="pane"
            style={{
              filter: `saturate(${myCorruption}) grayscale(${1 - myCorruption})`,
            }}
          >
            <XPWindow fill title={`MI SISTEMA — ${id}`}>
              <NetworkMap
                node={
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="attack-node relative flex flex-col items-center pointer-events-auto">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/assets/icons/central-node.png"
                          alt="Agent Marketplace"
                          draggable={false}
                          className={`w-16 h-16 object-contain [image-rendering:pixelated] ${
                            onCooldown
                              ? "opacity-40 cursor-not-allowed"
                              : "cursor-pointer"
                          }`}
                          onClick={() => setShowMarketplace((v) => !v)}
                        />
                        <span
                          className="hud mt-1"
                          style={{ fontSize: 10, minHeight: "15px" }}
                        >
                          {onCooldown ? (
                            <span className="text-cyan-400">
                              {Math.ceil(cooldownLeft / 1000)}s
                            </span>
                          ) : (
                            <span className="text-green-500 font-bold tracking-widest">
                              AGENT MARKETPLACE
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    {nodeRoles.map((role, index) => (
                      <div
                        key={index}
                        className="pointer-events-auto"
                        style={{
                          position: "absolute",
                          top: index === 2 ? "78%" : index === 0 ? "16%" : "16%",
                          left: index === 0 ? "16%" : index === 1 ? "74%" : "45%",
                          transform: "translate(-50%, -50%)",
                        }}
                      >
                        <ActionNode
                          role={role}
                          onClick={() => handleNodeClick(index)}
                          cooldownRatio={cooldownLeft / ATTACK_COOLDOWN_MS}
                          onCooldown={onCooldown}
                        />
                      </div>
                    ))}
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
                <p className="hud">Tokens: {tokens}</p>
              </NetworkMap>
            </XPWindow>
          </div>

          {showMarketplace && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50">
              <AgentMarketplace
                tokens={tokens}
                onClose={() => setShowMarketplace(false)}
                onPurchase={(agentType) => {
                  const cost =
                    agentType === "miner" ? 50 : agentType === "defender" ? 100 : 150;
                  if (tokens < cost) return;
                  setTokens((prev) => prev - cost);
                  const idleIndex = nodeRoles.indexOf("idle");
                  setNodeRoles((prev) =>
                    prev.map((r, i) => (i === idleIndex ? agentType : r)),
                  );
                  setMyLogs((prev) => [
                    ...prev,
                    `> [NET] Nodo asignado como ${agentType.toUpperCase()}.`,
                  ]);
                }}
              />
            </div>
          )}

          <SystemLog logs={myLogs} maxEntries={8} />

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
        </section>

        <section className="relative flex min-h-0 flex-col overflow-hidden">
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

          <SystemLog logs={rivalLogs} maxEntries={8} />

          {rivalErrors.map((puzzle) => (
            <DecorativeXPError
              key={puzzle.deadline}
              position={positionFromSeed(puzzle.deadline)}
            />
          ))}
        </section>
      </div>

      {iLost ? <BSOD /> : rivalLost ? <VictoryWindow /> : null}

      <Taskbar tasks={["MI SISTEMA", "SISTEMA RIVAL"]} />
    </main>
  );
}
