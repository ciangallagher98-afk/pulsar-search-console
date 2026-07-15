"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { startSearchAction, stopSearchAction } from "@/lib/actions/search-actions";
import type { SearchRealtimeStatus } from "@/lib/pulsar/types";

export function LiveCollectionPanel({
  searchId,
  realtimeStatus,
  rtStartedAt,
  rtStoppedAt,
}: {
  searchId: string;
  realtimeStatus: SearchRealtimeStatus | null;
  rtStartedAt: string | null;
  rtStoppedAt: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const isLive = realtimeStatus === "STARTED" || realtimeStatus === "SCHEDULED";

  function start() {
    startTransition(async () => {
      const result = await startSearchAction(searchId);
      if (!result.ok) {
        toast.error(result.error ?? "Failed to start live collection");
        return;
      }
      toast.success("Live collection started");
    });
  }

  function stop() {
    startTransition(async () => {
      const result = await stopSearchAction(searchId);
      if (!result.ok) {
        toast.error(result.error ?? "Failed to stop live collection");
        return;
      }
      toast.success("Live collection stopped");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Badge variant={isLive ? "default" : "outline"}>{realtimeStatus ?? "NOT_PRESENT"}</Badge>
        {rtStartedAt && (
          <span className="text-sm text-muted-foreground">
            Started {new Date(rtStartedAt).toLocaleString()}
          </span>
        )}
        {rtStoppedAt && !isLive && (
          <span className="text-sm text-muted-foreground">
            Stopped {new Date(rtStoppedAt).toLocaleString()}
          </span>
        )}
      </div>

      {isLive ? (
        <ConfirmActionDialog
          trigger={
            <Button variant="destructive" disabled={isPending}>
              Stop live collection
            </Button>
          }
          title="Stop live collection?"
          description="This stops real-time data collection for this search. You can start it again later."
          confirmLabel="Stop"
          destructive
          onConfirm={stop}
        />
      ) : (
        <ConfirmActionDialog
          trigger={<Button disabled={isPending}>Go live</Button>}
          title="Start live collection?"
          description="This starts real-time data collection for this search using its current data sources. This is a production action that may incur usage costs."
          confirmLabel="Go live"
          onConfirm={start}
        />
      )}
    </div>
  );
}
