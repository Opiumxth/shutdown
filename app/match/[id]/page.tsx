"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { usePortalMatch } from "@/hooks/usePortalMatch";
import { ErrorPopup } from "@/components/minigame/ErrorPopup";
import { XPWindow } from "@/components/xp-ui/XPWindow";
import { NetworkMap } from "@/components/xp-ui/NetworkMap";
import { Taskbar } from "@/components/xp-ui/Taskbar";
import { DecorativeXPError } from "@/components/xp-ui/DecorativeXPError";
import { BSOD } from "@/components/xp-ui/BSOD";
import { VictoryWindow } from "@/components/xp-ui/VictoryWindow";
import { SystemLog } from "@/components/xp-ui/SystemLog";
import { AgentMarketplace, type AgentType, MAX_AGENTS_PER_TYPE } from "@/components/xp-ui/AgentMarketplace";
import { ActionNode, type HubTask } from "@/components/xp-ui/ActionNode";
import { PuzzleGame } from "@/components/minigame/PuzzleGame";
import type { PuzzleData, PuzzleResult } from "@/components/minigame/types";
import { MAX_HP, PUZZLE_DEADLINE_MS } from "@/lib/constants";
import { sound } from "@/lib/sound";

const TASK_REWARD = 50;
const TASK_DEADLINE_MS = 10 * 60 * 1000;
const MATCH_DURATION_S = 5 * 60;

const AGENT_COSTS: Record<AgentType, number> = {
  miner: 50,
  defender: 100,
  attacker: 150,
};

const NODE_AGENTS: AgentType[] = ["miner", "defender", "attacker"];

const NODE_CLASSES: Record<AgentType, string> = {
  miner: "absolute top-[20%] left-1/2 -translate-x-1/2 -translate-y-1/2",
  defender: "absolute top-1/2 left-[20%] -translate-x-1/2 -translate-y-1/2",
  attacker: "absolute top-[80%] left-1/2 -translate-x-1/2 -translate-y-1/2",
};

const ATTACK_NODE_CLASS =
  "absolute top-1/2 left-[80%] -translate-x-1/2 -translate-y-1/2 scale-[1.3] transition-transform";

const ATTACK_AUTO_INTERVAL_MS = 15 * 1000;
const ATTACKER_COOLDOWN_S = 15;
const DEFENDER_COOLDOWN_S = 20;
const ATTACK_MAIN_COOLDOWN_S = 25;
const MINER_TASK_INTERVAL_MS = 10 * 1000;

const MINER_TASK_TEMPLATES: Omit<HubTask, "id">[] = [
  {
    kind: "synergy",
    type: "synergy",
    theme: "software",
    title: "COMBO DE MÓDULOS",
    instruction: "Selecciona los 3 módulos que forman un combo válido.",
    context: "> optimizador",
    options: ["Cache", "Swap", "GC", "Defrag", "Firewall", "Backup"],
    correctAnswer: ["Cache", "Swap", "GC"],
  },
  {
    kind: "intruder",
    type: "intruder",
    theme: "network",
    title: "INTRUSIÓN",
    instruction: "Elige la respuesta correcta.",
    context: "> nmap 192.168.1.0/24",
    options: [
      "Filtrar puertos cerrados",
      "Bloquear puerto 22",
      "Aislar host intruso",
      "Aumentar TTL",
    ],
    correctAnswer: ["Aislar host intruso"],
  },
  {
    kind: "debug",
    type: "debug",
    theme: "software",
    title: "DEPURACIÓN",
    instruction: "Selecciona el fallo a corregir.",
    context: "> core dump",
    options: [
      "Referencia nula",
      "Latencia alta",
      "Fuga de memoria",
      "Caché vacía",
    ],
    correctAnswer: ["Fuga de memoria"],
  },
  {
    kind: "upgrade",
    type: "upgrade",
    theme: "software",
    title: "MEJORA",
    instruction: "Elige la mejora correcta.",
    context: "> build 7.1",
    options: [
      "Parche de seguridad",
      "Nuevo tema",
      "Créditos",
      "Debugging",
    ],
    correctAnswer: ["Parche de seguridad"],
  },
];

