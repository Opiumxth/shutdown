"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useChannel } from "@portalsdk/react";
import { calculateDamage } from "@/lib/damage";
import { MAX_HP, MAJOR_DAMAGE, MINOR_DAMAGE, XP_ERROR_MESSAGES } from "@/lib/constants";
import type {
  PuzzleApiResponse,
  PuzzleData,
  PuzzleResult,
  PuzzleWithId,
} from "@/components/minigame/types";

// RESOLVED BLOCKER (as of @portalsdk/core@0.1.5, the latest published version):
// ephemeral sends never reach the other peer. ChannelBuffer.ingest() in
// node_modules/@portalsdk/core/dist/index.js explicitly drops any incoming
// message with `ephemeral: true` before it reaches "message" listeners —
// see its own SPEC comment ("dropped here rather than guessed at"). Verified
// live: a persistent send arrives via onMessage with a timestamp matching
// the sender's ack exactly; the same send with ephemeral:true never arrives
// at all. Fix applied: the "defense"/"result" sends below are now plain
// persistent sends (no `ephemeral`) — channel history for a hackathon-length
// 1v1 match is a non-issue, and the rest of the turn/damage logic is
// unaffected either way.
//
// Same limitation applies to the live-cursor extra (fase-1.md): cursor
// position can't go over `ephemeral` sends either, since the rival's client
// would never see it. components/cursor/InterferenceLayer.tsx already does
// this correctly via `channel.setMetadata()` (throttled), not `send` — that
// component owns cursor broadcast entirely; this hook does not.
type TurnRole = "attacker" | "defender";

type DefenseMessageContent = PuzzleWithId & { turnId: string; isMinor?: boolean };

type ResultMessageContent = {
  turnId: string;
  role: TurnRole;
  success: boolean;
  elapsed: number;
};

// One standardized shape for emitted AND received attack popups. Everything the
// rival's active-popups state needs travels inside the payload itself: a unique
// `id`, viewport coordinates `x`/`y`, the `isMinor` flag, and the XP error
// `message` shown by ErrorPopup (all selected by the emitter).
type AttackPopupPayload = PuzzleData & {
  id: string;
  x: number;
  y: number;
  isMinor: boolean;
  message: string;
};

export type IncomingAttackPopup = AttackPopupPayload;

type MatchMessage = DefenseMessageContent | ResultMessageContent | AttackPopupPayload;

const POPUP_LIFETIME_MS = 6000;

type TurnResult = { success: boolean; timestamp: number };

type PendingTurn = {
  // Which side of this turn *I* played — decides whether the computed damage
  // lands on opponentHealth (I attacked) or myHealth (I defended).
  myRole: TurnRole;
  // Portal-assigned timestamp of the "defense" message for this turn — the
  // single shared anchor both clients use to derive elapsed times.
  anchorTime: number;
  // True for passive subagent attacks: minor damage base + reduced rival popup.
  isMinor: boolean;
  attackerResult?: TurnResult;
  defenderResult?: TurnResult;
};

