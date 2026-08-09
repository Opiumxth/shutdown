"use client";

import { TaskbarClock } from "./TaskbarClock";
import { sound } from "@/lib/sound";

type TaskbarProps = {
  tasks?: string[];
};

export function Taskbar({ tasks = [] }: TaskbarProps) {
  return (
    <div className="taskbar">
      <button
        type="button"
        className="taskbar-start"
        onClick={() => sound.playClick()}
      >
        Inicio
      </button>
      <div className="taskbar-tasks">
        {tasks.map((task) => (
          <button
            key={task}
            type="button"
            className="taskbar-task"
            onClick={() => sound.playClick()}
          >
            {task}
          </button>
        ))}
      </div>
      <TaskbarClock />
    </div>
  );
}
