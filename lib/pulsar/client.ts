import "server-only";
import { getSessionApiKey } from "./session";

const ENDPOINT = process.env.PULSAR_API_URL || "https://trac.pulsarplatform.com/graphql";

interface GraphQLError {
  message: string;
  extensions?: { code?: string };
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
}

// Thrown when there's no session key, or Pulsar rejects the one we have
// (bad, revoked, or expired token) — callers should send the user to /login.
export class PulsarAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PulsarAuthError";
  }
}

export class PulsarApiError extends Error {
  constructor(
    message: string,
    public readonly errors: GraphQLError[],
  ) {
    super(message);
    this.name = "PulsarApiError";
  }
}

// `apiKeyOverride` is used only by the sign-in flow, to validate a
// not-yet-trusted key before it's written to the session cookie. Every
// other caller relies on the session cookie for whichever user is signed in.
export async function pulsarRequest<T>(
  query: string,
  variables?: Record<string, unknown>,
  apiKeyOverride?: string,
): Promise<T> {
  const apiKey = apiKeyOverride ?? (await getSessionApiKey());

  if (!apiKey) {
    throw new PulsarAuthError("Not signed in to Pulsar");
  }

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (res.status === 401 || res.status === 403) {
    throw new PulsarAuthError("Pulsar rejected this API key");
  }

  if (!res.ok) {
    throw new Error(`Pulsar API request failed with status ${res.status}`);
  }

  const json: GraphQLResponse<T> = await res.json();

  if (json.errors?.length) {
    throw new PulsarApiError(
      json.errors.map((e) => e.message).join("; "),
      json.errors,
    );
  }

  if (!json.data) {
    throw new Error("Pulsar API returned no data");
  }

  return json.data;
}
