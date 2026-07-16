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

function useLicenseSet<T extends string>() {
  return useState<Set<T>>(new Set());
}

export function BulkLicensesDialog({
  trigger,
  searches,
}: {
  trigger: React.ReactElement;
  searches: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [addOnline, setAddOnline] = useLicenseSet<OnlineNewsLicense>();
  const [removeOnline, setRemoveOnline] = useLicenseSet<OnlineNewsLicense>();
  const [addPrint, setAddPrint] = useLicenseSet<PrintNewsLicense>();
  const [removePrint, setRemovePrint] = useLicenseSet<PrintNewsLicense>();
  const [results, setResults] = useState<BulkResult[] | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle<T extends string>(set: Set<T>, setter: (s: Set<T>) => void, value: T, checked: boolean) {
    const next = new Set(set);
    if (checked) next.add(value);
    else next.delete(value);
    setter(next);
  }

  function reset() {
    setAddOnline(new Set());
    setRemoveOnline(new Set());
    setAddPrint(new Set());
    setRemovePrint(new Set());
    setResults(null);
  }

  const hasChanges =
    addOnline.size > 0 || removeOnline.size > 0 || addPrint.size > 0 || removePrint.size > 0;

  function apply() {
    startTransition(async () => {
      const result = await bulkUpdateLicenses(
        searches,
        Array.from(addOnline),
        Array.from(removeOnline),
        Array.from(addPrint),
        Array.from(removePrint),
      );
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
            Applies as an add/remove diff against whatever each search already has.
          </DialogDescription>
        </DialogHeader>

        {results ? (
          <BulkResultsTable results={results} />
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Online news licenses</h3>
              <div className="grid gap-2">
                {ONLINE_NEWS_LICENSE_VALUES.map((license) => (
                  <div key={license} className="flex items-center gap-3 text-sm">
                    <span className="w-40 shrink-0">{formatLabel(license)}</span>
                    <label className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Checkbox
                        checked={addOnline.has(license)}
                        onCheckedChange={(checked) =>
                          toggle(addOnline, setAddOnline, license, checked === true)
                        }
                      />
                      Add
                    </label>
                    <label className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Checkbox
                        checked={removeOnline.has(license)}
                        onCheckedChange={(checked) =>
                          toggle(removeOnline, setRemoveOnline, license, checked === true)
                        }
                      />
                      Remove
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Print news licenses</h3>
              <div className="grid gap-2">
                {PRINT_NEWS_LICENSE_VALUES.map((license) => (
                  <div key={license} className="flex items-center gap-3 text-sm">
                    <span className="w-40 shrink-0">{formatLabel(license)}</span>
                    <label className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Checkbox
                        checked={addPrint.has(license)}
                        onCheckedChange={(checked) =>
                          toggle(addPrint, setAddPrint, license, checked === true)
                        }
                      />
                      Add
                    </label>
                    <label className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Checkbox
                        checked={removePrint.has(license)}
                        onCheckedChange={(checked) =>
                          toggle(removePrint, setRemovePrint, license, checked === true)
                        }
                      />
                      Remove
                    </label>
                  </div>
                ))}
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
