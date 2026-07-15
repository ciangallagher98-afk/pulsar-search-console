"use server";

import { revalidatePath } from "next/cache";
import { pulsarRequest } from "@/lib/pulsar/client";
import { getHistorics } from "@/lib/pulsar/api";
import {
  AUTHORIZE_AND_START_HISTORIC,
  CREATE_HISTORIC,
  DELETE_HISTORIC,
  LAUNCH_HISTORIC,
  RESUME_HISTORIC,
  STOP_HISTORIC,
} from "@/lib/pulsar/mutations";
import type {
  Historic,
  HistoricAvailableAction,
  HistoricCategory,
  OnlineNewsLicense,
  PrintNewsLicense,
} from "@/lib/pulsar/types";

interface MutationResult {
  ok: boolean;
  error?: string;
}

interface HistoricsPayload {
  errors: string[];
  historics: Historic[] | null;
}

export async function listHistorics(searchId: string): Promise<Historic[]> {
  return getHistorics(searchId);
}

export async function createHistoricAction(
  searchId: string,
  categories: HistoricCategory[],
  startDate: string,
  endDate: string,
  onlineNewsLicenses?: OnlineNewsLicense[],
  printNewsLicenses?: PrintNewsLicense[],
): Promise<MutationResult> {
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
    return { ok: false, error: data.createHistoric.errors.join("; ") };
  }
  revalidatePath(`/searches/${searchId}`);
  return { ok: true };
}

const ACTION_MUTATION: Record<
  Exclude<HistoricAvailableAction, "EXPORT">,
  string
> = {
  LAUNCH: LAUNCH_HISTORIC,
  AUTHORIZE_AND_START: AUTHORIZE_AND_START_HISTORIC,
  RESUME: RESUME_HISTORIC,
  STOP: STOP_HISTORIC,
  DELETE: DELETE_HISTORIC,
};

export async function dispatchHistoricAction(
  searchId: string,
  historicId: number,
  action: HistoricAvailableAction,
): Promise<MutationResult> {
  if (action === "EXPORT") {
    return { ok: false, error: "Export is not supported in this tool yet." };
  }

  const mutation = ACTION_MUTATION[action];
  const data = await pulsarRequest<Record<string, { errors: string[] }>>(mutation, {
    input: { ids: [historicId] },
  });
  const payload = Object.values(data)[0];

  if (payload.errors?.length) {
    return { ok: false, error: payload.errors.join("; ") };
  }

  revalidatePath(`/searches/${searchId}`);
  return { ok: true };
}
