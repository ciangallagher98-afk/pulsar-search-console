import "server-only";
import { redirect } from "next/navigation";
import { PulsarAuthError } from "./client";

// Pages call their data fetch through this so an expired/revoked API key
// sends the user back to /login instead of throwing a raw error page.
export async function withAuthGuard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof PulsarAuthError) {
      redirect("/login");
    }
    throw error;
  }
}
