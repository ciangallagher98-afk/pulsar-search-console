"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterOptionGroup {
  label: string;
  options: FilterOption[];
}

export function MultiSelectFilter({
  label,
  groups,
  selected,
  onChange,
  contentClassName,
}: {
  label: string;
  groups: FilterOptionGroup[];
  selected: string[];
  onChange: (next: string[]) => void;
  contentClassName?: string;
}) {
  function toggle(value: string, checked: boolean) {
    onChange(checked ? [...selected, value] : selected.filter((v) => v !== value));
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm">
            {label}
            {selected.length > 0 && (
              <Badge variant="secondary" className="ml-1.5">
                {selected.length}
              </Badge>
            )}
          </Button>
        }
      />
      <PopoverContent className={contentClassName ?? "max-h-80 w-64 overflow-y-auto"}>
        <div className="flex items-center justify-between px-1 pb-1">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          {selected.length > 0 && (
            <button
              type="button"
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
              onClick={() => onChange([])}
            >
              Clear
            </button>
          )}
        </div>
        <div className="space-y-3">
          {groups.map((group) => (
            <div key={group.label || "default"} className="space-y-1">
              {group.label && (
                <p className="px-1 text-xs font-medium text-muted-foreground">{group.label}</p>
              )}
              {group.options.map((option) => (
                <div key={option.value} className="flex items-center gap-2 rounded px-1 py-0.5">
                  <Checkbox
                    id={`msf-${option.value}`}
                    checked={selected.includes(option.value)}
                    onCheckedChange={(checked) => toggle(option.value, checked === true)}
                  />
                  <Label htmlFor={`msf-${option.value}`} className="text-sm font-normal">
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
