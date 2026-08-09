"use client";

import type { ReactNode } from "react";

type NetworkMapProps = {
  node?: ReactNode;
  children: ReactNode;
};

export function NetworkMap({ node, children }: NetworkMapProps) {
  return (
    <div className="network-map">
      <div className="network-ring ring-1" />
      <div className="network-ring ring-2" />
      <div className="network-ring ring-3" />
      {node}
      {children}
    </div>
  );
}
