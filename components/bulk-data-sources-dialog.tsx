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
import { bulkUpdateDataSources } from "@/lib/actions/bulk-actions";
import { CATEGORY_GROUPS, formatLabel } from "@/lib/pulsar/category-groups";
import type { BulkResult } from "@/lib/pulsar/bulk-result";
import type { Category, SelectedSearch } from "@/lib/pulsar/types";

// A category counts as "on" once the user has touched its checkbox; whatever
// it settles on (checked vs. not) becomes an add or remove. Untouched
// categories are left alone, so a mixed selection doesn't clobber searches
// that already differ from each other.
function countEnabled(searches: SelectedSearch[], category: Category) {
  return searches.filter((s) => s.categories.includes(category)).length;
}

export function BulkDataSourcesDialog({
  trigger,
  searches,
}: {
  trigger: React.ReactElement;
  searches: SelectedSearch[];
}) {
  const [open, setOpen] = useState(false);
  const [desired, setDesired] = useState<Set<Category>>(
    () => new Set(CATEGORY_GROUPS.flatMap((g) => g.categories).filter((c) => countEnabled(searches, c) === searches.length)),
  );
  const [touched, setTouched] = useState<Set<Category>>(new Set());
  const [results, setResults] = useState<BulkResult[] | null>(null);
  const [stoppedEarly, setStoppedEarly] = useState(false);
  const [isPending, startTransition] = useTransition();

  function toggle(category: Category, checked: boolean) {
    setDesired((prev) => {
      const next = new Set(prev);
      if (checked) next.add(category);
      else next.delete(category);
      return next;
    });
    setTouched((prev) => new Set(prev).add(category));
  }

  function reset() {
    setDesired(
      new Set(CATEGORY_GROUPS.flatMap((g) => g.categories).filter((c) => countEnabled(searches, c) === searches.length)),
    );
    setTouched(new Set());
    setResults(null);
    setStoppedEarly(false);
  }

  const toAdd = Array.from(touched).filter((c) => desired.has(c));
  const toRemove = Array.from(touched).filter((c) => !desired.has(c));

  function apply() {
    startTransition(async () => {
      const result = await bulkUpdateDataSources(searches, toAdd, toRemove);
      setResults(result.results);
      setStoppedEarly(!!result.stoppedEarly);
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
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit data sources for {searches.length} searches</DialogTitle>
          <DialogDescription>
            Ticked = enabled on every selected search. A dash means it&apos;s only enabled on
            some. Tick to enable everywhere, untick to remove everywhere — anything you don&apos;t
            touch is left as-is.
          </DialogDescription>
        </DialogHeader>

        {results ? (
          <>
            {stoppedEarly && (
              <p className="text-sm text-destructive">
                Stopped early after several updates in a row failed, rather than continuing to push the rest of a
                possibly-broken batch. Fix the issue below, then re-run for the remaining searches.
              </p>
            )}
            <BulkResultsTable results={results} />
          </>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {CATEGORY_GROUPS.map((group) => (
              <div key={group.label} className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">{group.label}</h3>
                <div className="space-y-1.5">
                  {group.categories.map((category) => {
                    const enabledCount = countEnabled(searches, category);
                    const indeterminate =
                      !touched.has(category) && enabledCount > 0 && enabledCount < searches.length;
                    return (
                      <div key={category} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          id={`bds-${category}`}
                          checked={desired.has(category)}
                          indeterminate={indeterminate}
                          onCheckedChange={(checked) => toggle(category, checked === true)}
                        />
                        <label htmlFor={`bds-${category}`} className="cursor-pointer">
                          {formatLabel(category)}
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
            ))}
          </div>
        )}

        <Separator />
        <DialogFooter>
          {results ? (
            <Button onClick={() => setOpen(false)}>Done</Button>
          ) : (
            <Button
              onClick={apply}
              disabled={isPending || touched.size === 0}
            >
              {isPending ? "Applying…" : `Apply to ${searches.length} searches`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
