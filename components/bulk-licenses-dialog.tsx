"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { BulkResultsTable } from "@/components/bulk-results-table";
import { bulkUpdateLicenses } from "@/lib/actions/bulk-actions";
import { formatLabel } from "@/lib/pulsar/category-groups";
import {
  ONLINE_NEWS_LICENSE_VALUES,
  PRINT_NEWS_LICENSE_VALUES,
  type OnlineNewsLicense,
  type PrintNewsLicense,
} from "@/lib/pulsar/types";
import type { BulkResult } from "@/lib/pulsar/bulk-result";
import type { SelectedSearch } from "@/components/bulk-actions-toolbar";

function countOnline(searches: SelectedSearch[], license: OnlineNewsLicense) {
  return searches.filter((s) => s.onlineNewsLicenses.includes(license)).length;
}

function countPrint(searches: SelectedSearch[], license: PrintNewsLicense) {
  return searches.filter((s) => s.printNewsLicenses.includes(license)).length;
}

export function BulkLicensesDialog({
  trigger,
  searches,
}: {
  trigger: React.ReactElement;
  searches: SelectedSearch[];
}) {
  const [open, setOpen] = useState(false);
  const [desiredOnline, setDesiredOnline] = useState<Set<OnlineNewsLicense>>(
    () => new Set(ONLINE_NEWS_LICENSE_VALUES.filter((l) => countOnline(searches, l) === searches.length)),
  );
  const [desiredPrint, setDesiredPrint] = useState<Set<PrintNewsLicense>>(
    () => new Set(PRINT_NEWS_LICENSE_VALUES.filter((l) => countPrint(searches, l) === searches.length)),
  );
  const [touchedOnline, setTouchedOnline] = useState<Set<OnlineNewsLicense>>(new Set());
  const [touchedPrint, setTouchedPrint] = useState<Set<PrintNewsLicense>>(new Set());
  const [results, setResults] = useState<BulkResult[] | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleOnline(license: OnlineNewsLicense, checked: boolean) {
    setDesiredOnline((prev) => {
      const next = new Set(prev);
      if (checked) next.add(license);
      else next.delete(license);
      return next;
    });
    setTouchedOnline((prev) => new Set(prev).add(license));
  }

  function togglePrint(license: PrintNewsLicense, checked: boolean) {
    setDesiredPrint((prev) => {
      const next = new Set(prev);
      if (checked) next.add(license);
      else next.delete(license);
      return next;
    });
    setTouchedPrint((prev) => new Set(prev).add(license));
  }

  function reset() {
    setDesiredOnline(new Set(ONLINE_NEWS_LICENSE_VALUES.filter((l) => countOnline(searches, l) === searches.length)));
    setDesiredPrint(new Set(PRINT_NEWS_LICENSE_VALUES.filter((l) => countPrint(searches, l) === searches.length)));
    setTouchedOnline(new Set());
    setTouchedPrint(new Set());
    setResults(null);
  }

  const addOnline = Array.from(touchedOnline).filter((l) => desiredOnline.has(l));
  const removeOnline = Array.from(touchedOnline).filter((l) => !desiredOnline.has(l));
  const addPrint = Array.from(touchedPrint).filter((l) => desiredPrint.has(l));
  const removePrint = Array.from(touchedPrint).filter((l) => !desiredPrint.has(l));

  const hasChanges = touchedOnline.size > 0 || touchedPrint.size > 0;

  function apply() {
    startTransition(async () => {
      const result = await bulkUpdateLicenses(searches, addOnline, removeOnline, addPrint, removePrint);
      setResults(result.results);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit news licenses for {searches.length} searches</DialogTitle>
          <DialogDescription>
            Ticked = enabled on every selected search. A dash means it&apos;s only enabled on
            some. Tick to enable everywhere, untick to remove everywhere — anything you don&apos;t
            touch is left as-is.
          </DialogDescription>
        </DialogHeader>

        {results ? (
          <BulkResultsTable results={results} />
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Online news licenses</h3>
              <div className="grid gap-1.5">
                {ONLINE_NEWS_LICENSE_VALUES.map((license) => {
                  const enabledCount = countOnline(searches, license);
                  const indeterminate =
                    !touchedOnline.has(license) && enabledCount > 0 && enabledCount < searches.length;
                  return (
                    <div key={license} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        id={`bl-online-${license}`}
                        checked={desiredOnline.has(license)}
                        indeterminate={indeterminate}
                        onCheckedChange={(checked) => toggleOnline(license, checked === true)}
                      />
                      <label htmlFor={`bl-online-${license}`} className="cursor-pointer">
                        {formatLabel(license)}
                      </label>
                      {enabledCount > 0 && enabledCount < searches.length && (
                        <span className="text-xs text-muted-foreground">
                          ({enabledCount}/{searches.length})
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Print news licenses</h3>
              <div className="grid gap-1.5">
                {PRINT_NEWS_LICENSE_VALUES.map((license) => {
                  const enabledCount = countPrint(searches, license);
                  const indeterminate =
                    !touchedPrint.has(license) && enabledCount > 0 && enabledCount < searches.length;
                  return (
                    <div key={license} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        id={`bl-print-${license}`}
                        checked={desiredPrint.has(license)}
                        indeterminate={indeterminate}
                        onCheckedChange={(checked) => togglePrint(license, checked === true)}
                      />
                      <label htmlFor={`bl-print-${license}`} className="cursor-pointer">
                        {formatLabel(license)}
                      </label>
                      {enabledCount > 0 && enabledCount < searches.length && (
                        <span className="text-xs text-muted-foreground">
                          ({enabledCount}/{searches.length})
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <Separator />
        <DialogFooter>
          {results ? (
            <Button onClick={() => setOpen(false)}>Done</Button>
          ) : (
            <Button onClick={apply} disabled={isPending || !hasChanges}>
              {isPending ? "Applying…" : `Apply to ${searches.length} searches`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
