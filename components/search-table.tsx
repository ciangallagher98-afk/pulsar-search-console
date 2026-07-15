import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Search } from "@/lib/pulsar/types";

const REALTIME_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  STARTED: "default",
  SCHEDULED: "secondary",
  STOPPED: "outline",
  COMPLETED: "outline",
  NOT_PRESENT: "outline",
};

export function SearchTable({ searches }: { searches: Search[] }) {
  if (searches.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
        No searches match these filters.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Data sources</TableHead>
            <TableHead>Live status</TableHead>
            <TableHead>Team</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {searches.map((search) => (
            <TableRow key={search.id}>
              <TableCell className="font-medium">
                <Link href={`/searches/${search.id}`} className="hover:underline">
                  {search.name || `Search ${search.id}`}
                </Link>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{search.type}</Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {search.categories?.length
                  ? `${search.categories.length} enabled`
                  : "None"}
              </TableCell>
              <TableCell>
                <Badge variant={REALTIME_VARIANT[search.realtimeStatus ?? ""] ?? "outline"}>
                  {search.realtimeStatus ?? "NOT_PRESENT"}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {search.teamName}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
