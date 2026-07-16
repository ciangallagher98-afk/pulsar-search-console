"use server";

import { revalidatePath } from "next/cache";
import { pulsarRequest } from "@/lib/pulsar/client";
import { getSearch } from "@/lib/pulsar/api";
import { buildUpdateSearchPlan } from "@/lib/pulsar/search-kind";
import { runMutation, type MutationResult } from "@/lib/pulsar/mutation-result";
import { START_SEARCH, STOP_SEARCH } from "@/lib/pulsar/mutations";
import type { Category, OnlineNewsLicense, PrintNewsLicense, Search } from "@/lib/pulsar/types";

interface SearchPayload {
  errors: string[];
  search: Search | null;
}

async function runUpdate(
  searchId: string,
  changes: {
    categories?: Category[];
    onlineNewsLicenses?: OnlineNewsLicense[];
    printNewsLicenses?: PrintNewsLicense[];
  },
): Promise<MutationResult> {
  return runMutation(async () => {
    const current = await getSearch(searchId);
    if (!current) return { ok: false, error: "Search not found" };

    const plan = buildUpdateSearchPlan(current, changes);
    const data = await pulsarRequest<Record<string, SearchPayload>>(plan.mutation, {
      input: plan.input,
    });
    const payload = Object.values(data)[0];

    if (payload.errors?.length) {
      return { ok: false, error: payload.errors.join("; ") };
    }

    revalidatePath(`/searches/${searchId}`);
    return { ok: true };
  });
}

export async function updateDataSources(
  searchId: string,
  categories: Category[],
): Promise<MutationResult> {
  return runUpdate(searchId, { categories });
}

export async function updateLicenses(
  searchId: string,
  onlineNewsLicenses: OnlineNewsLicense[],
  printNewsLicenses: PrintNewsLicense[],
): Promise<MutationResult> {
  return runUpdate(searchId, { onlineNewsLicenses, printNewsLicenses });
}

export async function startSearchAction(searchId: string): Promise<MutationResult> {
  return runMutation(async () => {
    const data = await pulsarRequest<{ startSearch: SearchPayload }>(START_SEARCH, {
      input: { id: searchId },
    });
    if (data.startSearch.errors?.length) {
      return { ok: false, error: data.startSearch.errors.join("; ") };
    }
    revalidatePath(`/searches/${searchId}`);
    return { ok: true };
  });
}

export async function stopSearchAction(searchId: string): Promise<MutationResult> {
  return runMutation(async () => {
    const data = await pulsarRequest<{ stopSearch: SearchPayload }>(STOP_SEARCH, {
      input: { id: searchId },
    });
    if (data.stopSearch.errors?.length) {
      return { ok: false, error: data.stopSearch.errors.join("; ") };
    }
    revalidatePath(`/searches/${searchId}`);
    return { ok: true };
  });
}
