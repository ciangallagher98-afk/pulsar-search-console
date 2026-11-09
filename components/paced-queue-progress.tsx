"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { QueueState } from "@/lib/use-paced-queue";

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// Progress bar + countdown + Cancel for a paced job batch.
export function PacedQueueProgress({
  state,
  noun,
  onCancel,
}: {
  state: QueueState;
  noun: string;
  onCancel: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const active = state.phase === "running" || state.phase === "waiting";

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);

  if (state.phase === "idle") return null;

  const percent = state.total === 0 ? 0 : Math.round((state.completed / state.total) * 100);
  const remaining = state.total - state.completed;

  return (
    <div className="space-y-2 rounded-md border bg-muted/40 p-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium">
          {state.completed} of {state.total} {noun} sent
        </span>
        {active && (
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel remaining
          </Button>
        )}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
      </div>
      {state.phase === "running" && state.current && (
        <p className="text-xs text-muted-foreground">Sending: {state.current}</p>
      )}
      {state.phase === "waiting" && state.nextAt && (
        <p className="text-xs text-muted-foreground">
          {state.waitingFor} — next in {formatCountdown(state.nextAt - now)}
        </p>
      )}
      {active && (
        <p className="text-xs text-muted-foreground">
          Keep this tab open until the batch finishes — about {remaining} more minute{remaining === 1 ? "" : "s"} at
          minimum.
        </p>
      )}
      {state.phase === "cancelled" && (
        <p className="text-xs text-muted-foreground">Cancelled — nothing after the last sent job went to Pulsar.</p>
      )}
    </div>
  );
}
