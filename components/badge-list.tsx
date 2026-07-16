"use client";

import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatLabel } from "@/lib/pulsar/category-groups";

export function BadgeList({
  items,
  max = 3,
  emptyLabel = "—",
}: {
  items: string[];
  max?: number;
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return <span className="text-sm text-muted-foreground">{emptyLabel}</span>;
  }

  const shown = items.slice(0, max);
  const overflow = items.slice(max);

  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((item) => (
        <Badge key={item} variant="secondary" className="font-normal text-xs">
          {formatLabel(item)}
        </Badge>
      ))}
      {overflow.length > 0 && (
        <Popover>
          <PopoverTrigger
            render={
              <button type="button">
                <Badge
                  variant="outline"
                  className="cursor-pointer font-normal text-xs text-muted-foreground hover:bg-accent"
                >
                  +{overflow.length}
                </Badge>
              </button>
            }
          />
          <PopoverContent className="w-56" align="start">
            <div className="flex flex-wrap gap-1">
              {items.map((item) => (
                <Badge key={item} variant="secondary" className="font-normal text-xs">
                  {formatLabel(item)}
                </Badge>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
