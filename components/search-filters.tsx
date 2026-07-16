"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MultiSelectFilter } from "@/components/multi-select-filter";
import { CATEGORY_GROUPS, formatLabel } from "@/lib/pulsar/category-groups";
import { ONLINE_NEWS_LICENSE_VALUES, PRINT_NEWS_LICENSE_VALUES } from "@/lib/pulsar/types";

const TYPE_OPTIONS = [
  { value: "TOPICS", label: "Topics" },
  { value: "PANELS", label: "Panels" },
  { value: "CONTENTS", label: "Contents" },
];

const REALTIME_OPTIONS = [
  { value: "NOT_PRESENT", label: "Not present" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "STARTED", label: "Started" },
  { value: "STOPPED", label: "Stopped" },
  { value: "COMPLETED", label: "Completed" },
];

const DATA_SOURCE_GROUPS = CATEGORY_GROUPS.map((group) => ({
  label: group.label,
  options: group.categories.map((c) => ({ value: c, label: formatLabel(c) })),
}));

const LICENSE_GROUPS = [
  {
    label: "Online news",
    options: ONLINE_NEWS_LICENSE_VALUES.map((v) => ({ value: v, label: formatLabel(v) })),
  },
  {
    label: "Print news",
    options: PRINT_NEWS_LICENSE_VALUES.map((v) => ({ value: v, label: formatLabel(v) })),
  },
];

function parseList(value?: string): string[] {
  return value ? value.split(",").filter(Boolean) : [];
}

export function SearchFilters({
  initialFolderId,
  initialName,
  initialType,
  initialRealtimeStatus,
  initialCategories,
  initialLicenses,
}: {
  initialFolderId?: string;
  initialName?: string;
  initialType?: string;
  initialRealtimeStatus?: string;
  initialCategories?: string;
  initialLicenses?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName ?? "");
  const [type, setType] = useState<string[]>(parseList(initialType));
  const [realtimeStatus, setRealtimeStatus] = useState<string[]>(parseList(initialRealtimeStatus));
  const [categories, setCategories] = useState<string[]>(parseList(initialCategories));
  const [licenses, setLicenses] = useState<string[]>(parseList(initialLicenses));

  const activeCount =
    (name ? 1 : 0) + type.length + realtimeStatus.length + categories.length + licenses.length;

  function buildParams() {
    const params = new URLSearchParams();
    if (initialFolderId) params.set("folderId", initialFolderId);
    if (name) params.set("name", name);
    if (type.length) params.set("type", type.join(","));
    if (realtimeStatus.length) params.set("realtimeStatus", realtimeStatus.join(","));
    if (categories.length) params.set("categories", categories.join(","));
    if (licenses.length) params.set("licenses", licenses.join(","));
    return params;
  }

  function apply(e?: FormEvent) {
    e?.preventDefault();
    const params = buildParams();
    router.push(params.size ? `/?${params.toString()}` : "/");
  }

  function clearAll() {
    setName("");
    setType([]);
    setRealtimeStatus([]);
    setCategories([]);
    setLicenses([]);
    router.push(initialFolderId ? `/?folderId=${initialFolderId}` : "/");
  }

  return (
    <form onSubmit={apply} className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Search by name…"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="max-w-xs"
      />
      <MultiSelectFilter
        label="Type"
        groups={[{ label: "", options: TYPE_OPTIONS }]}
        selected={type}
        onChange={setType}
        contentClassName="w-48"
      />
      <MultiSelectFilter
        label="Live status"
        groups={[{ label: "", options: REALTIME_OPTIONS }]}
        selected={realtimeStatus}
        onChange={setRealtimeStatus}
        contentClassName="w-48"
      />
      <MultiSelectFilter
        label="Data sources"
        groups={DATA_SOURCE_GROUPS}
        selected={categories}
        onChange={setCategories}
        contentClassName="max-h-96 w-72 overflow-y-auto"
      />
      <MultiSelectFilter
        label="News licenses"
        groups={LICENSE_GROUPS}
        selected={licenses}
        onChange={setLicenses}
        contentClassName="max-h-96 w-64 overflow-y-auto"
      />
      <Button type="submit">Apply filters</Button>
      {activeCount > 0 && (
        <button
          type="button"
          onClick={clearAll}
          className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Clear all
        </button>
      )}
    </form>
  );
}