// One FIFO queue per node slot. 4 tasks guaranteed for SAFE MODE: slot 0 holds
// two (boot-seq-1 then init-synergy), slots 1 and 2 hold one each.
const INITIAL_TASKS: HubTask[][] = [
  [
    {
      id: "boot-seq-1",
      kind: "boot_sequence",
      type: "sequence",
      theme: "software",
      title: "SECUENCIA DE ARRANQUE",
      instruction: "Ordena los pasos del arranque.",
      context: "> POST",
      options: ["Inicializar registro", "Cargar kernel", "Bienvenida", "POST"],
      correctAnswer: ["POST", "Cargar kernel", "Inicializar registro", "Bienvenida"],
    },
    { ...MINER_TASK_TEMPLATES[0], id: "init-synergy" },
  ],
  [
    {
      id: "boot-seq-2",
      kind: "boot_sequence",
      type: "sequence",
      theme: "network",
      title: "CONFIGURAR RED",
      instruction: "Ordena el proceso de conexión.",
      context: "> eth0",
      options: ["Configurar DNS", "Solicitar DHCP", "Asignar IP", "Conectar cable"],
      correctAnswer: ["Conectar cable", "Solicitar DHCP", "Asignar IP", "Configurar DNS"],
    },
  ],
  [{ ...MINER_TASK_TEMPLATES[1], id: "init-intruder" }],
];

const ATTACK_PUZZLE: Omit<PuzzleData, "deadline"> = {
  type: "intruder",
  theme: "software",
  title: "INTRUSIÓN",
  instruction: "Selecciona la opción correcta para desplegar el exploit.",
  context: "> nc -lvnp 4444",
  options: [
    "Payload cifrado",
    "Backdoor habilitado",
    "Rootkit instalado",
    "Firma de bajo nivel",
  ],
  correctAnswer: ["Firma de bajo nivel"],
};

