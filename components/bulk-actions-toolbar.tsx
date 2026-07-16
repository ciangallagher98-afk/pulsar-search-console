"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { BulkDataSourcesDialog } from "@/components/bulk-data-sources-dialog";
import { BulkLicensesDialog } from "@/components/bulk-licenses-dialog";
import { bulkStartSearch } from "@/lib/actions/bulk-actions";

export function BulkActionsToolbar({
  searches,
}: {
  searches: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function goLive() {
    startTransition(async () => {
      const result = await bulkStartSearch(searches);
      const succeeded = result.results.filter((r) => r.ok).length;
      if (succeeded === result.results.length) {
        toast.success(`Started live collection for ${succeeded} searches`);
      } else {
        toast.error(
          `${succeeded} of ${result.results.length} started — check individual searches for errors`,
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
            <Button size="sm" disabled={isPending}>
              Go live
            </Button>
          }
          title={`Start live collection for ${searches.length} searches?`}
          description="This starts real-time data collection using each search's current data sources. This is a production action that may incur usage costs."
          confirmLabel="Go live"
          onConfirm={goLive}
        />
      </div>
    </div>
  );
}
