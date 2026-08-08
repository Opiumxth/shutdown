"use client";

import { useChannel } from "@portalsdk/react";

export function usePortalMatch(matchId: string) {
  const { status, presence } = useChannel({
    channelId: `match:${matchId}`,
  });

  const participantCount =
    presence?.kind === "detailed" ? presence.count : 0;

  return { status, presence, participantCount };
}
