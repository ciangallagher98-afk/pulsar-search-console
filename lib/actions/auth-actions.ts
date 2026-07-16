"use server";

import { redirect } from "next/navigation";
import { pulsarRequest, PulsarAuthError } from "@/lib/pulsar/client";
import { clearSessionApiKey, setSessionApiKey } from "@/lib/pulsar/session";

const VALIDATE_QUERY = `
  query ValidateApiKey {
    searches(first: 1) {
      totalCount
    }
  }
`;

export interface SignInState {
  error?: string;
}

export async function signInAction(
  _prevState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const apiKey = String(formData.get("apiKey") ?? "").trim();

  if (!apiKey) {
    return { error: "Enter your Pulsar API key" };
  }

  try {
    await pulsarRequest(VALIDATE_QUERY, undefined, apiKey);
  } catch (error) {
    if (error instanceof PulsarAuthError) {
      return { error: "Pulsar rejected this API key. Double-check it and try again." };
    }
    return { error: "Couldn't reach Pulsar right now. Try again in a moment." };
  }

  await setSessionApiKey(apiKey);
  redirect("/");
}

export async function signOutAction(): Promise<void> {
  await clearSessionApiKey();
  redirect("/login");
}
