"use server";

// Job-creating Pulsar actions, one item per call. The browser's paced queue
// (lib/use-paced-queue.ts) calls these one at a time with a gap between
// them, instead of one Server Action looping over the whole batch — a
// minute-long gap inside a single request would hit Vercel's function
// time limit on anything but a tiny batch.

import { revalidatePath } from "next/cache";
import { pulsarRequest, PulsarApiError, PulsarAuthError } from "@/lib/pulsar/client";
import { claimJobSlot } from "@/lib/pulsar/job-gate";
import { ACTION_MUTATION } from "@/lib/pulsar/historic-status";
import { CREATE_HISTORIC, START_SEARCH, errorMessage, type MutationError } from "@/lib/pulsar/mutations";
import {
  SESSION_EXPIRED_MESSAGE,
  type HistoricJobResult,
  type JobResult,
} from "@/lib/pulsar/bulk-result";
import type {
  Historic,
  HistoricAvailableAction,
  HistoricCategory,
  OnlineNewsLicense,
  PrintNewsLicense,
} from "@/lib/pulsar/types";

function describeError(error: unknown): string {
  if (error instanceof PulsarAuthError) return SESSION_EXPIRED_MESSAGE;
  if (error instanceof PulsarApiError) return error.message;
  return "Something went wrong talking to Pulsar.";
}

// Starting live collection kicks off an ongoing job for the search on
// Pulsar's platform.
export async function startSearchJob(search: { id: string; name: string }): Promise<JobResult> {
  const { id, name } = search;
  const slot = await claimJobSlot();
  if (!slot.ok) return { searchId: id, name, ok: false, retryAfterMs: slot.retryAfterMs };

  try {
    const data = await pulsarRequest<{ startSearch: { errors: MutationError[] } }>(START_SEARCH, {
      input: { id },
    });
    if (data.startSearch.errors?.length) {
      return { searchId: id, name, ok: false, error: errorMessage(data.startSearch.errors) };
    }
    revalidatePath(`/searches/${id}`);
    revalidatePath("/");
    return { searchId: id, name, ok: true };
  } catch (error) {
    return { searchId: id, name, ok: false, error: describeError(error) };
  }
}

// Creating a historic makes Pulsar generate a preview for every data-source
// category requested — one backend job per category for this search.
export async function createHistoricPreviewJob(
  search: { id: string; name: string },
  categories: HistoricCategory[],
  startDate: string,
  endDate: string,
  onlineNewsLicenses?: OnlineNewsLicense[],
  printNewsLicenses?: PrintNewsLicense[],
): Promise<HistoricJobResult> {
  const { id, name } = search;
  const slot = await claimJobSlot();
  if (!slot.ok) return { searchId: id, name, historicIds: [], ok: false, retryAfterMs: slot.retryAfterMs };

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
      return { searchId: id, name, historicIds: [], ok: false, error: errorMessage(data.createHistoric.errors) };
    }
    const historics = data.createHistoric.historics ?? [];
    if (historics.length === 0) {
      return { searchId: id, name, historicIds: [], ok: false, error: "No historic returned" };
    }
    return { searchId: id, name, historicIds: historics.map((h) => h.id), ok: true };
  } catch (error) {
    return { searchId: id, name, historicIds: [], ok: false, error: describeError(error) };
  }
}

// AUTHORIZE_AND_START / LAUNCH is the moment a real ingestion job gets
// queued on Pulsar — the heaviest action in this tool.
export async function launchHistoricJob(item: {
  searchId: string;
  historicId: number;
  name: string;
  action: HistoricAvailableAction;
}): Promise<JobResult> {
  const { searchId, historicId, name, action } = item;
  if (action === "EXPORT") {
    return { searchId, name, ok: false, error: "Export is not supported in this tool yet." };
  }

  const slot = await claimJobSlot();
  if (!slot.ok) return { searchId, name, ok: false, retryAfterMs: slot.retryAfterMs };

  try {
    const data = await pulsarRequest<Record<string, { errors: MutationError[] }>>(ACTION_MUTATION[action], {
      input: { ids: [historicId] },
    });
    const payload = Object.values(data)[0];
    if (payload.errors?.length) {
      return { searchId, name, ok: false, error: errorMessage(payload.errors) };
    }
    revalidatePath(`/searches/${searchId}`);
    return { searchId, name, ok: true };
  } catch (error) {
    return { searchId, name, ok: false, error: describeError(error) };
  }
}
