"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ACTIVE_RECHECK_MS, JOB_GAP_MS } from "@/lib/pulsar/job-pacing";

// Runs job-creating actions one at a time from the browser, with a fixed
// gap between jobs (JOB_GAP_MS) and an optional "is there room on Pulsar
// yet?" check before each one. This replaces firing a whole batch from one
// Server Action, which put too many jobs on Pulsar's backend at once.
//
// Because the queue lives in the page, the tab has to stay open until the
// batch finishes — the page warns before closing while a batch is running.

export type QueuePhase = "idle" | "running" | "waiting" | "done" | "cancelled" | "stopped";

export interface QueueState {
  phase: QueuePhase;
  completed: number;
  total: number;
  // When the next job is due — drives the countdown.
  nextAt: number | null;
  // Why we're waiting, shown under the countdown.
  waitingFor: string | null;
  // Label of the job being sent right now.
  current: string | null;
}

export interface RunOptions<T, R> {
  label: (item: T) => string;
  isFailure: (result: R) => boolean;
  // Server said "too soon" — wait this long and resend the same job.
  retryAfterMs: (result: R) => number | undefined;
  // Stop straight away (e.g. the session expired).
  shouldAbort?: (result: R) => boolean;
  // Circuit breaker: stop after this many failures in a row.
  maxConsecutiveFailures?: number;
  // Return null when there's room for another job, or a short reason to
  // keep waiting. Re-checked every ACTIVE_RECHECK_MS.
  checkCapacity?: () => Promise<string | null>;
  onResult?: (result: R, item: T) => void;
}

export interface RunOutcome<R> {
  results: R[];
  stoppedEarly: boolean;
  cancelled: boolean;
  aborted: boolean;
}

const IDLE: QueueState = { phase: "idle", completed: 0, total: 0, nextAt: null, waitingFor: null, current: null };

export function usePacedQueue() {
  const [state, setState] = useState<QueueState>(IDLE);
  const cancelledRef = useRef(false);

  const isActive = state.phase === "running" || state.phase === "waiting";

  // Warn before closing or refreshing the tab mid-batch — closing it stops
  // the remaining jobs from being sent.
  useEffect(() => {
    if (!isActive) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isActive]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
  }, []);

  const reset = useCallback(() => {
    cancelledRef.current = false;
    setState(IDLE);
  }, []);

  const run = useCallback(
    async <T, R>(items: T[], worker: (item: T) => Promise<R>, options: RunOptions<T, R>): Promise<RunOutcome<R>> => {
      const { maxConsecutiveFailures = 3 } = options;
      cancelledRef.current = false;
      const results: R[] = [];
      let consecutiveFailures = 0;
      let lastJobAt = 0;
      let stoppedEarly = false;
      let aborted = false;

      const isCancelled = () => cancelledRef.current;
      const wait = async (until: number, reason: string) => {
        setState((s) => ({ ...s, phase: "waiting", nextAt: until, waitingFor: reason, current: null }));
        await sleepUntil(until, isCancelled);
      };

      setState({ ...IDLE, phase: "running", total: items.length });

      outer: for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // 1. Fixed gap since the previous job.
        if (lastJobAt > 0) {
          await wait(lastJobAt + JOB_GAP_MS, "Leaving a minute between jobs");
        }
        if (isCancelled()) break;

        // 2. Wait for room on Pulsar (e.g. fewer than N ingestions running).
        if (options.checkCapacity) {
          for (;;) {
            const reason = await options.checkCapacity();
            if (!reason) break;
            await wait(Date.now() + ACTIVE_RECHECK_MS, reason);
            if (isCancelled()) break outer;
          }
        }

        // 3. Send the job. If the server-side gate says "too soon" (another
        //    tab, or a batch that just finished), wait and resend.
        setState((s) => ({ ...s, phase: "running", nextAt: null, waitingFor: null, current: options.label(item) }));
        let result = await worker(item);
        for (;;) {
          const retryAfter = options.retryAfterMs(result);
          if (retryAfter === undefined) break;
          await wait(Date.now() + retryAfter + 500, "Another job was sent from this browser in the last minute");
          if (isCancelled()) break outer;
          setState((s) => ({ ...s, phase: "running", nextAt: null, waitingFor: null, current: options.label(item) }));
          result = await worker(item);
        }

        lastJobAt = Date.now();
        results.push(result);
        options.onResult?.(result, item);
        setState((s) => ({ ...s, completed: results.length }));

        if (options.shouldAbort?.(result)) {
          aborted = true;
          break;
        }
        consecutiveFailures = options.isFailure(result) ? consecutiveFailures + 1 : 0;
        if (consecutiveFailures >= maxConsecutiveFailures) {
          stoppedEarly = true;
          break;
        }
      }

      const cancelled = isCancelled() && !stoppedEarly && !aborted && results.length < items.length;
      setState((s) => ({
        ...s,
        phase: cancelled ? "cancelled" : stoppedEarly || aborted ? "stopped" : "done",
        nextAt: null,
        waitingFor: null,
        current: null,
      }));
      return { results, stoppedEarly, cancelled, aborted };
    },
    [],
  );

  return { state, run, cancel, reset, isActive };
}

// Sleeps in one-second steps so Cancel takes effect within a second.
async function sleepUntil(until: number, isCancelled: () => boolean): Promise<void> {
  while (Date.now() < until) {
    if (isCancelled()) return;
    await new Promise((resolve) => setTimeout(resolve, Math.min(1000, until - Date.now())));
  }
}
