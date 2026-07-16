"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { BadgeList } from "@/components/badge-list";
import { BulkActionsToolbar } from "@/components/bulk-actions-toolbar";
import type { Search } from "@/lib/pulsar/types";

const REALTIME_STYLE: Record<string, string> = {
  STARTED: "border-transparent bg-success/15 text-success dark:bg-success/20",
  SCHEDULED: "border-transparent bg-warning/20 text-warning-foreground dark:bg-warning/25",
  STOPPED: "border-border text-muted-foreground",
  COMPLETED: "border-border text-muted-foreground",
  NOT_PRESENT: "border-border text-muted-foreground",
};

export function SearchTable({ searches }: { searches: Search[] }) {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  if (searches.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
        No searches match these filters.
      </div>
    );
  }

  const allSelected = searches.length > 0 && searches.every((s) => selected.has(s.id));

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(searches.map((s) => s.id)) : new Set());
  }

  function toggleOne(id: number, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  const selectedSearches = searches
    .filter((s) => selected.has(s.id))
    .map((s) => ({
      id: String(s.id),
      name: s.name || `Search ${s.id}`,
      categories: s.categories ?? [],
      onlineNewsLicenses: s.onlineNewsLicenses ?? [],
      printNewsLicenses: s.printNewsLicenses ?? [],
    }));

  return (
    <div className="space-y-3">
      {selectedSearches.length > 0 && <BulkActionsToolbar searches={selectedSearches} />}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(checked) => toggleAll(checked === true)}
                  aria-label="Select all on this page"
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Data sources</TableHead>
              <TableHead>News licenses</TableHead>
              <TableHead>Live status</TableHead>
              <TableHead>Team</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {searches.map((search) => (
              <TableRow key={search.id} data-state={selected.has(search.id) ? "selected" : undefined}>
                <TableCell>
                  <Checkbox
                    checked={selected.has(search.id)}
                    onCheckedChange={(checked) => toggleOne(search.id, checked === true)}
                    aria-label={`Select ${search.name ?? search.id}`}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  <Link href={`/searches/${search.id}`} className="hover:underline">
                    {search.name || `Search ${search.id}`}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{search.type}</Badge>
                </TableCell>
                <TableCell className="max-w-56">
                  <BadgeList items={search.categories ?? []} />
                </TableCell>
                <TableCell className="max-w-40">
                  <BadgeList
                    items={[...(search.onlineNewsLicenses ?? []), ...(search.printNewsLicenses ?? [])]}
                    max={2}
                    emptyLabel="None"
                  />
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={REALTIME_STYLE[search.realtimeStatus ?? ""] ?? REALTIME_STYLE.NOT_PRESENT}
                  >
                    {search.realtimeStatus ?? "NOT_PRESENT"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{search.teamName}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
