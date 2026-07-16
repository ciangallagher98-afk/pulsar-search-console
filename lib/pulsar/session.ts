import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "./session-cookie";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export async function getSessionApiKey(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE_NAME)?.value ?? null;
}

// Must be called from a Server Action or Route Handler, not during render.
export async function setSessionApiKey(apiKey: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, apiKey, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: THIRTY_DAYS,
  });
}

export async function clearSessionApiKey(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}
