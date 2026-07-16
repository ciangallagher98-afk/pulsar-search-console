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
import { BulkResultsTable } from "@/components/bulk-results-table";
import {
  bulkCreateHistorics,
  bulkDispatchHistoricAction,
  bulkRefreshHistorics,
} from "@/lib/actions/bulk-actions";
import { TRANSIENT_STATUSES } from "@/lib/pulsar/historic-status";
import {
  HISTORIC_CATEGORY_VALUES,
  type Category,
  type Historic,
  type HistoricAvailableAction,
  type HistoricCategory,
} from "@/lib/pulsar/types";
import type { BulkResult } from "@/lib/pulsar/bulk-result";

interface PreviewRow {
  searchId: string;
  name: string;
  historicId: number | null;
  historic: Historic | null;
  error?: string;
}

function pickLaunchAction(historic: Historic | null): HistoricAvailableAction | null {
  if (!historic) return null;
  if (historic.availableActions.includes("AUTHORIZE_AND_START")) return "AUTHORIZE_AND_START";
  if (historic.availableActions.includes("LAUNCH")) return "LAUNCH";
  return null;
}

export function BulkHistoricWizard({
  searches,
}: {
  searches: { id: string; name: string; categories: Category[] }[];
}) {
  const [stage, setStage] = useState<"configure" | "results">("configure");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const defaultCategories = Array.from(
    new Set(searches.flatMap((s) => s.categories)),
  ).filter((c): c is HistoricCategory => (HISTORIC_CATEGORY_VALUES as readonly string[]).includes(c));
  const [selectedCategories, setSelectedCategories] = useState<Set<HistoricCategory>>(
    new Set(defaultCategories),
  );

  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [launchResults, setLaunchResults] = useState<BulkResult[] | null>(null);
  const [isPending, startTransition] = useTransition();

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const settled = rows.every((r) => !r.historic || !TRANSIENT_STATUSES.has(r.historic.status));

  useEffect(() => {
    if (stage !== "results") return;
    const pending = rows.filter((r) => r.historicId !== null && r.historic && TRANSIENT_STATUSES.has(r.historic.status));
    if (pending.length === 0) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }
    if (pollRef.current) return;

    pollRef.current = setInterval(async () => {
      const pairs = rows
        .filter((r) => r.historicId !== null)
        .map((r) => ({ searchId: r.searchId, historicId: r.historicId as number, name: r.name }));
      const result = await bulkRefreshHistorics(pairs);
      if (result.sessionExpired) {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        toast.error("Your session expired. Please sign in again.");
        return;
      }
      setRows((prev) =>
        prev.map((row) => {
          const match = result.statuses.find((s) => s.searchId === row.searchId);
          return match ? { ...row, historic: match.historic, error: match.error } : row;
        }),
      );
    }, 3000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [stage, rows]);

  function toggleCategory(category: HistoricCategory, isChecked: boolean) {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (isChecked) next.add(category);
      else next.delete(category);
      return next;
    });
  }

  function runPreview() {
    if (!startDate || !endDate) {
      toast.error("Pick a start and end date first");
      return;
    }
    if (selectedCategories.size === 0) {
      toast.error("Select at least one data source to pull historic content for");
      return;
    }
    startTransition(async () => {
      const result = await bulkCreateHistorics(
        searches.map((s) => ({ id: s.id, name: s.name })),
        Array.from(selectedCategories),
        startDate,
        endDate,
      );
      if (result.sessionExpired) {
        toast.error("Your session expired. Please sign in again.");
        return;
      }
      const initialRows: PreviewRow[] = result.results.map((r) => ({
        searchId: r.searchId,
        name: r.name,
        historicId: r.historicId,
        historic: null,
        error: r.error,
      }));
      setRows(initialRows);
      setChecked(new Set(initialRows.filter((r) => r.historicId !== null).map((r) => r.searchId)));
      setStage("results");
    });
  }

  function launch() {
    startTransition(async () => {
      const items = rows
        .filter((r) => checked.has(r.searchId) && r.historicId !== null)
        .map((r) => ({
          searchId: r.searchId,
          historicId: r.historicId as number,
          name: r.name,
          action: pickLaunchAction(r.historic) as HistoricAvailableAction,
        }))
        .filter((r) => r.action !== null);

      const result = await bulkDispatchHistoricAction(items);
      setLaunchResults(result.results);
    });
  }

  const launchableRows = rows.filter((r) => pickLaunchAction(r.historic) !== null);
  const checkedTotal = rows
    .filter((r) => checked.has(r.searchId))
    .reduce((sum, r) => sum + (r.historic?.previewResult ?? 0), 0);
  const checkedCount = rows.filter((r) => checked.has(r.searchId)).length;

  if (stage === "configure") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configure historic pull</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="bulk-start">Start date</Label>
              <Input
                id="bulk-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bulk-end">End date</Label>
              <Input
                id="bulk-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Data sources to pull (applies to every selected search)</Label>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-4">
              {HISTORIC_CATEGORY_VALUES.map((category) => (
                <div key={category} className="flex items-center gap-2">
                  <Checkbox
                    id={`bulk-cat-${category}`}
                    checked={selectedCategories.has(category)}
                    onCheckedChange={(c) => toggleCategory(category, c === true)}
                  />
                  <Label htmlFor={`bulk-cat-${category}`} className="text-sm font-normal">
                    {category}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={runPreview} disabled={isPending}>
            {isPending ? "Starting…" : `Run preview for ${searches.length} searches`}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (launchResults) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Launch results</CardTitle>
        </CardHeader>
        <CardContent>
          <BulkResultsTable results={launchResults} />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {settled ? "Preview complete" : "Generating previews…"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.map((row) => (
            <div key={row.searchId} className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {row.historicId !== null && (
                    <Checkbox
                      checked={checked.has(row.searchId)}
                      onCheckedChange={(c) =>
                        setChecked((prev) => {
                          const next = new Set(prev);
                          if (c === true) next.add(row.searchId);
                          else next.delete(row.searchId);
                          return next;
                        })
                      }
                      disabled={!pickLaunchAction(row.historic)}
                    />
                  )}
                  <span className="text-sm font-medium">{row.name}</span>
                </div>
                <Badge variant={row.historic && TRANSIENT_STATUSES.has(row.historic.status) ? "secondary" : "outline"}>
                  {row.historic?.status ?? (row.error ? "ERROR" : "PENDING")}
                </Badge>
              </div>
              {row.error && <p className="mt-1 text-xs text-destructive">{row.error}</p>}
              {row.historic?.previewResult != null && (
                <p className="mt-1 text-sm">
                  Estimated volume:{" "}
                  <span className="font-medium">{row.historic.previewResult.toLocaleString()}</span> items
                </p>
              )}
              {row.historic?.previewGraphData && row.historic.previewGraphData.length > 0 && (
                <div className="mt-2">
                  <PreviewBarChart points={row.historic.previewGraphData} />
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {settled && (
        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <p className="text-sm">
              {checkedCount} of {launchableRows.length} launchable searches selected — est.{" "}
              <span className="font-medium">{checkedTotal.toLocaleString()}</span> items total
            </p>
            <ConfirmActionDialog
              trigger={
                <Button disabled={isPending || checkedCount === 0}>
                  Launch ingestion for {checkedCount} searches
                </Button>
              }
              title={`Launch ingestion for ${checkedCount} searches?`}
              description={`This authorizes and starts real historic ingestion, totaling an estimated ${checkedTotal.toLocaleString()} items. This is a billable, production action.`}
              confirmLabel="Launch"
              destructive
              onConfirm={launch}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
