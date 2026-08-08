"use client";

import { useEffect } from "react";
import { sound as playSound } from "@/lib/sound";

type BSODProps = {
  stop?: string;
  code?: string;
  sound?: boolean;
};

export function BSOD({
  stop = "0x0000007B (0xF78D2524, 0xC0000034, 0x00000000, 0x00000000)",
  code = "ERR_RIVAL_TOO_GOOD",
  sound = true,
}: BSODProps) {
  useEffect(() => {
    if (!sound) return;
    playSound.playCritical();
  }, [sound]);

  return (
    <div className="bsod" role="alert">
      <p>
        A problem has been detected and Windows has been shut down to prevent
        damage to your computer.
      </p>
      <p>{code}</p>
      <p>
        Technical information:
        <br />
        *** STOP: {stop}
      </p>
      <p>
        <span className="bsod-cursor" aria-hidden="true" />
      </p>
    </div>
  );
}
