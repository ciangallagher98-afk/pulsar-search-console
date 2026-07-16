"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const PAGE_SIZE_OPTIONS = ["25", "50", "75", "100", "ALL"];

export function PaginationBar({
  currentParams,
  cursors,
  pageSize,
  rangeStart,
  rangeEnd,
  totalCount,
  hasNextPage,
  nextCursor,
}: {
  currentParams: Record<string, string | undefined>;
  cursors: string[];
  pageSize: string;
  rangeStart: number;
  rangeEnd: number;
  totalCount: number;
  hasNextPage: boolean;
  nextCursor: string | null;
}) {
  const router = useRouter();

  function navigate(nextCursors: string[], nextPageSize?: string) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(currentParams)) {
      if (value && key !== "cursors" && key !== "pageSize") params.set(key, value);
    }
    if (nextCursors.length) params.set("cursors", nextCursors.join(","));
    const size = nextPageSize ?? pageSize;
    if (size !== "25") params.set("pageSize", size);
    router.push(params.size ? `/?${params.toString()}` : "/");
  }

  function goNext() {
    if (!nextCursor) return;
    navigate([...cursors, nextCursor]);
  }

  function goPrevious() {
    navigate(cursors.slice(0, -1));
  }

  function changePageSize(size: string) {
    navigate([], size);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
      <span>
        {pageSize === "ALL"
          ? `Showing all ${totalCount}`
          : totalCount === 0
            ? "No results"
            : `Showing ${rangeStart}-${rangeEnd} of ${totalCount}`}
      </span>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs">Per page</span>
          <Select value={pageSize} onValueChange={(v) => v && changePageSize(v)}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {pageSize !== "ALL" && (
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={cursors.length === 0}
              onClick={goPrevious}
            >
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={!hasNextPage} onClick={goNext}>
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
