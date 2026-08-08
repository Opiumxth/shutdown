"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChannel } from "@portalsdk/react";
import styles from "./InterferenceLayer.module.css";

const CURSOR_METADATA_KEY = "shutdownRivalCursor";
const CURSOR_THROTTLE_MS = 80;
const CURSOR_HEARTBEAT_MS = 1_000;

const BLACKOUT_DELAY_MIN_MS = 15_000;
const BLACKOUT_DELAY_MAX_MS = 25_000;
const BLACKOUT_DURATION_MIN_MS = 10_000;
const BLACKOUT_DURATION_MAX_MS = 15_000;

type RivalCursorMetadata = {
  active: boolean;
  x: number;
  y: number;
  updatedAt: number;
};

type BlackoutContent = {
  eventId: string;
  durationMs: number;
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function isRivalCursorMetadata(value: unknown): value is RivalCursorMetadata {
  if (!isRecord(value)) return false;

  return (
    typeof value.active === "boolean" &&
    typeof value.x === "number" &&
    value.x >= 0 &&
    value.x <= 1 &&
    typeof value.y === "number" &&
    value.y >= 0 &&
    value.y <= 1 &&
    typeof value.updatedAt === "number"
  );
}

function getTurnId(content: unknown): string | null {
  if (!isRecord(content) || typeof content.turnId !== "string") return null;
  return content.turnId;
}

function getResultRole(content: unknown): string | null {
  if (!isRecord(content) || typeof content.role !== "string") return null;
  return content.role;
}

function getBlackoutContent(content: unknown): BlackoutContent | null {
  if (!isRecord(content)) return null;
  if (typeof content.eventId !== "string") return null;
  if (typeof content.durationMs !== "number") return null;
  if (
    content.durationMs < BLACKOUT_DURATION_MIN_MS ||
    content.durationMs > BLACKOUT_DURATION_MAX_MS
  ) {
    return null;
  }

  return {
    eventId: content.eventId,
    durationMs: content.durationMs,
  };
}

function randomInteger(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createEventId(userId: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${userId}:${Date.now()}`;
}

export function InterferenceLayer({ matchId }: { matchId: string }) {
  const [blackoutPending, setBlackoutPending] = useState(false);
  const [localBlackoutEndAt, setLocalBlackoutEndAt] = useState(0);
  const [now, setNow] = useState(0);

  const ownMetadataRef = useRef<UnknownRecord>({});
  const lastCursorRef = useRef({ x: 0.5, y: 0.5 });

  const {
    me,
    messages,
    presence,
    send,
    setMetadata,
    status,
  } = useChannel<unknown>({
    channelId: `match:${matchId}`,
    history: 50,
    readOn: "manual",
  });

  const participants = useMemo(
    () => (presence?.kind === "detailed" ? presence.participants : []),
    [presence],
  );
  const participantIds = useMemo(
    () => [...new Set(participants.map((participant) => participant.id))].sort(),
    [participants],
  );
  const leaderId = participantIds.length >= 2 ? participantIds[0] : null;
  const opponent = participants.find((participant) => participant.id !== me?.id);

  useEffect(() => {
    const ownPresence = participants.find((participant) => participant.id === me?.id);
    if (ownPresence?.metadata) {
      ownMetadataRef.current = ownPresence.metadata;
    }
  }, [me?.id, participants]);

  const matchActivity = useMemo(() => {
    const ownTurns = new Set<string>();
    const opponentTurns = new Set<string>();
    let blackoutSeen = false;
    let blackoutEndAt = 0;

    if (!me?.id) {
      return { ownAttackCount: 0, opponentAttackCount: 0, blackoutSeen, blackoutEndAt };
    }

    for (const message of messages) {
      if (message.status === "failed") continue;

      if (message.type === "shutdown.blackout") {
        const blackout = getBlackoutContent(message.content);
        if (blackout) {
          blackoutSeen = true;
          blackoutEndAt = Math.max(
            blackoutEndAt,
            message.timestamp + blackout.durationMs,
          );
        }
        continue;
      }

      const turnId = getTurnId(message.content);
      if (!turnId) continue;

      const fromMe = message.sender.id === me.id;

      if (message.type === "defense") {
        const turns = fromMe ? ownTurns : opponentTurns;
        turns.add(turnId);
      } else if (
        message.type === "result" &&
        getResultRole(message.content) === "attacker"
      ) {
        const turns = fromMe ? ownTurns : opponentTurns;
        turns.delete(turnId);
      }
    }

    return {
      ownAttackCount: ownTurns.size,
      opponentAttackCount: opponentTurns.size,
      blackoutSeen,
      blackoutEndAt,
    };
  }, [me, messages]);

  const blackoutSeen = matchActivity.blackoutSeen || blackoutPending;
  const blackoutEndAt = Math.max(
    matchActivity.blackoutEndAt,
    localBlackoutEndAt,
  );

  const publishCursor = useCallback(
    (active: boolean, x: number, y: number) => {
      if (!me?.id) return;

      const nextMetadata = {
        ...ownMetadataRef.current,
        [CURSOR_METADATA_KEY]: {
          active,
          x,
          y,
          updatedAt: Date.now(),
        } satisfies RivalCursorMetadata,
      };

      ownMetadataRef.current = nextMetadata;
      setMetadata(nextMetadata);
    },
    [me?.id, setMetadata],
  );

  useEffect(() => {
    if (!me?.id) return;

    if (matchActivity.ownAttackCount === 0) {
      const { x, y } = lastCursorRef.current;
      publishCursor(false, x, y);
      return;
    }

    let throttleTimer: ReturnType<typeof setTimeout> | null = null;
    let lastPublishedAt = 0;

    const flush = () => {
      throttleTimer = null;
      lastPublishedAt = Date.now();
      const { x, y } = lastCursorRef.current;
      publishCursor(true, x, y);
    };

    const handlePointerMove = (event: PointerEvent) => {
      lastCursorRef.current = {
        x: Math.max(0, Math.min(1, event.clientX / Math.max(1, window.innerWidth))),
        y: Math.max(0, Math.min(1, event.clientY / Math.max(1, window.innerHeight))),
      };

      const wait = CURSOR_THROTTLE_MS - (Date.now() - lastPublishedAt);
      if (wait <= 0) {
        if (throttleTimer) clearTimeout(throttleTimer);
        flush();
      } else if (!throttleTimer) {
        throttleTimer = setTimeout(flush, wait);
      }
    };

    flush();
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    const heartbeat = window.setInterval(flush, CURSOR_HEARTBEAT_MS);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.clearInterval(heartbeat);
      if (throttleTimer) clearTimeout(throttleTimer);
      const { x, y } = lastCursorRef.current;
      publishCursor(false, x, y);
    };
  }, [matchActivity.ownAttackCount, me?.id, publishCursor]);

  useEffect(() => {
    if (
      status !== "ready" ||
      !me?.id ||
      leaderId !== me.id ||
      participantIds.length < 2 ||
      blackoutSeen
    ) {
      return;
    }

    const delay = randomInteger(BLACKOUT_DELAY_MIN_MS, BLACKOUT_DELAY_MAX_MS);
    const timer = window.setTimeout(async () => {
      const durationMs = randomInteger(
        BLACKOUT_DURATION_MIN_MS,
        BLACKOUT_DURATION_MAX_MS,
      );
      const content: BlackoutContent = {
        eventId: createEventId(me.id),
        durationMs,
      };

      setBlackoutPending(true);
      try {
        const ack = await send({
          type: "shutdown.blackout",
          content,
        });
        setLocalBlackoutEndAt(ack.timestamp + durationMs);
      } catch {
        setBlackoutPending(false);
      }
    }, delay);

    return () => window.clearTimeout(timer);
  }, [
    blackoutSeen,
    leaderId,
    me?.id,
    participantIds.length,
    send,
    status,
  ]);

  useEffect(() => {
    if (blackoutEndAt === 0) return;

    const updateClock = () => {
      const currentTime = Date.now();
      setNow(currentTime);
      if (currentTime >= blackoutEndAt) window.clearInterval(interval);
    };
    const kickoff = window.setTimeout(updateClock, 0);
    const interval = window.setInterval(updateClock, 100);

    return () => {
      window.clearTimeout(kickoff);
      window.clearInterval(interval);
    };
  }, [blackoutEndAt]);

  const blackoutActive = now > 0 && blackoutEndAt > now;

  useEffect(() => {
    if (!blackoutActive) return;

    const blockInteraction = (event: Event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    const eventNames = [
      "click",
      "dblclick",
      "pointerdown",
      "pointerup",
      "mousedown",
      "mouseup",
      "touchstart",
      "touchend",
      "keydown",
    ];

    for (const eventName of eventNames) {
      window.addEventListener(eventName, blockInteraction, {
        capture: true,
        passive: false,
      });
    }

    return () => {
      for (const eventName of eventNames) {
        window.removeEventListener(eventName, blockInteraction, true);
      }
    };
  }, [blackoutActive]);

  const rivalCursor = opponent?.metadata?.[CURSOR_METADATA_KEY];
  const cursorIsVisible =
    matchActivity.opponentAttackCount > 0 &&
    isRivalCursorMetadata(rivalCursor) &&
    rivalCursor.active;
  const remainingSeconds = Math.max(0, Math.ceil((blackoutEndAt - now) / 1_000));

  return (
    <>
      {cursorIsVisible && (
        <div
          aria-hidden="true"
          className={styles.rivalCursor}
          style={{
            left: `${rivalCursor.x * 100}vw`,
            top: `${rivalCursor.y * 100}vh`,
          }}
        >
          {/* A plain img preserves the cursor's native pixel dimensions. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/win-xp-pack/Cursor/default_arrow.png" alt="" />
          <span>RIVAL</span>
        </div>
      )}

      {blackoutActive && (
        <div className={styles.blackout} role="alert" aria-live="assertive">
          <div className={styles.scanlines} />
          <div className={styles.blackoutMessage}>
            <p className={styles.signal}>NO SIGNAL</p>
            <p>Interferencia remota detectada</p>
            <p className={styles.countdown}>Reiniciando en {remainingSeconds}s</p>
          </div>
        </div>
      )}
    </>
  );
}
