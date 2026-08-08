"use client";

import { useEffect, useState } from "react";

export function TaskbarClock() {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    // The clock must only render its real value after hydration; until then a
    // static placeholder avoids the SSR/client mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="taskbar-clock">
      {mounted ? now.toLocaleTimeString() : "—:—:—"}
    </div>
  );
}
