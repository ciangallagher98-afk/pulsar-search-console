"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FolderIcon, FolderOpenIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getSearchesByIds } from "@/lib/actions/search-actions";
import { BulkActionsToolbar } from "@/components/bulk-actions-toolbar";
import type { Folder, SelectedSearch } from "@/lib/pulsar/types";

// Folders are a navigation workflow (Folders > searches within a folder, or
// all searches with no folder scope), not a filter alongside name/type/etc —
// so this owns its own routing rather than composing into SearchFilters.
//
// Separately, folders can be multi-selected (checkboxes, independent of the
// click-to-browse-into-one-folder behavior below) to bulk edit everything
// across several folders at once without leaving the top-level view.
export function FolderNav({
  folders,
  activeFolderId,
}: {
  folders: Folder[];
  activeFolderId?: string;
}) {
  const router = useRouter();
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<number>>(new Set());
  const [bulkSearches, setBulkSearches] = useState<SelectedSearch[] | null>(null);
  const [folderQuery, setFolderQuery] = useState("");

  useEffect(() => {
    if (selectedFolderIds.size === 0) {
      setBulkSearches(null);
      return;
    }
    const ids = Array.from(
      new Set(
        folders.filter((f) => selectedFolderIds.has(f.id)).flatMap((f) => f.searchIds),
      ),
    ).map(String);

    let cancelled = false;
    setBulkSearches(null);
    getSearchesByIds(ids).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        toast.error(result.error ?? "Couldn't load searches for the selected folders");
        setBulkSearches([]);
        return;
      }
      setBulkSearches(result.searches);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedFolderIds, folders]);

  if (folders.length === 0) return null;

  const activeFolder = activeFolderId
    ? folders.find((f) => String(f.id) === activeFolderId)
    : undefined;

  function open(folderId: string | null) {
    router.push(folderId ? `/?folderId=${folderId}` : "/");
  }

  function toggleFolderSelection(folderId: number, checked: boolean) {
    setSelectedFolderIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(folderId);
      else next.delete(folderId);
      return next;
    });
  }

  // Scoped to whatever's currently visible, so this doubles as both
  // "select all folders" (no search) and "select all matching" (searched)
  // without a separate control — and never touches selections hidden by
  // the current search.
  function toggleSelectAllVisible(checked: boolean, visible: Folder[]) {
    setSelectedFolderIds((prev) => {
      const next = new Set(prev);
      for (const folder of visible) {
        if (checked) next.add(folder.id);
        else next.delete(folder.id);
      }
      return next;
    });
  }

  if (activeFolder) {
    return (
      <div className="mb-4 flex items-center gap-2 text-sm">
        <button
          type="button"
          onClick={() => open(null)}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <FolderIcon className="size-4" />
          Folders
        </button>
        <span className="text-muted-foreground">/</span>
        <span className="flex items-center gap-1.5 font-medium">
          <FolderOpenIcon className="size-4 text-primary" />
          {activeFolder.name}
        </span>
        <button
          type="button"
          onClick={() => open(null)}
          className="ml-2 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          View all searches
        </button>
      </div>
    );
  }

  const trimmedQuery = folderQuery.trim();
  const visibleFolders = trimmedQuery
    ? folders.filter((f) => f.name.toLowerCase().includes(trimmedQuery.toLowerCase()))
    : folders;
  const allVisibleSelected =
    visibleFolders.length > 0 && visibleFolders.every((f) => selectedFolderIds.has(f.id));
  const someVisibleSelected = visibleFolders.some((f) => selectedFolderIds.has(f.id));

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <FolderIcon className="size-4" />
          Folders
        </span>
        <Input
          value={folderQuery}
          onChange={(e) => setFolderQuery(e.target.value)}
          placeholder="Search folders…"
          className="h-7 max-w-48 text-sm"
        />
        {visibleFolders.length > 0 && (
          <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Checkbox
              checked={allVisibleSelected}
              indeterminate={someVisibleSelected && !allVisibleSelected}
              onCheckedChange={(checked) => toggleSelectAllVisible(checked === true, visibleFolders)}
              aria-label={trimmedQuery ? "Select all matching folders" : "Select all folders"}
            />
            {trimmedQuery ? `Select all matching (${visibleFolders.length})` : "Select all"}
          </label>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {visibleFolders.length === 0 ? (
          <span className="text-sm text-muted-foreground">
            No folders match &quot;{folderQuery.trim()}&quot;.
          </span>
        ) : (
          visibleFolders.map((folder) => (
            <div
              key={folder.id}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm transition-colors",
                "border-border bg-background",
                selectedFolderIds.has(folder.id) && "border-primary bg-accent",
              )}
            >
              <Checkbox
                checked={selectedFolderIds.has(folder.id)}
                onCheckedChange={(checked) => toggleFolderSelection(folder.id, checked === true)}
                aria-label={`Select ${folder.name} for bulk edit`}
              />
              <button
                type="button"
                onClick={() => open(String(folder.id))}
                className="hover:underline"
              >
                {folder.name}
              </button>
              <span className="text-xs text-muted-foreground">{folder.searchIds.length}</span>
            </div>
          ))
        )}
      </div>

      {selectedFolderIds.size > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {selectedFolderIds.size} folder{selectedFolderIds.size > 1 ? "s" : ""} selected
              {bulkSearches && ` — ${bulkSearches.length} searches`}
            </span>
            <button
              type="button"
              onClick={() => setSelectedFolderIds(new Set())}
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Clear
            </button>
          </div>
          {bulkSearches === null ? (
            <p className="text-sm text-muted-foreground">Loading searches…</p>
          ) : bulkSearches.length === 0 ? (
            <p className="text-sm text-muted-foreground">No searches in the selected folders.</p>
          ) : (
            <BulkActionsToolbar searches={bulkSearches} />
          )}
        </div>
      )}
    </div>
  );
}
