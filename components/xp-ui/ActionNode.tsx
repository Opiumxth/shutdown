"use client";

import type { PuzzleData } from "@/components/minigame/types";
import { sound } from "@/lib/sound";

export type HubTask = Omit<PuzzleData, "deadline"> & { id: string; kind: string };

type ActionNodeProps = {
  task: HubTask | null;
  onTaskClick?: () => void;
  hasActiveTask?: boolean;
  onNodeClick?: () => void;
  label?: string;
  iconOverride?: string;
  hasMiner?: boolean;
  hasDefender?: boolean;
  hasAttacker?: boolean;
  attackerCooldown?: number;
  defenderCooldown?: number;
  isDisabled?: boolean;
  cooldown?: number;
};

export function ActionNode({
  task,
  onTaskClick,
  hasActiveTask = false,
  onNodeClick,
  label,
  iconOverride,
  hasMiner = false,
  hasDefender = false,
  hasAttacker = false,
  attackerCooldown = 0,
  defenderCooldown = 0,
  isDisabled = false,
  cooldown = 0,
}: ActionNodeProps) {
  const clickable = Boolean(task) || Boolean(onNodeClick);
  const interactive = clickable && !isDisabled;
  return (
    <div className="pointer-events-auto relative flex flex-col items-center gap-2">
      <div
        role="button"
        tabIndex={0}
        onClick={interactive ? (task ? onTaskClick : onNodeClick) : undefined}
        onMouseEnter={interactive ? () => sound.playHover() : undefined}
        onKeyDown={(e) => {
          if (interactive && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            if (task) onTaskClick?.();
            else onNodeClick?.();
          }
        }}
        className={`relative flex flex-col items-center justify-center bg-transparent border-none outline-none hover:scale-105 transition-transform ${
          interactive ? "cursor-pointer" : "opacity-60 pointer-events-none"
        }`}
      >
        {hasActiveTask && (
          <span
            className="absolute -right-1 -top-1 flex h-5 w-5 animate-pulse items-center justify-center rounded-full bg-red-600 text-[11px] font-bold leading-none text-white"
            aria-label="Tarea disponible"
          >
            !
          </span>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={iconOverride ?? "/assets/icons/pc-idle.png"}
          alt="Tarea"
          draggable={false}
          className="h-12 w-12 object-contain [image-rendering:pixelated] scale-[1.1]"
        />
        <span className="mt-1 max-w-[90px] truncate text-center text-[10px] font-bold uppercase text-[#003dd7]">
          {label ?? (task ? task.kind : "VACÍO")}
        </span>
        {cooldown > 0 && (
          <span className="mt-0.5 whitespace-nowrap rounded bg-black px-1 text-[8px] font-bold leading-none text-red-400">
            {cooldown}s
          </span>
        )}
      </div>

      {hasMiner && (
        <div className="pointer-events-none absolute top-[-60px] left-[-60px] flex flex-col items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/icons/miner-icon.png"
            alt="Subagente minero"
            draggable={false}
            className="h-14 w-14 object-contain [image-rendering:pixelated]"
          />
        </div>
      )}
      {hasDefender && (
        <div className="pointer-events-none absolute top-[-60px] right-[-60px] flex flex-col items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/icons/defender-icon.png"
            alt="Subagente defensor"
            draggable={false}
            className={`h-14 w-14 object-contain [image-rendering:pixelated] ${
              defenderCooldown > 0 ? "opacity-40" : ""
            }`}
          />
          {defenderCooldown > 0 && (
            <span className="mt-0.5 whitespace-nowrap rounded bg-black px-1 text-[8px] font-bold leading-none text-red-400">
              {defenderCooldown}s
            </span>
          )}
        </div>
      )}
      {hasAttacker && (
        <div className="pointer-events-none absolute bottom-[-70px] left-1/2 -translate-x-1/2 flex flex-col items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/icons/attacker-icon.png"
            alt="Subagente atacante"
            draggable={false}
            className={`h-14 w-14 scale-[1.5] object-contain [image-rendering:pixelated] ${
              attackerCooldown > 0 ? "opacity-40" : ""
            }`}
          />
          {attackerCooldown > 0 && (
            <span className="mt-0.5 whitespace-nowrap rounded bg-black px-1 text-[8px] font-bold leading-none text-red-400">
              {attackerCooldown}s
            </span>
          )}
        </div>
      )}
    </div>
  );
}
