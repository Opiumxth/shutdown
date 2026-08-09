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
import { sound } from "@/lib/sound";
import type { PuzzleData, PuzzleResult } from "./types";

type PuzzleGameProps = PuzzleData & {
  onResult: (result: PuzzleResult) => void;
  onClose?: () => void;
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
  type,
  title,
  instruction,
  context,
  options,
  correctAnswer,
  deadline,
  onResult,
  onClose,
}: PuzzleGameProps) {
  const [items, setItems] = useState(options);
  const [selected, setSelected] = useState<string[]>([]);
  const itemsRef = useRef(items);
  const startTimeRef = useRef(0);
  const resolvedRef = useRef(false);

  const sensors = useSensors(useSensor(PointerSensor));

  function finish(success: boolean) {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    onResult({ success, elapsed: Date.now() - startTimeRef.current });
  }

  useEffect(() => {
    startTimeRef.current = Date.now();
    // Auto-fail when the shared deadline elapses. Uses the real clock.
    const timeout = setTimeout(() => {
      finish(false);
    }, Math.max(0, deadline - Date.now()));
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadline]);

  useEffect(() => {
    if (!onClose) return;
    const close = onClose;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        sound.playClick();
        close();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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

    if (next.every((item, index) => item === correctAnswer[index])) {
      queueMicrotask(() => finish(true));
    }
  }

  function toggleSynergy(option: string) {
    setSelected((current) => {
      if (current.includes(option)) {
        return current.filter((item) => item !== option);
      }
      if (current.length === 3) return current;
      return [...current, option];
    });
  }

  function validateSynergy() {
    if (selected.length !== 3) return;
    const success =
      correctAnswer.length === selected.length &&
      selected.every((answer) => correctAnswer.includes(answer));
    finish(success);
  }

  function renderPuzzle() {
    if (type === "sequence") {
      return (
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
      );
    }

    if (type === "synergy") {
      return (
        <div className="flex flex-col gap-2">
          <p>
            Seleccionados: <strong>{selected.length}/3</strong>
          </p>
          {options.map((option) => {
            const isSelected = selected.includes(option);
            return (
              <button
                key={option}
                type="button"
                aria-pressed={isSelected}
                onClick={() => toggleSynergy(option)}
                className={`w-full text-left p-2 border rounded transition-colors ${
                  isSelected
                    ? "border-blue-500 bg-blue-500 text-white"
                    : "border-gray-400 hover:bg-blue-100 hover:border-blue-500"
                }`}
              >
                {isSelected ? "[X] " : "[ ] "}
                {option}
              </button>
            );
          })}
          <button
            type="button"
            disabled={selected.length !== 3}
            onClick={validateSynergy}
            className="w-full mt-4 p-2 border border-gray-400 rounded transition-colors hover:bg-blue-100 hover:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            VALIDAR COMBO
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => finish(option === correctAnswer[0])}
            className="w-full text-left p-2 border border-gray-400 rounded hover:bg-blue-100 hover:border-blue-500 transition-colors"
          >
            {option}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="window" style={{ width: 440, maxWidth: "calc(100vw - 24px)" }}>
      <div className="title-bar">
        <div className="title-bar-text">{title}</div>
        {onClose && (
          <div className="title-bar-controls">
            <button
              type="button"
              aria-label="Close"
              onClick={() => {
                sound.playClick();
                onClose();
              }}
            />
          </div>
        )}
      </div>
      <div className="window-body">
        <div className="flex flex-col gap-3 p-4 overflow-y-auto max-h-[60vh] bg-white text-black">
          <p>{instruction}</p>
          {context ? (
            <pre
              style={{
                padding: 8,
                overflowX: "auto",
                whiteSpace: "pre-wrap",
                background: "#000",
                color: "#00ff00",
                fontFamily: "monospace",
              }}
            >
              {context}
            </pre>
          ) : null}
          {renderPuzzle()}
        </div>
      </div>
    </div>
  );
}
