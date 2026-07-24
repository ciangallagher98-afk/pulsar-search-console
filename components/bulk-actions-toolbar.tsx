"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { BulkDataSourcesDialog } from "@/components/bulk-data-sources-dialog";
import { BulkLicensesDialog } from "@/components/bulk-licenses-dialog";
import { bulkStartSearch, bulkStopSearch } from "@/lib/actions/bulk-actions";
import type { SelectedSearch } from "@/lib/pulsar/types";

export type { SelectedSearch };

export function BulkActionsToolbar({
  searches,
}: {
  searches: SelectedSearch[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function goLive() {
    startTransition(async () => {
      const result = await bulkStartSearch(searches);
      const succeeded = result.results.filter((r) => r.ok).length;
      if (result.stoppedEarly) {
        toast.error(
          `Stopped after several starts in a row failed — ${succeeded} of ${searches.length} started before stopping. Check individual searches, fix the issue, then start the rest.`,
        );
      } else if (succeeded === result.results.length) {
        toast.success(`Started live collection for ${succeeded} searches`);
      } else {
        toast.error(
          `${succeeded} of ${result.results.length} started — check individual searches for errors`,
        );
      }
      router.refresh();
    });
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

  return (
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
            <Button size="sm" disabled={isPending}>
              Go live
            </Button>
          }
          title={`Start live collection for ${searches.length} searches?`}
          description="This starts real-time data collection using each search's current data sources. This is a production action that may incur usage costs. Starts go out a few at a time with a short pause between them, so a large batch may take a while to fully start."
          confirmLabel="Go live"
          onConfirm={goLive}
        />
      </div>
    </div>
  );
}
