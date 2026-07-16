"use client";

import { useRouter } from "next/navigation";
import { FolderIcon, FolderOpenIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Folder } from "@/lib/pulsar/types";

// Folders are a navigation workflow (Folders > searches within a folder, or
// all searches with no folder scope), not a filter alongside name/type/etc —
// so this owns its own routing rather than composing into SearchFilters.
export function FolderNav({
  folders,
  activeFolderId,
}: {
  folders: Folder[];
  activeFolderId?: string;
}) {
  const router = useRouter();

  if (folders.length === 0) return null;

  const activeFolder = activeFolderId
    ? folders.find((f) => String(f.id) === activeFolderId)
    : undefined;

  function open(folderId: string | null) {
    router.push(folderId ? `/?folderId=${folderId}` : "/");
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

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <FolderIcon className="size-4" />
        Folders
      </span>
      {folders.map((folder) => (
        <button
          key={folder.id}
          type="button"
          onClick={() => open(String(folder.id))}
          className={cn(
            "rounded-full border px-3 py-1 text-sm transition-colors",
            "border-border bg-background hover:bg-accent hover:text-accent-foreground",
          )}
        >
          {folder.name}
          <span className="ml-1.5 text-xs text-muted-foreground">{folder.searchIds.length}</span>
        </button>
      ))}
    </div>
  );
}
