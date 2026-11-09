"use client";

import { useEffect, useRef, useState } from "react";
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
import { PacedQueueProgress } from "@/components/paced-queue-progress";
import { bulkRefreshHistorics } from "@/lib/actions/bulk-actions";
import { createHistoricPreviewJob, launchHistoricJob } from "@/lib/actions/job-actions";
import { TRANSIENT_STATUSES } from "@/lib/pulsar/historic-status";
import {
  DEFAULT_MAX_ACTIVE_INGESTIONS,
  FINISHED_INGESTION_STATUSES,
  MAX_ACTIVE_INGESTION_OPTIONS,
  MAX_ACTIVE_PREVIEWS,
} from "@/lib/pulsar/job-pacing";
import { SESSION_EXPIRED_MESSAGE } from "@/lib/pulsar/bulk-result";
import { usePacedQueue } from "@/lib/use-paced-queue";
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
  historicIds: number[];
  // Populated once the first status refresh comes back — one Historic per
  // data-source category requested, since Pulsar creates a separate historic
  // per category rather than a single combined one.
  historics: Historic[];
  error?: string;
  // Still waiting its turn in the paced queue — no preview created yet.
  queued?: boolean;
}

interface LaunchItem {
  searchId: string;
  historicId: number;
  name: string;
  action: HistoricAvailableAction;
}

function pickLaunchAction(historic: Historic): HistoricAvailableAction | null {
  if (historic.availableActions.includes("AUTHORIZE_AND_START")) return "AUTHORIZE_AND_START";
  if (historic.availableActions.includes("LAUNCH")) return "LAUNCH";
  return null;
}

// A row is "settled" once every historic it's waiting on has been fetched
// at least once and none of them are still in a transient (in-progress) status.
function rowSettled(row: PreviewRow): boolean {
  if (row.queued) return false;
  if (row.historicIds.length === 0) return true;
  if (row.historics.length !== row.historicIds.length) return false;
  return row.historics.every((h) => !TRANSIENT_STATUSES.has(h.status));
}

