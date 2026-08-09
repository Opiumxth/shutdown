"use client";

type ActionNodeProps = {
  role: "idle" | "miner" | "defender" | "attacker";
  onClick: () => void;
  cooldownRatio?: number;
  onCooldown?: boolean;
};

const ROLE_ICONS: Record<ActionNodeProps["role"], string> = {
  idle: "/assets/icons/pc-idle.png",
  miner: "/assets/icons/miner-node.png",
  defender: "/assets/icons/defender-node.png",
  attacker: "/assets/icons/attacker-node.png",
};

export function ActionNode({
  role,
  onClick,
  cooldownRatio = 0,
  onCooldown = false,
}: ActionNodeProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={`pointer-events-auto relative flex flex-col items-center justify-center cursor-pointer ${
        onCooldown ? "cursor-not-allowed" : ""
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ROLE_ICONS[role]}
        alt={`Nodo ${role}`}
        draggable={false}
        className={`h-16 w-16 object-contain [image-rendering:pixelated] ${
          onCooldown ? "opacity-40" : ""
        }`}
      />
      <div className="h-1 w-24 overflow-hidden bg-zinc-700">
        <div
          className="h-full bg-green-500"
          style={{ width: `${cooldownRatio * 100}%` }}
        />
      </div>
    </div>
  );
}
