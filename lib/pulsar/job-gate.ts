import "server-only";
import { cookies } from "next/headers";
import { JOB_GAP_MS, JOB_GAP_TOLERANCE_MS, LAST_JOB_COOKIE } from "./job-pacing";

export type JobSlot = { ok: true } | { ok: false; retryAfterMs: number };

// Server-side backstop for the one-job-a-minute rule. The browser queue
// already waits between jobs, but Server Actions are plain POST endpoints —
// this makes sure a second tab, a double click or a modified client still
// can't create jobs faster than the gap allows. The timestamp lives in a
// cookie, so the gap is shared across every tab in the same browser.
export async function claimJobSlot(): Promise<JobSlot> {
  const store = await cookies();
  const last = Number(store.get(LAST_JOB_COOKIE)?.value ?? 0);
  const now = Date.now();
  const elapsed = now - last;

  if (last > 0 && elapsed < JOB_GAP_MS - JOB_GAP_TOLERANCE_MS) {
    return { ok: false, retryAfterMs: JOB_GAP_MS - elapsed };
  }

  store.set(LAST_JOB_COOKIE, String(now), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  });
  return { ok: true };
}
