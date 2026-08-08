"use client";

type BSODProps = {
  stop?: string;
  code?: string;
};

export function BSOD({
  stop = "0x0000007B",
  code = "ERR_RIVAL_TOO_GOOD",
}: BSODProps) {
  return (
    <div className="bsod">
      <p>
        A problem has been detected and shutdown has been shut down to prevent
        damage to your computer.
      </p>
      <p>Technical information: STOP: {stop} ({code})</p>
      <p>
        <span className="bsod-cursor" aria-hidden="true" />
      </p>
    </div>
  );
}
