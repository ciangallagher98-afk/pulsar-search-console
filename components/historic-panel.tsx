"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { PreviewBarChart } from "@/components/preview-bar-chart";
import {
  createHistoricAction,
  dispatchHistoricAction,
  listHistorics,
} from "@/lib/actions/historic-actions";
import {
  HISTORIC_CATEGORY_VALUES,
  type Category,
  type Historic,
  type HistoricAvailableAction,
  type HistoricCategory,
} from "@/lib/pulsar/types";
import {
  ACTION_LABEL,
  DESTRUCTIVE_ACTIONS,
  TRANSIENT_STATUSES,
} from "@/lib/pulsar/historic-status";

export function HistoricPanel({
  searchId,
  initialHistorics,
  searchCategories,
}: {
  searchId: string;
  initialHistorics: Historic[];
  searchCategories: Category[];
}) {
  const [historics, setHistorics] = useState(initialHistorics);
  const [isPending, startTransition] = useTransition();

  const defaultCategories = searchCategories.filter((c): c is HistoricCategory =>
    (HISTORIC_CATEGORY_VALUES as readonly string[]).includes(c),
  );
  const [selectedCategories, setSelectedCategories] = useState<Set<HistoricCategory>>(
    new Set(defaultCategories),
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const hasTransient = historics.some((h) => TRANSIENT_STATUSES.has(h.status));
    if (hasTransient && !pollRef.current) {
      pollRef.current = setInterval(async () => {
        const result = await listHistorics(searchId);
        if (!result.ok) {
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
          toast.error(result.error ?? "Couldn't refresh historics");
          return;
        }
        setHistorics(result.historics);
      }, 3000);
    }
    if (!hasTransient && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [historics, searchId]);

  function toggleCategory(category: HistoricCategory, checked: boolean) {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (checked) next.add(category);
      else next.delete(category);
      return next;
    });
  }

  function createHistoric() {
    if (!startDate || !endDate) {
      toast.error("Pick a start and end date first");
      return;
    }
    if (selectedCategories.size === 0) {
      toast.error("Select at least one data source to pull historic content for");
      return;
    }
    startTransition(async () => {
      const result = await createHistoricAction(
        searchId,
        Array.from(selectedCategories),
        startDate,
        endDate,
      );
      if (!result.ok) {
        toast.error(result.error ?? "Failed to create historic");
        return;
      }
      toast.success("Historic created — generating preview…");
      const fresh = await listHistorics(searchId);
      if (fresh.ok) setHistorics(fresh.historics);
    });
  }

  function runAction(historicId: number, action: HistoricAvailableAction) {
    startTransition(async () => {
      const result = await dispatchHistoricAction(searchId, historicId, action);
      if (!result.ok) {
        toast.error(result.error ?? `Failed to run ${action}`);
        return;
      }
      toast.success(`${ACTION_LABEL[action]} succeeded`);
      const fresh = await listHistorics(searchId);
      if (fresh.ok) setHistorics(fresh.historics);
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">New historic ingestion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="historic-start">Start date</Label>
              <Input
                id="historic-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="historic-end">End date</Label>
              <Input
                id="historic-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Data sources to pull</Label>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-4">
              {HISTORIC_CATEGORY_VALUES.map((category) => (
                <div key={category} className="flex items-center gap-2">
                  <Checkbox
                    id={`hist-cat-${category}`}
                    checked={selectedCategories.has(category)}
                    onCheckedChange={(checked) => toggleCategory(category, checked === true)}
                  />
                  <Label htmlFor={`hist-cat-${category}`} className="font-normal text-sm">
                    {category}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <ConfirmActionDialog
            trigger={<Button disabled={isPending}>Preview historic</Button>}
            title="Create a historic preview?"
            description="This creates a historic and generates a preview of estimated volume. It does not ingest content yet — that requires a separate launch step."
            confirmLabel="Create preview"
            onConfirm={createHistoric}
          />
        </CardContent>
      </Card>

      <div className="space-y-4">
        {historics.length === 0 && (
          <p className="text-sm text-muted-foreground">No historics yet for this search.</p>
        )}
        {historics.map((historic) => (
          <Card key={historic.id}>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">
                  Historic #{historic.id} — {historic.startDate} → {historic.endDate}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{historic.category}</p>
              </div>
              <Badge variant={TRANSIENT_STATUSES.has(historic.status) ? "secondary" : "outline"}>
                {historic.status}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {TRANSIENT_STATUSES.has(historic.status) && (
                <p className="text-sm text-muted-foreground">Working — checking every few seconds…</p>
              )}

              {historic.previewResult !== null && (
                <p className="text-sm">
                  Estimated volume:{" "}
                  <span className="font-medium">{historic.previewResult.toLocaleString()}</span>{" "}
                  items
                </p>
              )}

              {historic.previewGraphData && historic.previewGraphData.length > 0 && (
                <PreviewBarChart points={historic.previewGraphData} />
              )}

              <div className="flex flex-wrap gap-2">
                {historic.availableActions.map((action) =>
                  action === "EXPORT" ? (
                    <Button key={action} variant="outline" disabled title="Not supported yet">
                      {ACTION_LABEL[action]}
                    </Button>
                  ) : (
                    <ConfirmActionDialog
                      key={action}
                      trigger={
                        <Button
                          variant={DESTRUCTIVE_ACTIONS.has(action) ? "destructive" : "default"}
                          disabled={isPending}
                        >
                          {ACTION_LABEL[action]}
                        </Button>
                      }
                      title={`${ACTION_LABEL[action]}?`}
                      description={describeAction(action)}
                      confirmLabel={ACTION_LABEL[action]}
                      destructive={DESTRUCTIVE_ACTIONS.has(action)}
                      onConfirm={() => runAction(historic.id, action)}
                    />
                  ),
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function describeAction(action: HistoricAvailableAction) {
  switch (action) {
    case "AUTHORIZE_AND_START":
      return "This authorizes and starts real historic ingestion — it will pull and index the estimated volume shown above. This is a billable, production action.";
    case "LAUNCH":
      return "This launches the historic ingestion run.";
    case "RESUME":
      return "This resumes a stopped historic ingestion run.";
    case "STOP":
      return "This stops the in-progress historic ingestion run.";
    case "DELETE":
      return "This permanently deletes this historic. This cannot be undone.";
    default:
      return "";
  }
}
