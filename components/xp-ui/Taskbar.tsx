"use client";

import { useEffect, useState } from "react";

type TaskbarProps = {
  tasks?: string[];
};

export function Taskbar({ tasks = [] }: TaskbarProps) {
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
    <div className="taskbar">
      <button type="button" className="taskbar-start">
        Inicio
      </button>
      <div className="taskbar-tasks">
        {tasks.map((task) => (
          <span key={task} className="taskbar-task">
            {task}
          </span>
        ))}
      </div>
      <span className="taskbar-clock">
        {mounted ? now.toLocaleTimeString() : "—:—:—"}
      </span>
    </div>
  );
}
