"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { BulkDataSourcesDialog } from "@/components/bulk-data-sources-dialog";
import { BulkLicensesDialog } from "@/components/bulk-licenses-dialog";
import { PacedQueueProgress } from "@/components/paced-queue-progress";
import { bulkStopSearch } from "@/lib/actions/bulk-actions";
import { startSearchJob } from "@/lib/actions/job-actions";
import { SESSION_EXPIRED_MESSAGE } from "@/lib/pulsar/bulk-result";
import { usePacedQueue } from "@/lib/use-paced-queue";
import type { SelectedSearch } from "@/lib/pulsar/types";

export type { SelectedSearch };

export function BulkActionsToolbar({
  searches,
}: {
  searches: SelectedSearch[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const queue = usePacedQueue();

  // Each start is a new live-collection job on Pulsar, so they go out one a
  // minute from the browser rather than in one burst.
  async function goLive() {
    const batch = [...searches];
    const outcome = await queue.run(batch, startSearchJob, {
      label: (s) => s.name,
      isFailure: (r) => !r.ok,
      retryAfterMs: (r) => r.retryAfterMs,
      shouldAbort: (r) => r.error === SESSION_EXPIRED_MESSAGE,
    });
    const succeeded = outcome.results.filter((r) => r.ok).length;
    if (outcome.aborted) {
      toast.error(`${SESSION_EXPIRED_MESSAGE} ${succeeded} of ${batch.length} had started.`);
    } else if (outcome.stoppedEarly) {
      toast.error(
        `Stopped after several starts in a row failed — ${succeeded} of ${batch.length} started before stopping. Check individual searches, fix the issue, then start the rest.`,
      );
    } else if (outcome.cancelled) {
      toast(`Cancelled — ${succeeded} of ${batch.length} started before you cancelled.`);
    } else if (succeeded === batch.length) {
      toast.success(`Started live collection for ${succeeded} searches`);
    } else {
      toast.error(`${succeeded} of ${batch.length} started — check individual searches for errors`);
    }
    router.refresh();
  }

  function goOffline() {
    startTransition(async () => {
      const result = await bulkStopSearch(searches);
      const succeeded = result.results.filter((r) => r.ok).length;
      if (succeeded === result.results.length) {
        toast.success(`Stopped live collection for ${succeeded} searches`);
      } else {
        toast.error(
          `${succeeded} of ${result.results.length} stopped — check individual searches for errors`,
        );
      }
      router.refresh();
    });
  }

  const minutes = Math.max(0, searches.length - 1);

  return (
    <div className="space-y-2">
    <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-4 py-2">
      <span className="text-sm font-medium">{searches.length} selected</span>
      <div className="ml-auto flex flex-wrap gap-2">
        <BulkDataSourcesDialog
          searches={searches}
          trigger={<Button variant="outline" size="sm">Edit data sources</Button>}
        />
        <BulkLicensesDialog
          searches={searches}
          trigger={<Button variant="outline" size="sm">Edit news licenses</Button>}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/bulk/historics?ids=${searches.map((s) => s.id).join(",")}`)}
        >
          Preview & launch historics
        </Button>
        <ConfirmActionDialog
          trigger={
            <Button variant="outline" size="sm" disabled={isPending}>
              Stop live collection
            </Button>
          }
          title={`Stop live collection for ${searches.length} searches?`}
          description="This stops real-time data collection on every selected search."
          confirmLabel="Stop"
          destructive
          onConfirm={goOffline}
        />
        <ConfirmActionDialog
          trigger={
            <Button size="sm" disabled={isPending || queue.isActive}>
              {queue.isActive ? "Going live…" : "Go live"}
            </Button>
          }
          title={`Start live collection for ${searches.length} searches?`}
          description={`This starts real-time data collection using each search's current data sources. This is a production action that may incur usage costs. To avoid overloading Pulsar, starts go out one a minute — this batch will take about ${minutes} minute${minutes === 1 ? "" : "s"}, and this tab needs to stay open until it finishes.`}
          confirmLabel="Go live"
          // Not awaited, so the dialog closes straight away and the progress
          // bar below shows the batch running.
          onConfirm={() => void goLive()}
        />
      </div>
    </div>
    <PacedQueueProgress state={queue.state} noun="starts" onCancel={queue.cancel} />
    </div>
  );
}
