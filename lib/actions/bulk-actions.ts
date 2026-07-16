"use server";

import { revalidatePath } from "next/cache";
import { pulsarRequest, PulsarApiError, PulsarAuthError } from "@/lib/pulsar/client";
import { getSearch, getHistorics } from "@/lib/pulsar/api";
import { buildUpdateSearchPlan } from "@/lib/pulsar/search-kind";
import { runInBatches } from "@/lib/pulsar/batch";
import { ACTION_MUTATION } from "@/lib/pulsar/historic-status";
import { CREATE_HISTORIC, START_SEARCH, errorMessage, type MutationError } from "@/lib/pulsar/mutations";
import {
  SESSION_EXPIRED_MESSAGE,
  type BulkHistoricRunResult,
  type BulkHistoricStatusRunResult,
  type BulkResult,
  type BulkRunResult,
} from "@/lib/pulsar/bulk-result";
import type {
  Category,
  Historic,
  HistoricAvailableAction,
  HistoricCategory,
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

function toRunResult(results: BulkResult[]): BulkRunResult {
  return { results, sessionExpired: results.some((r) => r.error === SESSION_EXPIRED_MESSAGE) };
}

export async function bulkUpdateDataSources(
  searches: { id: string; name: string }[],
  addCategories: Category[],
  removeCategories: Category[],
): Promise<BulkRunResult> {
  const results = await runInBatches(searches, ({ id, name }) =>
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
  );
  revalidatePath("/");
  return toRunResult(results);
}

export async function bulkUpdateLicenses(
  searches: { id: string; name: string }[],
  addOnlineNews: OnlineNewsLicense[],
  removeOnlineNews: OnlineNewsLicense[],
  addPrintNews: PrintNewsLicense[],
  removePrintNews: PrintNewsLicense[],
): Promise<BulkRunResult> {
  const results = await runInBatches(searches, ({ id, name }) =>
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
  );
  revalidatePath("/");
  return toRunResult(results);
}

export async function bulkStartSearch(
  searches: { id: string; name: string }[],
): Promise<BulkRunResult> {
  const results = await runInBatches(searches, ({ id, name }) =>
    toBulkResult(id, name, async () => {
      const data = await pulsarRequest<{ startSearch: { errors: MutationError[] } }>(START_SEARCH, {
        input: { id },
      });
      if (data.startSearch.errors?.length) {
        return { ok: false, error: errorMessage(data.startSearch.errors) };
      }
      revalidatePath(`/searches/${id}`);
      return { ok: true };
    }),
  );
  revalidatePath("/");
  return toRunResult(results);
}

export async function bulkCreateHistorics(
  searches: { id: string; name: string }[],
  categories: HistoricCategory[],
  startDate: string,
  endDate: string,
  onlineNewsLicenses?: OnlineNewsLicense[],
  printNewsLicenses?: PrintNewsLicense[],
): Promise<BulkHistoricRunResult> {
  const results = await runInBatches(searches, async ({ id, name }) => {
    try {
      const data = await pulsarRequest<{
        createHistoric: { errors: MutationError[]; historics: Historic[] | null };
      }>(CREATE_HISTORIC, {
        input: {
          searchId: id,
          categories,
          startDate,
          endDate,
          onlineNewsLicenses: onlineNewsLicenses?.length ? onlineNewsLicenses : undefined,
          printNewsLicenses: printNewsLicenses?.length ? printNewsLicenses : undefined,
        },
      });
      if (data.createHistoric.errors?.length) {
        return { searchId: id, name, historicId: null, ok: false, error: errorMessage(data.createHistoric.errors) };
      }
      const historic = data.createHistoric.historics?.[0] ?? null;
      if (!historic) {
        return { searchId: id, name, historicId: null, ok: false, error: "No historic returned" };
      }
      return { searchId: id, name, historicId: historic.id, ok: true };
    } catch (error) {
      if (error instanceof PulsarAuthError) {
        return { searchId: id, name, historicId: null, ok: false, error: SESSION_EXPIRED_MESSAGE };
      }
      if (error instanceof PulsarApiError) {
        return { searchId: id, name, historicId: null, ok: false, error: error.message };
      }
      return {
        searchId: id,
        name,
        historicId: null,
        ok: false,
        error: "Something went wrong talking to Pulsar.",
      };
    }
  });
  return { results, sessionExpired: results.some((r) => r.error === SESSION_EXPIRED_MESSAGE) };
}

export async function bulkRefreshHistorics(
  pairs: { searchId: string; historicId: number; name: string }[],
): Promise<BulkHistoricStatusRunResult> {
  const statuses = await runInBatches(pairs, async ({ searchId, historicId, name }) => {
    try {
      const historics = await getHistorics(searchId);
      const historic = historics.find((h) => h.id === historicId) ?? null;
      return { searchId, name, historicId, historic };
    } catch (error) {
      if (error instanceof PulsarAuthError) {
        return { searchId, name, historicId, historic: null, error: SESSION_EXPIRED_MESSAGE };
      }
      return { searchId, name, historicId, historic: null, error: "Couldn't refresh status" };
    }
  });
  return { statuses, sessionExpired: statuses.some((s) => s.error === SESSION_EXPIRED_MESSAGE) };
}

export async function bulkDispatchHistoricAction(
  items: { searchId: string; historicId: number; name: string; action: HistoricAvailableAction }[],
): Promise<BulkRunResult> {
  const results = await runInBatches(items, ({ searchId, historicId, name, action }) =>
    toBulkResult(searchId, name, async () => {
      if (action === "EXPORT") {
        return { ok: false, error: "Export is not supported in this tool yet." };
      }
      const mutation = ACTION_MUTATION[action];
      const data = await pulsarRequest<Record<string, { errors: MutationError[] }>>(mutation, {
        input: { ids: [historicId] },
      });
      const payload = Object.values(data)[0];
      if (payload.errors?.length) {
        return { ok: false, error: errorMessage(payload.errors) };
      }
      revalidatePath(`/searches/${searchId}`);
      return { ok: true };
    }),
  );
  return toRunResult(results);
}
