import { Badge } from "@/components/ui/badge";
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
  const overflow = items.length - shown.length;

  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((item) => (
        <Badge key={item} variant="outline" className="font-normal text-xs">
          {formatLabel(item)}
        </Badge>
      ))}
      {overflow > 0 && (
        <Badge variant="outline" className="font-normal text-xs text-muted-foreground">
          +{overflow}
        </Badge>
      )}
    </div>
  );
}
