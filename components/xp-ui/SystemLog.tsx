"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

export type SystemLogHandle = {
  append: (message: string) => void;
};

type SystemLogProps = {
  logs?: string[];
  maxEntries?: number;
};

export const SystemLog = forwardRef<SystemLogHandle, SystemLogProps>(
  function SystemLog({ logs = [], maxEntries = 6 }, ref) {
    const [entries, setEntries] = useState<string[]>([]);
    const lastIndexRef = useRef(0);
    const scrollRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      // Append only the lines we haven't seen yet (logs only grows over time).
      if (logs.length <= lastIndexRef.current) return;
      const additions = logs.slice(lastIndexRef.current);
      lastIndexRef.current = logs.length;
      setEntries((prev) => [...prev, ...additions].slice(-maxEntries));
    }, [logs, maxEntries]);

    useImperativeHandle(ref, () => ({
      append(message: string) {
        setEntries((prev) => [...prev, message].slice(-maxEntries));
      },
    }));

    useEffect(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }, [entries]);

    return (
      <div className="system-log">
        <div className="system-log-titlebar">
          <span>cmd.exe — shutdown</span>
        </div>
        <div
          className="system-log-scroll pointer-events-auto h-full overflow-y-auto"
          ref={scrollRef}
        >
          {entries.map((line, index) => (
            <p key={index} className="system-log-line">
              {line}
            </p>
          ))}
        </div>
      </div>
    );
  },
);
