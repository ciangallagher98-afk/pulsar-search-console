import "server-only";

const ENDPOINT = process.env.PULSAR_API_URL;
const API_KEY = process.env.PULSAR_API_KEY;

interface GraphQLError {
  message: string;
  extensions?: { code?: string };
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
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

export async function pulsarRequest<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  if (!ENDPOINT || !API_KEY) {
    throw new Error(
      "PULSAR_API_URL / PULSAR_API_KEY are not set. Add them to .env.local.",
    );
  }

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

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
