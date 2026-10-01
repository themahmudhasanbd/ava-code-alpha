import { useState, type PointerEvent } from "react";

import { cn } from "@/lib/utils";

export type AvaMascotState = "idle" | "thinking" | "working" | "complete" | "error";

type Gaze = "center" | "up" | "down" | "left" | "right";

const stateLabel: Record<AvaMascotState, string> = {
  idle: "AvA is ready",
  thinking: "AvA is thinking",
  working: "AvA is working",
  complete: "AvA finished",
  error: "AvA needs attention",
};

export function AvaMascot({
  state = "idle",
  size = "md",
  interactive = true,
  className,
}: {
  state?: AvaMascotState;
  size?: "xs" | "sm" | "md" | "lg";
  interactive?: boolean;
  className?: string;
}) {
  const [gaze, setGaze] = useState<Gaze>("center");

  const followPointer = (event: PointerEvent<HTMLSpanElement>) => {
    if (!interactive) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    if (Math.abs(dx) > Math.abs(dy)) setGaze(dx > 0 ? "right" : "left");
    else setGaze(dy > 0 ? "down" : "up");
  };

  return (
    <span
      role="img"
      aria-label={stateLabel[state]}
      data-state={state}
      data-gaze={gaze}
      onPointerMove={followPointer}
      onPointerLeave={() => setGaze("center")}
      className={cn("ava-mascot", `ava-mascot-${size}`, className)}
    >
      <span className="ava-mascot-face" aria-hidden="true">
        <span className="ava-mascot-eye" />
        <span className="ava-mascot-eye" />
      </span>
      <span className="ava-mascot-ring" aria-hidden="true" />
    </span>
  );
}