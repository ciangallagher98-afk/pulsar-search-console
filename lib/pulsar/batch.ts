import "server-only";

export interface RunInBatchesOptions<R> {
  concurrency?: number;
  // Pause after each item completes, before starting the next one on that
  // slot. Bulk actions that dispatch real Pulsar jobs (start live
  // collection, launch historic ingestion) have caused platform-wide
  // performance issues affecting other domains, not just the one being
  // acted on — pacing keeps a big batch from landing as one burst even
  // though it's already concurrency-capped. Off by default since most bulk
  // actions here (metadata edits, status polling) aren't job-creating and
  // don't need it.
  delayMs?: number;
  // Stop starting new work after this many consecutive failures, so a
  // broken or rate-limited batch doesn't keep hammering Pulsar on the way
  // to a wall of red results. Off by default (Infinity) — most bulk edits
  // here benefit more from partial-failure visibility than an early stop.
  maxConsecutiveFailures?: number;
  isFailure?: (result: R) => boolean;
}

export interface RunInBatchesResult<R> {
  results: R[];
  stoppedEarly: boolean;
}

// Runs `worker` over `items` with at most `concurrency` in flight at once —
// bulk actions can span dozens of searches, and firing them all in one
// Promise.all would hammer Pulsar's API with a burst of concurrent requests.
export async function runInBatches<T, R>(
  items: T[],
  worker: (item: T) => Promise<R>,
  options: RunInBatchesOptions<R> = {},
): Promise<RunInBatchesResult<R>> {
  const { concurrency = 5, delayMs = 0, maxConsecutiveFailures = Infinity, isFailure = () => false } = options;

  const results: (R | undefined)[] = new Array(items.length);
  let cursor = 0;
  let consecutiveFailures = 0;
  let stoppedEarly = false;

  async function runNext(): Promise<void> {
    if (stoppedEarly) return;
    const index = cursor++;
    if (index >= items.length) return;

    const result = await worker(items[index]);
    results[index] = result;
    consecutiveFailures = isFailure(result) ? consecutiveFailures + 1 : 0;

    if (consecutiveFailures >= maxConsecutiveFailures) {
      stoppedEarly = true;
      return;
    }

    if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
    await runNext();
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runNext));
  return { results: results.filter((r): r is R => r !== undefined), stoppedEarly };
}
