import "server-only";
import { PulsarApiError, PulsarAuthError } from "./client";

export interface MutationResult {
  ok: boolean;
  error?: string;
}

// Server Actions run over the network as untrusted POST endpoints — a
// thrown error inside one surfaces as a generic framework error on the
// client, so every action routes its work through this to get a stable
// { ok, error } shape back, including for session expiry mid-action.
export async function runMutation(fn: () => Promise<MutationResult>): Promise<MutationResult> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof PulsarAuthError) {
      return { ok: false, error: "Your session expired. Please sign in again." };
    }
    if (error instanceof PulsarApiError) {
      return { ok: false, error: error.message };
    }
    return { ok: false, error: "Something went wrong talking to Pulsar." };
  }
}
