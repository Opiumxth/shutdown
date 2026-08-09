import { BASE_DAMAGE, PUZZLE_DEADLINE_MS } from "./constants";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Pure damage formula from CLAUDE.md — must produce the same number on both
 * clients, so callers pass elapsed times derived from Portal's envelope
 * timestamps, never from a client's own Date.now().
 *
 * `baseDamage` lets callers differentiate major (manual ATACAR) vs minor
 * (passive subagent) attacks; both clients must pass the same base for the
 * same turn, which is guaranteed because it is stored in the pending turn.
 */
export function calculateDamage(params: {
  attackerElapsedMs: number;
  defenderElapsedMs: number;
  defenderResponded: boolean;
  baseDamage?: number;
}): number {
  const base = params.baseDamage ?? BASE_DAMAGE;
  const attackerElapsed = clamp(params.attackerElapsedMs, 0, PUZZLE_DEADLINE_MS);
  const potentialDamage = base * (1 - attackerElapsed / PUZZLE_DEADLINE_MS);

  if (!params.defenderResponded) return potentialDamage;

  const defenderElapsed = clamp(params.defenderElapsedMs, 0, PUZZLE_DEADLINE_MS);
  return potentialDamage * (defenderElapsed / PUZZLE_DEADLINE_MS);
}
