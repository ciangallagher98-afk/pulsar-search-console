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
import type { Category } from "@/lib/pulsar/types";

export function BulkDataSourcesDialog({
  trigger,
  searches,
}: {
  trigger: React.ReactElement;
  searches: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [toAdd, setToAdd] = useState<Set<Category>>(new Set());
  const [toRemove, setToRemove] = useState<Set<Category>>(new Set());
  const [results, setResults] = useState<BulkResult[] | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle(set: Set<Category>, setter: (s: Set<Category>) => void, category: Category, checked: boolean) {
    const next = new Set(set);
    if (checked) next.add(category);
    else next.delete(category);
    setter(next);
  }

  function reset() {
    setToAdd(new Set());
    setToRemove(new Set());
    setResults(null);
  }

  function apply() {
    startTransition(async () => {
      const result = await bulkUpdateDataSources(searches, Array.from(toAdd), Array.from(toRemove));
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
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit data sources for {searches.length} searches</DialogTitle>
          <DialogDescription>
            Selected sources are added to every search below; removed sources are taken away.
            Each search keeps whatever else it already has enabled.
          </DialogDescription>
        </DialogHeader>

        {results ? (
          <BulkResultsTable results={results} />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {CATEGORY_GROUPS.map((group) => (
              <div key={group.label} className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">{group.label}</h3>
                <div className="space-y-1.5">
                  {group.categories.map((category) => (
                    <div key={category} className="flex items-center justify-between gap-3 text-sm">
                      <span>{formatLabel(category)}</span>
                      <div className="flex shrink-0 items-center gap-3">
                        <label className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Checkbox
                            checked={toAdd.has(category)}
                            onCheckedChange={(checked) =>
                              toggle(toAdd, setToAdd, category, checked === true)
                            }
                          />
                          Add
                        </label>
                        <label className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Checkbox
                            checked={toRemove.has(category)}
                            onCheckedChange={(checked) =>
                              toggle(toRemove, setToRemove, category, checked === true)
                            }
                          />
                          Remove
                        </label>
                      </div>
                    </div>
                  ))}
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
              disabled={isPending || (toAdd.size === 0 && toRemove.size === 0)}
            >
              {isPending ? "Applying…" : `Apply to ${searches.length} searches`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