export default function MatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ theme?: string }>;
}) {
  const { id } = use(params);
  const selectedTheme = use(searchParams)?.theme?.trim() || "Software";
  const {
    status,
    participantCount,
    myHealth,
    opponentHealth,
    activeAttackPuzzle,
    activeDefensePuzzle,
    incomingAttackPopups,
    attack,
    resolveAttack,
    resolveDefense,
  } = usePortalMatch(id);

  const [attackerCooldowns, setAttackerCooldowns] = useState<number[]>([0, 0, 0]);
  const [defenderCooldowns, setDefenderCooldowns] = useState<number[]>([0, 0, 0]);
  const [mainCannonCooldown, setMainCannonCooldown] = useState(0);
  const [shaking, setShaking] = useState(false);
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [tokens, setTokens] = useState(0);
  const [activeTasks, setActiveTasks] = useState<HubTask[][]>(INITIAL_TASKS);
  const activeTaskNodeRef = useRef(-1);
  const taskSeqRef = useRef(0);
  const activeTasksRef = useRef<HubTask[][]>(INITIAL_TASKS);
  const [agentCounts, setAgentCounts] = useState<Record<AgentType, number>>({
    miner: 0,
    defender: 0,
    attacker: 0,
  });
  const attackerCooldownsRef = useRef<number[]>([0, 0, 0]);
  const defenderCooldownsRef = useRef<number[]>([0, 0, 0]);
  const passiveAttackInFlightRef = useRef(false);
  const [isPuzzleOpen, setIsPuzzleOpen] = useState(false);
  const isPuzzleOpenRef = useRef(false);
  const mainCannonCooldownRef = useRef(0);
  const [attackPuzzleDeadline, setAttackPuzzleDeadline] = useState(0);
  const [activeTaskPuzzle, setActiveTaskPuzzle] = useState<HubTask | null>(null);
  const [taskPuzzleDeadline, setTaskPuzzleDeadline] = useState(0);
  const [matchTimeLeft, setMatchTimeLeft] = useState(MATCH_DURATION_S);
  const prevHealthRef = useRef(myHealth);
  const prevOpponentHealthRef = useRef(opponentHealth);
  const wasRivalConnectedRef = useRef(participantCount >= 2);
  const lastDefenseDeadlineRef = useRef<number | null>(null);
  const isGracePeriod = matchTimeLeft > 240;
  const activePopups = [
    activeDefensePuzzle,
    activeAttackPuzzle,
    activeTaskPuzzle,
    isPuzzleOpen ? ATTACK_PUZZLE : null,
  ].filter(Boolean);

  const [myLogs, setMyLogs] = useState<string[]>([
    "> [SYS] Conectando a canal seguro...",
    "> [INFO] Estado: Ready.",
  ]);
  const [rivalLogs, setRivalLogs] = useState<string[]>([]);

  useEffect(() => {
    activeTasksRef.current = activeTasks;
  }, [activeTasks]);

  const generateRandomTask = useCallback((): HubTask => {
    const template =
      MINER_TASK_TEMPLATES[taskSeqRef.current % MINER_TASK_TEMPLATES.length];
    taskSeqRef.current += 1;
    return { ...template, id: `miner-task-${taskSeqRef.current}` };
  }, []);

  // MASTER ATTACK PIPELINE. Both entry points route here and nowhere else:
  //   - passive subagent interval -> executeAttack(true)
  //   - winning the ATACAR minigame  -> executeAttack(false)
  // The single broadcast (payload with id/x/y/isMinor/message) is built inside
  // usePortalMatch.attack(), the only place that constructs the payload and
  // registers the turn for the shared damage formula.
  const executeAttack = useCallback(
    (isMinor: boolean) => attack(selectedTheme, { isMinor, silent: isMinor }),
    [attack, selectedTheme],
  );

  // Ref mirror so the passive setInterval always calls the freshest closure
  // (prevents silent stale-closure failures and lets the effect avoid a
  // teardown/re-create on every executeAttack identity change).
  const executeAttackRef = useRef(executeAttack);
  useEffect(() => {
    executeAttackRef.current = executeAttack;
  }, [executeAttack]);

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

  const seenIncomingDeadlinesRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    for (const popup of incomingAttackPopups) {
      if (seenIncomingDeadlinesRef.current.has(popup.deadline)) continue;
      seenIncomingDeadlinesRef.current.add(popup.deadline);
      if (popup.isMinor) sound.playExclamation();
      else sound.playError();
    }
  }, [incomingAttackPopups]);

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
    attackerCooldownsRef.current = attackerCooldowns;
  }, [attackerCooldowns]);

  useEffect(() => {
    defenderCooldownsRef.current = defenderCooldowns;
  }, [defenderCooldowns]);

  useEffect(() => {
    isPuzzleOpenRef.current = isPuzzleOpen;
  }, [isPuzzleOpen]);

  useEffect(() => {
    mainCannonCooldownRef.current = mainCannonCooldown;
  }, [mainCannonCooldown]);

  useEffect(() => {
    const interval = setInterval(() => {
      setAttackerCooldowns((prev) => prev.map((c) => Math.max(0, c - 1)));
      setDefenderCooldowns((prev) => prev.map((c) => Math.max(0, c - 1)));
      setMainCannonCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (agentCounts.miner === 0) return;
    const interval = setInterval(() => {
      setTokens((t) => t + agentCounts.miner);
    }, 1000);
    return () => clearInterval(interval);
  }, [agentCounts.miner]);

  useEffect(() => {
    if (agentCounts.miner === 0) return;
    const interval = setInterval(() => {
      const willAddTask = activeTasksRef.current.some(
        (queue, i) => i < agentCounts.miner && queue.length === 0,
      );
      if (willAddTask) sound.playBalloon();
      setActiveTasks((prev) => {
        const newTasks = prev.map((queue) => [...queue]);
        let updated = false;
        for (let i = 0; i < agentCounts.miner; i++) {
          if (newTasks[i].length === 0) {
            newTasks[i] = [generateRandomTask()];
            updated = true;
          }
        }
        return updated ? newTasks : prev;
      });
    }, MINER_TASK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [agentCounts.miner, generateRandomTask]);

  useEffect(() => {
    if (agentCounts.defender === 0) return;
    if (!activeDefensePuzzle) return;
    if (activePopups.length === 0) return;
    const firstAvailable = defenderCooldowns.findIndex(
      (c, i) => agentCounts.defender >= i + 1 && c === 0,
    );
    if (firstAvailable === -1) return;
    queueMicrotask(() => {
      setDefenderCooldowns((prev) => {
        const next = [...prev];
        next[firstAvailable] = DEFENDER_COOLDOWN_S;
        return next;
      });
      setMyLogs((prev) => [
        ...prev,
        "> [NET] Subagente DEFENDER bloqueó el ataque entrante.",
      ]);
      sound.playRecycle();
    });
    void resolveDefense({ success: true, elapsed: 0 });
  }, [
    agentCounts.defender,
    activeDefensePuzzle,
    activePopups.length,
    defenderCooldowns,
    resolveDefense,
  ]);

  useEffect(() => {
    if (agentCounts.attacker === 0) return;
    if (isGracePeriod) return;
    const interval = setInterval(() => {
      if (activeAttackPuzzle) return;
      if (passiveAttackInFlightRef.current) return;
      const firstAvailable = attackerCooldownsRef.current.findIndex(
        (c, i) => agentCounts.attacker >= i + 1 && c === 0,
      );
      if (firstAvailable === -1) return;
      setAttackerCooldowns((prev) => {
        const next = [...prev];
        next[firstAvailable] = ATTACKER_COOLDOWN_S;
        return next;
      });
      passiveAttackInFlightRef.current = true;
      sound.playClick();
      setMyLogs((prev) => [
        ...prev,
        "> [ATTACK] Subagente ATTACKER lanza ataque pasivo de bajo impacto.",
      ]);
      // Identical pipeline to the manual attack, just isMinor: true. The ref
      // guarantees the freshest executeAttack even if the interval was created
      // with an older closure.
      void executeAttackRef.current(true).catch(() => {
        passiveAttackInFlightRef.current = false;
      });
      setTimeout(() => {
        passiveAttackInFlightRef.current = false;
        void resolveAttack({ success: true, elapsed: PUZZLE_DEADLINE_MS });
      }, PUZZLE_DEADLINE_MS - 1000);
    }, ATTACK_AUTO_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [
    agentCounts.attacker,
    isGracePeriod,
    activeAttackPuzzle,
    resolveAttack,
  ]);

  const matchRunning = matchTimeLeft > 0;

  const wasGracePeriodRef = useRef(isGracePeriod);

  useEffect(() => {
    if (wasGracePeriodRef.current && !isGracePeriod) {
      sound.playLogon();
    }
    wasGracePeriodRef.current = isGracePeriod;
  }, [isGracePeriod]);

  useEffect(() => {
    if (!matchRunning) return;
    const interval = setInterval(() => {
      setMatchTimeLeft((left) => Math.max(0, left - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [matchRunning]);

  function handleGameOver() {
    setMyLogs((prev) => [
      ...prev,
      "> [SYS] Tiempo agotado. Finalizando partida...",
    ]);
  }

  useEffect(() => {
    if (matchTimeLeft !== 0) return;
    const timeout = setTimeout(handleGameOver, 0);
    return () => clearTimeout(timeout);
  }, [matchTimeLeft]);

  function handleAttack() {
    // Main cannon goes on cooldown the instant a manual attack is launched
    // (set both state and ref synchronously so no same-tick click slips in).
    setMainCannonCooldown(ATTACK_MAIN_COOLDOWN_S);
    mainCannonCooldownRef.current = ATTACK_MAIN_COOLDOWN_S;
    sound.playClick();
    setMyLogs((prev) => [
      ...prev,
      "> [ATTACK] Desplegando vector de ataque...",
    ]);
    void executeAttack(false);
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

  function handleNodeClick(index: number) {
    const task = activeTasks[index]?.[0] ?? null;
    if (!task) {
      sound.playClick();
      setMyLogs((prev) => [
        ...prev,
        "> [INFO] Ranura de tarea vacía.",
      ]);
      return;
    }
    sound.playClick();
    activeTaskNodeRef.current = index;
    setActiveTaskPuzzle(task);
    // Date.now() is impure but this is an event handler, not render.
    // eslint-disable-next-line react-hooks/purity
    setTaskPuzzleDeadline(Date.now() + TASK_DEADLINE_MS);
  }

  function handleAttackClick() {
    // Double-click guard: block while the attack modal is open or during the
    // state transition, and while the main cannon is on cooldown. The refs
    // keep this airtight even against stale-closure clicks in the same tick.
    if (isPuzzleOpenRef.current || mainCannonCooldownRef.current > 0) return;
    if (isGracePeriod) {
      sound.playNavigation();
      setMyLogs((prev) => [
        ...prev,
        "> [WARN] Ataques bloqueados durante el tiempo de gracia.",
      ]);
      return;
    }
    sound.playNavigation();
    setAttackPuzzleDeadline(Date.now() + PUZZLE_DEADLINE_MS);
    setIsPuzzleOpen(true);
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

  const timerDisplay = `${String(Math.floor(matchTimeLeft / 60)).padStart(2, "0")}:${String(
    matchTimeLeft % 60,
  ).padStart(2, "0")}`;

  const gameOverSoundPlayedRef = useRef(false);

  useEffect(() => {
    if (gameOverSoundPlayedRef.current) return;
    if (!(iLost || rivalLost)) return;
    gameOverSoundPlayedRef.current = true;
    sound.playShutdown();
  }, [iLost, rivalLost]);
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
                  <div className="absolute inset-0 pointer-events-none z-10">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-[1.5] z-10 transition-transform">
                      <div className="attack-node relative flex flex-col items-center pointer-events-auto z-10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/assets/icons/central-node.png"
                          alt="Agent Marketplace"
                          draggable={false}
                          className="w-16 h-16 object-contain [image-rendering:pixelated] cursor-pointer"
                          onClick={() => setShowMarketplace((v) => !v)}
                        />
                        <span
                          className="hud mt-1"
                          style={{ fontSize: 10, minHeight: "15px" }}
                        >
                          <span className="text-green-500 font-bold tracking-widest">
                            AGENT MARKETPLACE
                          </span>
                        </span>
                      </div>
                    </div>

                    {NODE_AGENTS.map((agentType, index) => {
                      return (
                        <div key={agentType}>
                          <div
                            className={`pointer-events-auto ${NODE_CLASSES[agentType]} z-20`}
                          >
                            <ActionNode
                              task={activeTasks[index]?.[0] ?? null}
                              hasMiner={agentCounts.miner >= index + 1}
                              hasDefender={agentCounts.defender >= index + 1}
                              hasAttacker={agentCounts.attacker >= index + 1}
                              attackerCooldown={attackerCooldowns[index]}
                              defenderCooldown={defenderCooldowns[index]}
                              onTaskClick={() => handleNodeClick(index)}
                            />
                          </div>
                        </div>
                      );
                    })}

                    <div
                      className={`pointer-events-auto ${ATTACK_NODE_CLASS} z-20`}
                    >
                      <ActionNode
                        task={null}
                        label="ATACAR"
                        iconOverride="/assets/icons/attacker-node.png"
                        onNodeClick={handleAttackClick}
                        isDisabled={isPuzzleOpen || mainCannonCooldown > 0}
                        cooldown={mainCannonCooldown}
                      />
                    </div>
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
                counts={agentCounts}
                onClose={() => setShowMarketplace(false)}
                onPurchase={(agentType) => {
                  if (agentCounts[agentType] >= MAX_AGENTS_PER_TYPE) return;
                  const cost = AGENT_COSTS[agentType];
                  if (tokens < cost) return;
                  sound.playHardwareInsert();
                  setTokens((prev) => prev - cost);
                  setAgentCounts((prev) => ({
                    ...prev,
                    [agentType]: prev[agentType] + 1,
                  }));
                  setMyLogs((prev) => [
                    ...prev,
                    `> [NET] Subagente ${agentType.toUpperCase()} desplegado (${agentCounts[agentType] + 1}/${MAX_AGENTS_PER_TYPE}).`,
                  ]);
                }}
              />
            </div>
          )}

          {isPuzzleOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <PuzzleGame
                {...ATTACK_PUZZLE}
                theme={selectedTheme}
                deadline={attackPuzzleDeadline}
                onClose={() => setIsPuzzleOpen(false)}
                onResult={(result) => {
                  setIsPuzzleOpen(false);
                  if (result.success) {
                    handleAttack();
                  }
                }}
              />
            </div>
          )}

          {activeTaskPuzzle && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <PuzzleGame
                {...activeTaskPuzzle}
                deadline={taskPuzzleDeadline}
                onClose={() => setActiveTaskPuzzle(null)}
      onResult={(result) => {
        setActiveTaskPuzzle(null);
        if (result.success) {
          sound.playDing();
          setTokens((prev) => prev + TASK_REWARD);
          setActiveTasks((prev) => {
            const index = activeTaskNodeRef.current;
            if (index < 0 || index >= prev.length || prev[index].length === 0)
              return prev;
            const next = prev.map((queue) => [...queue]);
            next[index] = next[index].slice(1);
            return next;
          });
          setMyLogs((prev) => [
            ...prev,
            `> [SUCCESS] Tarea completada. +${TASK_REWARD} tokens.`,
          ]);
        }
      }}
              />
            </div>
          )}

          <SystemLog logs={myLogs} maxEntries={8} />

          {incomingAttackPopups.map((popup) => (
            <ErrorPopup key={popup.id} decorative {...popup} />
          ))}

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

      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[100] bg-black border-2 border-[#000080] text-white font-mono px-4 py-1 rounded shadow-lg text-center tracking-widest flex flex-col items-center justify-center min-w-[160px]">
        {matchTimeLeft > 240 ? (
          <>
            <span className="text-sm text-green-400 animate-pulse">SAFE MODE</span>
            <span className="text-xs text-gray-400">{timerDisplay}</span>
          </>
        ) : matchTimeLeft > 0 ? (
          <span className="text-xl">{timerDisplay}</span>
        ) : (
          <span className="text-xl text-red-500 font-bold animate-pulse">DEATHMATCH</span>
        )}
      </div>

      <Taskbar tasks={["MI SISTEMA", "SISTEMA RIVAL"]} />
    </main>
  );
}
