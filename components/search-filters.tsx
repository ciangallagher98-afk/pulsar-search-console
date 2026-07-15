"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TYPE_OPTIONS = [
  { value: "ALL", label: "All types" },
  { value: "TOPICS", label: "Topics" },
  { value: "PANELS", label: "Panels" },
  { value: "CONTENTS", label: "Contents" },
];

export function SearchFilters({
  initialName,
  initialType,
}: {
  initialName?: string;
  initialType?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName ?? "");
  const [type, setType] = useState(initialType ?? "ALL");

  function apply(e?: FormEvent) {
    e?.preventDefault();
    const params = new URLSearchParams();
    if (name) params.set("name", name);
    if (type !== "ALL") params.set("type", type);
    router.push(params.size ? `/?${params.toString()}` : "/");
  }

  return (
    <form onSubmit={apply} className="flex flex-wrap items-center gap-3">
      <Input
        placeholder="Search by name…"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="max-w-xs"
      />
      <Select value={type} onValueChange={(value) => setType(value ?? "ALL")}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TYPE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" variant="secondary">
        Filter
      </Button>
    </form>
  );
}
