"use client";

type BSODProps = {
  stop: string;
  code: string;
};

export function BSOD({ stop, code }: BSODProps) {
  return (
    <div className="bsod">
      <p>
        A problem has been detected and Windows has been shut down to prevent
        damage to your computer.
      </p>
      <p>
        The system has been compromised. If this is the first time you have
        seen this error, restart your computer. If this screen appears again,
        follow these steps: check your firewall, reinstall the security
        protocols and remove any suspicious processes.
      </p>
      <p>
        Technical information: STOP: {stop} ({code})
      </p>
      <p>
        <span className="bsod-cursor" aria-hidden="true" />
      </p>
    </div>
  );
}
