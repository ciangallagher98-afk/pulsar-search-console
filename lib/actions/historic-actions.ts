"use server";

import { revalidatePath } from "next/cache";
import { pulsarRequest, PulsarAuthError } from "@/lib/pulsar/client";
import { getHistorics } from "@/lib/pulsar/api";
import { runMutation, type MutationResult } from "@/lib/pulsar/mutation-result";
import { CREATE_HISTORIC, errorMessage, type MutationError } from "@/lib/pulsar/mutations";
import { ACTION_MUTATION } from "@/lib/pulsar/historic-status";
import type {
  Historic,
  HistoricAvailableAction,
  HistoricCategory,
  OnlineNewsLicense,
  PrintNewsLicense,
} from "@/lib/pulsar/types";

interface HistoricsPayload {
  errors: MutationError[];
  historics: Historic[] | null;
}

export interface ListHistoricsResult {
  ok: boolean;
  historics: Historic[];
  error?: string;
}

// Called from a client-side poll, so it can't just throw across the
// server/client boundary on an expired session — the poller needs a
// structured result it can use to stop polling and prompt sign-in.
export async function listHistorics(searchId: string): Promise<ListHistoricsResult> {
  try {
    const historics = await getHistorics(searchId);
    return { ok: true, historics };
  } catch (error) {
    if (error instanceof PulsarAuthError) {
      return { ok: false, historics: [], error: "Your session expired. Please sign in again." };
    }
    return { ok: false, historics: [], error: "Couldn't refresh historics." };
  }
}

export async function createHistoricAction(
  searchId: string,
  categories: HistoricCategory[],
  startDate: string,
  endDate: string,
  onlineNewsLicenses?: OnlineNewsLicense[],
  printNewsLicenses?: PrintNewsLicense[],
): Promise<MutationResult> {
  return runMutation(async () => {
    const data = await pulsarRequest<{ createHistoric: HistoricsPayload }>(CREATE_HISTORIC, {
      input: {
        searchId,
        categories,
        startDate,
        endDate,
        onlineNewsLicenses: onlineNewsLicenses?.length ? onlineNewsLicenses : undefined,
        printNewsLicenses: printNewsLicenses?.length ? printNewsLicenses : undefined,
      },
    });
    if (data.createHistoric.errors?.length) {
      return { ok: false, error: errorMessage(data.createHistoric.errors) };
    }
    revalidatePath(`/searches/${searchId}`);
    return { ok: true };
  });
}

export async function dispatchHistoricAction(
  searchId: string,
  historicId: number,
  action: HistoricAvailableAction,
): Promise<MutationResult> {
  if (action === "EXPORT") {
    return { ok: false, error: "Export is not supported in this tool yet." };
  }

  return runMutation(async () => {
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
  });
}
