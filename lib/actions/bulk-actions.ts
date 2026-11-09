"use server";

// Job-creating actions (go live, create historic previews, launch
// ingestion) live in job-actions.ts and run one per minute from the
// browser. What stays here are edits, stops and status reads.

import { revalidatePath } from "next/cache";
import { pulsarRequest, PulsarApiError, PulsarAuthError } from "@/lib/pulsar/client";
import { getSearch, getHistorics } from "@/lib/pulsar/api";
import { buildUpdateSearchPlan } from "@/lib/pulsar/search-kind";
import { runInBatches } from "@/lib/pulsar/batch";
import { STOP_SEARCH, errorMessage, type MutationError } from "@/lib/pulsar/mutations";
import {
  SESSION_EXPIRED_MESSAGE,
  type BulkHistoricStatusRunResult,
  type BulkResult,
  type BulkRunResult,
} from "@/lib/pulsar/bulk-result";
import type {
  Category,
  OnlineNewsLicense,
  PrintNewsLicense,
} from "@/lib/pulsar/types";

interface SimpleOutcome {
  ok: boolean;
  error?: string;
  name?: string;
}

async function toBulkResult(
  searchId: string,
  fallbackName: string,
  fn: () => Promise<SimpleOutcome>,
): Promise<BulkResult> {
  try {
    const r = await fn();
    return { searchId, name: r.name ?? fallbackName, ok: r.ok, error: r.error };
  } catch (error) {
    if (error instanceof PulsarAuthError) {
      return { searchId, name: fallbackName, ok: false, error: SESSION_EXPIRED_MESSAGE };
    }
    if (error instanceof PulsarApiError) {
      return { searchId, name: fallbackName, ok: false, error: error.message };
    }
    return { searchId, name: fallbackName, ok: false, error: "Something went wrong talking to Pulsar." };
  }
}

function toRunResult(results: BulkResult[], stoppedEarly = false): BulkRunResult {
  return { results, sessionExpired: results.some((r) => r.error === SESSION_EXPIRED_MESSAGE), stoppedEarly };
}

export async function bulkUpdateDataSources(
  searches: { id: string; name: string }[],
  addCategories: Category[],
  removeCategories: Category[],
): Promise<BulkRunResult> {
  // Each item here is a read (getSearch) plus a mutation — two Pulsar
  // requests per search, not one — so this is a heavier op than it looks.
  // Flagged by product as contributing to platform-wide job load, same as
  // the job-dispatching actions below.
  const { results, stoppedEarly } = await runInBatches(
    searches,
    ({ id, name }) =>
      toBulkResult(id, name, async () => {
        const current = await getSearch(id);
        if (!current) return { ok: false, error: "Search not found" };

        const next = new Set(current.categories ?? []);
        addCategories.forEach((c) => next.add(c));
        removeCategories.forEach((c) => next.delete(c));

        const plan = buildUpdateSearchPlan(current, { categories: Array.from(next) });
        const data = await pulsarRequest<Record<string, { errors: MutationError[] }>>(plan.mutation, {
          input: plan.input,
        });
        const payload = Object.values(data)[0];
        if (payload.errors?.length) {
          return { ok: false, error: errorMessage(payload.errors) };
        }
        revalidatePath(`/searches/${id}`);
        return { ok: true };
      }),
    { concurrency: 3, delayMs: 300, maxConsecutiveFailures: 3, isFailure: (r) => !r.ok },
  );
  revalidatePath("/");
  return toRunResult(results, stoppedEarly);
}

export async function bulkUpdateLicenses(
  searches: { id: string; name: string }[],
  addOnlineNews: OnlineNewsLicense[],
  removeOnlineNews: OnlineNewsLicense[],
  addPrintNews: PrintNewsLicense[],
  removePrintNews: PrintNewsLicense[],
): Promise<BulkRunResult> {
  // Same shape as bulkUpdateDataSources above — a read plus a mutation per
  // search, tightened for the same reason.
  const { results, stoppedEarly } = await runInBatches(
    searches,
    ({ id, name }) =>
      toBulkResult(id, name, async () => {
        const current = await getSearch(id);
        if (!current) return { ok: false, error: "Search not found" };

        const nextOnline = new Set(current.onlineNewsLicenses ?? []);
        addOnlineNews.forEach((l) => nextOnline.add(l));
        removeOnlineNews.forEach((l) => nextOnline.delete(l));

        const nextPrint = new Set(current.printNewsLicenses ?? []);
        addPrintNews.forEach((l) => nextPrint.add(l));
        removePrintNews.forEach((l) => nextPrint.delete(l));

        const plan = buildUpdateSearchPlan(current, {
          onlineNewsLicenses: Array.from(nextOnline),
          printNewsLicenses: Array.from(nextPrint),
        });
        const data = await pulsarRequest<Record<string, { errors: MutationError[] }>>(plan.mutation, {
          input: plan.input,
        });
        const payload = Object.values(data)[0];
        if (payload.errors?.length) {
          return { ok: false, error: errorMessage(payload.errors) };
        }
        revalidatePath(`/searches/${id}`);
        return { ok: true };
      }),
    { concurrency: 3, delayMs: 300, maxConsecutiveFailures: 3, isFailure: (r) => !r.ok },
  );
  revalidatePath("/");
  return toRunResult(results, stoppedEarly);
}

export async function bulkStopSearch(
  searches: { id: string; name: string }[],
): Promise<BulkRunResult> {
  const { results } = await runInBatches(searches, ({ id, name }) =>
    toBulkResult(id, name, async () => {
      const data = await pulsarRequest<{ stopSearch: { errors: MutationError[] } }>(STOP_SEARCH, {
        input: { id },
      });
      if (data.stopSearch.errors?.length) {
        return { ok: false, error: errorMessage(data.stopSearch.errors) };
      }
      revalidatePath(`/searches/${id}`);
      return { ok: true };
    }),
  );
  revalidatePath("/");
  return toRunResult(results);
}

export async function bulkRefreshHistorics(
  pairs: { searchId: string; historicIds: number[]; name: string }[],
): Promise<BulkHistoricStatusRunResult> {
  // Called on a repeating poll (see bulk-historic-wizard.tsx) for as long as
  // any historic is still settling — flagged by product as contributing to
  // platform job load, since it's recurring, not a one-off burst. Paced the
  // same as the write paths above; see that component for the poll-interval
  // side of this same fix.
  const { results: statuses } = await runInBatches(
    pairs,
    async ({ searchId, historicIds, name }) => {
      try {
        const all = await getHistorics(searchId);
        const historics = all.filter((h) => historicIds.includes(h.id));
        return { searchId, name, historics };
      } catch (error) {
        if (error instanceof PulsarAuthError) {
          return { searchId, name, historics: [], error: SESSION_EXPIRED_MESSAGE };
        }
        return { searchId, name, historics: [], error: "Couldn't refresh status" };
      }
    },
    { concurrency: 3, delayMs: 200 },
  );
  return { statuses, sessionExpired: statuses.some((s) => s.error === SESSION_EXPIRED_MESSAGE) };
}