export function usePortalMatch(matchId: string) {
  const [myHealth, setMyHealth] = useState(MAX_HP);
  const [opponentHealth, setOpponentHealth] = useState(MAX_HP);
  const [activeAttackPuzzle, setActiveAttackPuzzle] = useState<PuzzleData | null>(null);
  const [activeDefensePuzzle, setActiveDefensePuzzle] = useState<PuzzleData | null>(null);
  const [incomingAttackPopups, setIncomingAttackPopups] = useState<IncomingAttackPopup[]>([]);

  const activeAttackTurnIdRef = useRef<string | null>(null);
  const activeDefenseTurnIdRef = useRef<string | null>(null);
  const pendingTurnsRef = useRef(new Map<string, PendingTurn>());
  const processedTurnIdsRef = useRef(new Set<string>());
  const didRestoreHistoryRef = useRef(false);
  const sentPopupDeadlinesRef = useRef(new Set<number>());

  const applyResult = useCallback(
    (turnId: string, role: TurnRole, success: boolean, timestamp: number) => {
      if (processedTurnIdsRef.current.has(turnId)) return;
      const turn = pendingTurnsRef.current.get(turnId);
      if (!turn) return;

      if (role === "attacker") {
        turn.attackerResult = { success, timestamp };
      } else {
        turn.defenderResult = { success, timestamp };
      }

      if (!turn.attackerResult || !turn.defenderResult) return;

      processedTurnIdsRef.current.add(turnId);
      pendingTurnsRef.current.delete(turnId);

      const damage = calculateDamage({
        attackerElapsedMs: turn.attackerResult.timestamp - turn.anchorTime,
        defenderElapsedMs: turn.defenderResult.timestamp - turn.anchorTime,
        defenderResponded: turn.defenderResult.success,
        baseDamage: turn.isMinor ? MINOR_DAMAGE : MAJOR_DAMAGE,
      });

      if (turn.myRole === "attacker") {
        setOpponentHealth((health) => Math.max(0, health - damage));
      } else {
        setMyHealth((health) => Math.max(0, health - damage));
      }
    },
    [],
  );

  const { status, presence, messages, me, send } = useChannel<MatchMessage>({
    channelId: `match:${matchId}`,
    onMessage: (msg) => {
      if (msg.type === "defense") {
        // A duplicate delivery (at-least-once) of a turn already finished or
        // already tracked (including the echo of my own attack) is a no-op.
        const defense = msg.content as DefenseMessageContent;
        if (processedTurnIdsRef.current.has(defense.turnId)) return;
        if (pendingTurnsRef.current.has(defense.turnId)) return;

        const { turnId, ...puzzle } = defense;
        pendingTurnsRef.current.set(turnId, {
          myRole: "defender",
          anchorTime: msg.timestamp,
          isMinor: (msg.content as DefenseMessageContent).isMinor ?? false,
        });
        activeDefenseTurnIdRef.current = turnId;
        setActiveDefensePuzzle(puzzle);
      } else if (msg.type === "result") {
        const { turnId, role, success } = msg.content as ResultMessageContent;
        applyResult(turnId, role, success, msg.timestamp);
      } else if (msg.type === "attack") {
        const payload = msg.content as AttackPopupPayload;
        // Skip the self-echo of attacks I sent (mirrors the "defense" guard).
        if (sentPopupDeadlinesRef.current.has(payload.deadline)) return;
        // Store the object exactly as it arrived.
        setIncomingAttackPopups((prev) => [...prev, payload].slice(-5));
        setTimeout(() => {
          setIncomingAttackPopups((prev) =>
            prev.filter((p) => p.deadline !== payload.deadline),
          );
        }, POPUP_LIFETIME_MS);
      }
    },
  });

  useEffect(() => {
    if (status !== "ready" || !me || didRestoreHistoryRef.current) return;
    didRestoreHistoryRef.current = true;

    for (const msg of messages) {
      if (msg.type !== "defense") continue;

      const { turnId } = msg.content as DefenseMessageContent;
      if (processedTurnIdsRef.current.has(turnId)) continue;
      if (pendingTurnsRef.current.has(turnId)) continue;

      pendingTurnsRef.current.set(turnId, {
        myRole: msg.sender.id === me.id ? "attacker" : "defender",
        anchorTime: msg.timestamp,
        isMinor: (msg.content as DefenseMessageContent).isMinor ?? false,
      });
    }

    for (const msg of messages) {
      if (msg.type !== "result") continue;

      const { turnId, role, success } = msg.content as ResultMessageContent;
      applyResult(turnId, role, success, msg.timestamp);
    }
  }, [status, messages, me, applyResult]);

  const participantCount = presence?.kind === "detailed" ? presence.count : 0;

  const attack = useCallback(
    async (
      theme: string,
      options?: { isMinor?: boolean; silent?: boolean },
    ) => {
      const { isMinor = false, silent = false } = options ?? {};
      const response = await fetch("/api/puzzle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme }),
      });
      const data: PuzzleApiResponse = await response.json();
      const turnId = data.attack.puzzleId;

      // Registered before the send resolves so a self-echoed "defense"
      // message (if Portal delivers one) is recognized and ignored.
      pendingTurnsRef.current.set(turnId, {
        myRole: "attacker",
        anchorTime: 0,
        isMinor,
      });
      activeAttackTurnIdRef.current = turnId;
      if (!silent) setActiveAttackPuzzle(data.attack);

      // Unified payload for BOTH the passive subagent attack (isMinor: true)
      // and the manual ATACAR attack (isMinor: false) — the exact same
      // broadcast, differing only in the isMinor flag and the random message.
      const payload: AttackPopupPayload = {
        ...data.attack,
        id: crypto.randomUUID(),
        x: 20 + Math.random() * 60,
        y: 20 + Math.random() * 60,
        isMinor,
        message:
          XP_ERROR_MESSAGES[Math.floor(Math.random() * XP_ERROR_MESSAGES.length)],
      };
      // isMinor, id, x/y, message all live INSIDE the payload so the rival
      // receives the complete standardized object (no reconstruction needed).
      void send({
        type: "attack",
        content: payload,
      });
      sentPopupDeadlinesRef.current.add(payload.deadline);

      const ack = await send({
        type: "defense",
        content: { turnId, isMinor, ...data.defense },
      });

      const turn = pendingTurnsRef.current.get(turnId);
      if (turn) turn.anchorTime = ack.timestamp;
    },
    [send],
  );

  const resolveAttack = useCallback(
    async (result: PuzzleResult) => {
      const turnId = activeAttackTurnIdRef.current;
      activeAttackTurnIdRef.current = null;
      setActiveAttackPuzzle(null);
      if (!turnId) return;

      const ack = await send({
        type: "result",
        content: {
          turnId,
          role: "attacker",
          success: result.success,
          elapsed: result.elapsed,
        },
      });
      applyResult(turnId, "attacker", result.success, ack.timestamp);
    },
    [send, applyResult],
  );

  const resolveDefense = useCallback(
    async (result: PuzzleResult) => {
      const turnId = activeDefenseTurnIdRef.current;
      activeDefenseTurnIdRef.current = null;
      setActiveDefensePuzzle(null);
      if (!turnId) return;

      const ack = await send({
        type: "result",
        content: {
          turnId,
          role: "defender",
          success: result.success,
          elapsed: result.elapsed,
        },
      });
      applyResult(turnId, "defender", result.success, ack.timestamp);
    },
    [send, applyResult],
  );

  return {
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
  };
}
