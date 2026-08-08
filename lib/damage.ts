import { BASE_DAMAGE, PUZZLE_DEADLINE_MS } from "./constants";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Pure damage formula from CLAUDE.md — must produce the same number on both
 * clients, so callers pass elapsed times derived from Portal's envelope
 * timestamps, never from a client's own Date.now().
 */
export function calculateDamage(params: {
  attackerElapsedMs: number;
  defenderElapsedMs: number;
  defenderResponded: boolean;
}): number {
  const attackerElapsed = clamp(params.attackerElapsedMs, 0, PUZZLE_DEADLINE_MS);
  const potentialDamage = BASE_DAMAGE * (1 - attackerElapsed / PUZZLE_DEADLINE_MS);

  if (!params.defenderResponded) return potentialDamage;

  const defenderElapsed = clamp(params.defenderElapsedMs, 0, PUZZLE_DEADLINE_MS);
  return potentialDamage * (defenderElapsed / PUZZLE_DEADLINE_MS);
}
