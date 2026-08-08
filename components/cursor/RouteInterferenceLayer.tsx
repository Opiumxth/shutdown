"use client";

import { usePathname } from "next/navigation";
import { InterferenceLayer } from "./InterferenceLayer";

function matchIdFromPathname(pathname: string) {
  const encodedId = /^\/match\/([^/]+)(?:\/|$)/.exec(pathname)?.[1];
  if (!encodedId) return null;

  try {
    return decodeURIComponent(encodedId);
  } catch {
    return encodedId;
  }
}

export function RouteInterferenceLayer() {
  const pathname = usePathname();
  const matchId = matchIdFromPathname(pathname);

  if (!matchId) return null;
  return <InterferenceLayer key={matchId} matchId={matchId} />;
}
