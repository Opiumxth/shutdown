"use client";

import { XPWindow } from "./XPWindow";
import { sound } from "@/lib/sound";

export type AgentType = "miner" | "defender" | "attacker";

export const MAX_AGENTS_PER_TYPE = 3;

type AgentMarketplaceProps = {
  tokens: number;
  counts: Record<AgentType, number>;
  onPurchase: (agentType: AgentType) => void;
  onClose: () => void;
};

type AgentCard = {
  type: AgentType;
  name: string;
  cost: number;
  description: string;
  icon: string;
};

const AGENTS: AgentCard[] = [
  {
    type: "miner",
    name: "Miner",
    cost: 50,
    description: "Genera tokens pasivos",
    icon: "/assets/icons/miner-icon.png",
  },
  {
    type: "defender",
    name: "Defender",
    cost: 100,
    description: "Bloquea daño",
    icon: "/assets/icons/defender-icon.png",
  },
  {
    type: "attacker",
    name: "Attacker",
    cost: 150,
    description: "Aumenta daño",
    icon: "/assets/icons/attacker-icon.png",
  },
];

export function AgentMarketplace({
  tokens,
  counts,
  onPurchase,
  onClose,
}: AgentMarketplaceProps) {
  return (
    <XPWindow
      title="Agent Marketplace"
      controls={
        <button
          type="button"
          aria-label="Close"
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          onMouseEnter={() => sound.playHover()}
        />
      }
    >
      <div className="grid grid-cols-2 gap-2">
        {AGENTS.map((agent) => {
          const affordable = tokens >= agent.cost;
          const count = counts[agent.type];
          const atMax = count >= MAX_AGENTS_PER_TYPE;
          return (
            <div
              key={agent.type}
              className="flex flex-col items-center gap-1 border border-[#7b7b7b] bg-[#ece9d8] p-2 text-center"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={agent.icon}
                alt={agent.name}
                draggable={false}
                className="h-12 w-12 object-contain [image-rendering:pixelated]"
              />
              <span className="font-bold text-[#003dd7]">
                {agent.name}
                {count > 0 && (
                  <span className="ml-1 text-[10px] text-[#333333]">
                    ×{count}/{MAX_AGENTS_PER_TYPE}
                  </span>
                )}
              </span>
              <span className="text-[11px] text-[#333333]">
                {agent.description}
              </span>
              <button
                type="button"
                disabled={atMax || !affordable}
                onClick={() => {
                  sound.playClick();
                  onPurchase(agent.type);
                }}
                onMouseEnter={() => sound.playHover()}
                className={`btn ${
                  atMax || !affordable ? "cursor-not-allowed opacity-40" : ""
                }`}
              >
                {atMax
                  ? "DESPLEGADO"
                  : count > 0
                    ? `+1 (${count + 1}/${MAX_AGENTS_PER_TYPE})`
                    : `${agent.cost} Tokens`}
              </button>
            </div>
          );
        })}
      </div>
    </XPWindow>
  );
}
