"use server";

import { revalidatePath } from "next/cache";
import { pulsarRequest, PulsarAuthError } from "@/lib/pulsar/client";
import { getSearch } from "@/lib/pulsar/api";
import { runInBatches } from "@/lib/pulsar/batch";
import { buildUpdateSearchPlan } from "@/lib/pulsar/search-kind";
import { runMutation, type MutationResult } from "@/lib/pulsar/mutation-result";
import { START_SEARCH, STOP_SEARCH, errorMessage, type MutationError } from "@/lib/pulsar/mutations";
import type {
  Category,
  OnlineNewsLicense,
  PrintNewsLicense,
  Search,
  SelectedSearch,
} from "@/lib/pulsar/types";

interface SearchPayload {
  errors: MutationError[];
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
      return { ok: false, error: errorMessage(payload.errors) };
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
      return { ok: false, error: errorMessage(data.startSearch.errors) };
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
      return { ok: false, error: errorMessage(data.stopSearch.errors) };
    }
    revalidatePath(`/searches/${searchId}`);
    return { ok: true };
  });
}

export interface SearchesLookupResult {
  ok: boolean;
  searches: SelectedSearch[];
  error?: string;
}

// Used to hydrate bulk-edit surfaces (e.g. selecting one or more folders)
// with the real category/license state of every search they contain, since
// folders only carry search ids, not the full records.
export async function getSearchesByIds(ids: string[]): Promise<SearchesLookupResult> {
  try {
    const searches = await runInBatches(ids, (id) => getSearch(id));
    return {
      ok: true,
      searches: searches
        .filter((s): s is Search => s !== null)
        .map((s) => ({
          id: String(s.id),
          name: s.name || `Search ${s.id}`,
          categories: s.categories ?? [],
          onlineNewsLicenses: s.onlineNewsLicenses ?? [],
          printNewsLicenses: s.printNewsLicenses ?? [],
        })),
    };
  } catch (error) {
    if (error instanceof PulsarAuthError) {
      return { ok: false, searches: [], error: "Your session expired. Please sign in again." };
    }
    return { ok: false, searches: [], error: "Couldn't load searches for the selected folders." };
  }
}
