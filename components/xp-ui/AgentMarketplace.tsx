"use client";

import { XPWindow } from "./XPWindow";
import { sound } from "@/lib/sound";

export type AgentType = "miner" | "defender" | "attacker";

type AgentMarketplaceProps = {
  tokens: number;
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
        />
      }
    >
      <div className="grid grid-cols-2 gap-2">
        {AGENTS.map((agent) => {
          const affordable = tokens >= agent.cost;
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
              <span className="font-bold text-[#003dd7]">{agent.name}</span>
              <span className="text-[11px] text-[#333333]">
                {agent.description}
              </span>
              <button
                type="button"
                disabled={!affordable}
                onClick={() => {
                  sound.playClick();
                  onPurchase(agent.type);
                }}
                className={`btn ${
                  affordable ? "" : "cursor-not-allowed opacity-40"
                }`}
              >
                {agent.cost} Tokens
              </button>
            </div>
          );
        })}
      </div>
    </XPWindow>
  );
}