function rowLaunchActions(row: PreviewRow): { historicId: number; action: HistoricAvailableAction }[] {
  return row.historics.flatMap((h) => {
    const action = pickLaunchAction(h);
    return action ? [{ historicId: h.id, action }] : [];
  });
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
  const [maxActiveIngestions, setMaxActiveIngestions] = useState<number>(DEFAULT_MAX_ACTIVE_INGESTIONS);
  const previewQueue = usePacedQueue();
  const launchQueue = usePacedQueue();

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Latest rows, readable from inside the paced queue's async loop.
  const rowsRef = useRef<PreviewRow[]>([]);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  const settled = rows.every(rowSettled);

  useEffect(() => {
    if (stage !== "results") return;
    const pending = rows.filter((r) => r.historicIds.length > 0 && !rowSettled(r));
    if (pending.length === 0) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }
    if (pollRef.current) return;

    pollRef.current = setInterval(async () => {
      // Only refetch rows still settling — re-polling rows that already
      // finished on every tick was pure waste, and product flagged this
      // recurring polling load specifically.
      const pairs = rows
        .filter((r) => r.historicIds.length > 0 && !rowSettled(r))
        .map((r) => ({ searchId: r.searchId, historicIds: r.historicIds, name: r.name }));
      if (pairs.length === 0) return;
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
          return match ? { ...row, historics: match.historics, error: match.error } : row;
        }),
      );
    }, 5000);

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

    // Every search gets a row straight away, marked as queued; each one fills
    // in as its preview is created. Creating a preview starts one backend
    // job per data source, so they go out one search a minute, and never
    // while MAX_ACTIVE_PREVIEWS searches are still generating.
    const initialRows: PreviewRow[] = searches.map((s) => ({
      searchId: s.id,
      name: s.name,
      historicIds: [],
      historics: [],
      queued: true,
    }));
    setRows(initialRows);
    rowsRef.current = initialRows;
    setChecked(new Set());
    setStage("results");

    const categories = Array.from(selectedCategories);
    void (async () => {
      const outcome = await previewQueue.run(
        searches.map((s) => ({ id: s.id, name: s.name })),
        (search) => createHistoricPreviewJob(search, categories, startDate, endDate),
        {
          label: (search) => search.name,
          isFailure: (r) => !r.ok,
          retryAfterMs: (r) => r.retryAfterMs,
          shouldAbort: (r) => r.error === SESSION_EXPIRED_MESSAGE,
          checkCapacity: async () => {
            const generating = rowsRef.current.filter(
              (r) => !r.queued && r.historicIds.length > 0 && !rowSettled(r),
            ).length;
            return generating >= MAX_ACTIVE_PREVIEWS
              ? `Waiting for ${generating} previews to finish generating`
              : null;
          },
          onResult: (r) => {
            setRows((prev) =>
              prev.map((row) =>
                row.searchId === r.searchId
                  ? { ...row, queued: false, historicIds: r.historicIds, error: r.error }
                  : row,
              ),
            );
            if (r.historicIds.length > 0) {
              setChecked((prev) => new Set(prev).add(r.searchId));
            }
          },
        },
      );

      // Anything not sent (cancelled, stopped early or session expired) is
      // marked so the page can settle instead of waiting forever.
      if (outcome.results.length < searches.length) {
        const reason = outcome.aborted
          ? SESSION_EXPIRED_MESSAGE
          : outcome.stoppedEarly
            ? "Not created — stopped after several failures in a row"
            : "Not created — cancelled";
        setRows((prev) => prev.map((row) => (row.queued ? { ...row, queued: false, error: reason } : row)));
      }
      if (outcome.aborted) toast.error(SESSION_EXPIRED_MESSAGE);
      if (outcome.stoppedEarly) {
        toast.error("Stopped creating previews after several failures in a row. Check the errors below.");
      }
    })();
  }

  function launch() {
    const items: LaunchItem[] = rows
      .filter((r) => checked.has(r.searchId))
      .flatMap((r) =>
        rowLaunchActions(r).map(({ historicId, action }) => ({
          searchId: r.searchId,
          historicId,
          name: r.name,
          action,
        })),
      );

    // Ingestions launched in this batch that we haven't yet seen finish.
    const running = new Map<number, string>(); // historicId -> searchId
    const limit = maxActiveIngestions;

    // Before each launch: if `limit` ingestions from this batch are still
    // running, re-check their status and wait until one finishes.
    async function checkCapacity(): Promise<string | null> {
      if (limit === 0 || running.size < limit) return null;

      const bySearch = new Map<string, number[]>();
      running.forEach((searchId, historicId) => {
        bySearch.set(searchId, [...(bySearch.get(searchId) ?? []), historicId]);
      });
      const result = await bulkRefreshHistorics(
        Array.from(bySearch, ([searchId, historicIds]) => ({ searchId, historicIds, name: searchId })),
      );
      // On an expired session, let the next launch fail and stop the batch.
      if (result.sessionExpired) return null;

      result.statuses.forEach((status) =>
        status.historics.forEach((h) => {
          if (FINISHED_INGESTION_STATUSES.has(h.status)) running.delete(h.id);
        }),
      );
      return running.size >= limit
        ? `${running.size} ingestions from this batch still running (max ${limit} at once)`
        : null;
    }

    setLaunchResults([]);
    void (async () => {
      const outcome = await launchQueue.run(items, launchHistoricJob, {
        label: (item) => item.name,
        isFailure: (r) => !r.ok,
        retryAfterMs: (r) => r.retryAfterMs,
        shouldAbort: (r) => r.error === SESSION_EXPIRED_MESSAGE,
        checkCapacity,
        onResult: (r, item) => {
          if (r.ok) running.set(item.historicId, item.searchId);
          setLaunchResults((prev) => [...(prev ?? []), r]);
        },
      });
      if (outcome.aborted) toast.error(SESSION_EXPIRED_MESSAGE);
      if (outcome.stoppedEarly) {
        toast.error(
          "Stopped early after several launches in a row failed, rather than continuing to fire the rest of a possibly-broken batch. Check the results below, fix the issue, then launch the remaining rows.",
        );
      }
      if (outcome.cancelled) {
        toast(`Cancelled — ${outcome.results.filter((r) => r.ok).length} of ${items.length} ingestions launched.`);
      }
    })();
  }

  const launchableRows = rows.filter((r) => rowSettled(r) && rowLaunchActions(r).length > 0);
  const checkedTotal = rows
    .filter((r) => checked.has(r.searchId))
    .reduce((sum, r) => sum + r.historics.reduce((s, h) => s + (h.previewResult ?? 0), 0), 0);
  const checkedCount = rows.filter((r) => checked.has(r.searchId)).length;
  const checkedJobs = rows
    .filter((r) => checked.has(r.searchId))
    .reduce((sum, r) => sum + rowLaunchActions(r).length, 0);

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

          <p className="text-xs text-muted-foreground">
            Previews go out one search a minute (each search creates one preview per data source), so{" "}
            {searches.length} searches take at least {Math.max(0, searches.length - 1)} minutes. Keep this tab open
            while they&apos;re created.
          </p>

          <Button onClick={runPreview} disabled={previewQueue.isActive}>
            {`Run preview for ${searches.length} searches`}
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
        <CardContent className="space-y-3">
          <PacedQueueProgress state={launchQueue.state} noun="ingestions" onCancel={launchQueue.cancel} />
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
          <PacedQueueProgress state={previewQueue.state} noun="previews" onCancel={previewQueue.cancel} />
          {rows.map((row) => {
            const readyCount = row.historics.filter((h) => !TRANSIENT_STATUSES.has(h.status)).length;
            const loaded = row.historics.length === row.historicIds.length;
            const rowTotal = row.historics.reduce((sum, h) => sum + (h.previewResult ?? 0), 0);
            const combinedGraph = row.historics.find(
              (h) => h.previewGraphData && h.previewGraphData.length > 0,
            )?.previewGraphData;

            return (
              <div key={row.searchId} className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {row.historicIds.length > 0 && (
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
                        disabled={!rowSettled(row) || rowLaunchActions(row).length === 0}
                      />
                    )}
                    <span className="text-sm font-medium">{row.name}</span>
                  </div>
                  <Badge variant={rowSettled(row) ? "outline" : "secondary"}>
                    {row.queued
                      ? "QUEUED"
                      : !loaded
                      ? row.error
                        ? "ERROR"
                        : "PENDING"
                      : rowSettled(row)
                        ? "Preview complete"
                        : `${readyCount}/${row.historics.length} sources ready`}
                  </Badge>
                </div>
                {row.error && <p className="mt-1 text-xs text-destructive">{row.error}</p>}
                {row.historics.length > 0 && (
                  <>
                    {rowTotal > 0 && (
                      <p className="mt-1 text-sm">
                        Estimated volume: <span className="font-medium">{rowTotal.toLocaleString()}</span> items
                        across {row.historics.length} sources
                      </p>
                    )}
                    <div className="mt-2 space-y-1">
                      {row.historics.map((h) => (
                        <div
                          key={h.id}
                          className="flex items-center justify-between text-xs text-muted-foreground"
                        >
                          <span>{h.category}</span>
                          <span className="flex items-center gap-2">
                            {h.previewResult != null && <span>{h.previewResult.toLocaleString()} items</span>}
                            <Badge
                              variant={TRANSIENT_STATUSES.has(h.status) ? "secondary" : "outline"}
                              className="text-[10px]"
                            >
                              {h.status}
                            </Badge>
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {combinedGraph && (
                  <div className="mt-2">
                    <PreviewBarChart points={combinedGraph} />
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {settled && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
            <div className="space-y-2">
              <p className="text-sm">
                {checkedCount} of {launchableRows.length} launchable searches selected — est.{" "}
                <span className="font-medium">{checkedTotal.toLocaleString()}</span> items total
              </p>
              <div className="flex items-center gap-2 text-sm">
                <Label htmlFor="max-active">Max ingestions running at once</Label>
                <select
                  id="max-active"
                  className="h-8 rounded-md border bg-background px-2 text-sm"
                  value={maxActiveIngestions}
                  onChange={(e) => setMaxActiveIngestions(Number(e.target.value))}
                >
                  {MAX_ACTIVE_INGESTION_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n === 0 ? "No limit (1-minute gap only)" : n}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <ConfirmActionDialog
              trigger={
                <Button disabled={checkedCount === 0 || launchQueue.isActive}>
                  Launch ingestion for {checkedCount} searches
                </Button>
              }
              title={`Launch ingestion for ${checkedCount} searches?`}
              description={`This authorizes and starts ${checkedJobs} real historic ingestion jobs (one per data source per search), totaling an estimated ${checkedTotal.toLocaleString()} items. This is a billable, production action. To avoid overloading Pulsar, jobs go out one a minute${maxActiveIngestions > 0 ? `, with no more than ${maxActiveIngestions} running at once` : ""} — so this can take ${Math.max(0, checkedJobs - 1)}+ minutes, and this tab needs to stay open until every job has been sent.`}
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
