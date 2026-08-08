"use client";

import { useCallback, useRef, useState } from "react";
import { useChannel } from "@portalsdk/react";
import { calculateDamage } from "@/lib/damage";
import { MAX_HP } from "@/lib/constants";
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
// Same limitation will hit the live-cursor extra (fase-1.md) when it's
// built: cursor position can't go over `ephemeral` sends either, since the
// rival's client would never see it. Use `channel.setMetadata()` there
// instead (throttled), not `send`.
type TurnRole = "attacker" | "defender";

type DefenseMessageContent = PuzzleWithId & { turnId: string };

type ResultMessageContent = {
  turnId: string;
  role: TurnRole;
  success: boolean;
  elapsed: number;
};

type MatchMessage = DefenseMessageContent | ResultMessageContent;

type TurnResult = { success: boolean; timestamp: number };

type PendingTurn = {
  // Which side of this turn *I* played — decides whether the computed damage
  // lands on opponentHealth (I attacked) or myHealth (I defended).
  myRole: TurnRole;
  // Portal-assigned timestamp of the "defense" message for this turn — the
  // single shared anchor both clients use to derive elapsed times.
  anchorTime: number;
  attackerResult?: TurnResult;
  defenderResult?: TurnResult;
};

export function usePortalMatch(matchId: string) {
  const [myHealth, setMyHealth] = useState(MAX_HP);
  const [opponentHealth, setOpponentHealth] = useState(MAX_HP);
  const [activeAttackPuzzle, setActiveAttackPuzzle] = useState<PuzzleData | null>(null);
  const [activeDefensePuzzle, setActiveDefensePuzzle] = useState<PuzzleData | null>(null);

  const activeAttackTurnIdRef = useRef<string | null>(null);
  const activeDefenseTurnIdRef = useRef<string | null>(null);
  const pendingTurnsRef = useRef(new Map<string, PendingTurn>());
  const processedTurnIdsRef = useRef(new Set<string>());

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
      });

      if (turn.myRole === "attacker") {
        setOpponentHealth((health) => Math.max(0, health - damage));
      } else {
        setMyHealth((health) => Math.max(0, health - damage));
      }
    },
    [],
  );

  const { status, presence, send } = useChannel<MatchMessage>({
    channelId: `match:${matchId}`,
    onMessage: (msg) => {
      if (msg.type === "defense") {
        // A duplicate delivery (at-least-once) of a turn already finished or
        // already tracked (including the echo of my own attack) is a no-op.
        if (processedTurnIdsRef.current.has(msg.content.turnId)) return;
        if (pendingTurnsRef.current.has(msg.content.turnId)) return;

        const { turnId, ...puzzle } = msg.content as DefenseMessageContent;
        pendingTurnsRef.current.set(turnId, {
          myRole: "defender",
          anchorTime: msg.timestamp,
        });
        activeDefenseTurnIdRef.current = turnId;
        setActiveDefensePuzzle(puzzle);
      } else if (msg.type === "result") {
        const { turnId, role, success } = msg.content as ResultMessageContent;
        applyResult(turnId, role, success, msg.timestamp);
      }
    },
  });

  const participantCount = presence?.kind === "detailed" ? presence.count : 0;

  const attack = useCallback(
    async (theme: string) => {
      const response = await fetch("/api/puzzle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme }),
      });
      const data: PuzzleApiResponse = await response.json();
      const turnId = data.attack.puzzleId;

      // Registered before the send resolves so a self-echoed "defense"
      // message (if Portal delivers one) is recognized and ignored.
      pendingTurnsRef.current.set(turnId, { myRole: "attacker", anchorTime: 0 });
      activeAttackTurnIdRef.current = turnId;
      setActiveAttackPuzzle(data.attack);

      const ack = await send({
        type: "defense",
        content: { turnId, ...data.defense },
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
    attack,
    resolveAttack,
    resolveDefense,
  };
}
