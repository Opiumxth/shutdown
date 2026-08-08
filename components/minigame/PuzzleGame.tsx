"use client";

import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PUZZLE_DEADLINE_MS } from "@/lib/constants";
import type { PuzzleData, PuzzleResult } from "./types";

type PuzzleGameProps = PuzzleData & {
  onResult: (result: PuzzleResult) => void;
};

function SortableItem({ id }: { id: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  return (
    <li
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        cursor: "grab",
        touchAction: "none",
        userSelect: "none",
        opacity: isDragging ? 0.5 : 1,
        background: isDragging ? "#ece9d8" : undefined,
      }}
    >
      {id}
    </li>
  );
}

export function PuzzleGame({
  title,
  scrambledItems,
  correctOrder,
  deadline,
  onResult,
}: PuzzleGameProps) {
  const [items, setItems] = useState(scrambledItems);
  const itemsRef = useRef(items);
  const startTimeRef = useRef(0);
  const resolvedRef = useRef(false);
  const [remaining, setRemaining] = useState(PUZZLE_DEADLINE_MS);

  const sensors = useSensors(useSensor(PointerSensor));

  function finish(success: boolean) {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    onResult({ success, elapsed: Date.now() - startTimeRef.current });
  }

  useEffect(() => {
    startTimeRef.current = Date.now();
    // Deadline is a real timestamp; syncing the initial countdown needs the real clock.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRemaining(Math.max(0, deadline - Date.now()));

    const interval = setInterval(() => {
      const left = deadline - Date.now();
      setRemaining(Math.max(0, left));
      if (left <= 0) {
        clearInterval(interval);
        finish(false);
      }
    }, 100);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadline]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const current = itemsRef.current;
    const oldIndex = current.indexOf(String(active.id));
    const newIndex = current.indexOf(String(over.id));
    const next = arrayMove(current, oldIndex, newIndex);
    setItems(next);

    if (next.every((item, i) => item === correctOrder[i])) {
      queueMicrotask(() => finish(true));
    }
  }

  return (
    <div className="window" style={{ width: 360 }}>
      <div className="title-bar">
        <div className="title-bar-text">{title}</div>
      </div>
      <div className="window-body">
        <p>Reordena los elementos antes de que se acabe el tiempo.</p>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            <ul className="tree-view">
              {items.map((item) => (
                <SortableItem key={item} id={item} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
        <progress
          max={PUZZLE_DEADLINE_MS}
          value={remaining}
          style={{ width: "100%", marginTop: 8 }}
        />
        <p>{Math.ceil(remaining / 1000)}s</p>
      </div>
    </div>
  );
}
