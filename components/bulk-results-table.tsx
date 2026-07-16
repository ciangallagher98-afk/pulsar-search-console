import { CheckCircle2, XCircle } from "lucide-react";
import type { BulkResult } from "@/lib/pulsar/bulk-result";

export function BulkResultsTable({ results }: { results: BulkResult[] }) {
  const succeeded = results.filter((r) => r.ok).length;

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        {succeeded} of {results.length} succeeded
      </p>
      <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-2">
        {results.map((result) => (
          <div key={result.searchId} className="flex items-start gap-2 text-sm">
            {result.ok ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            ) : (
              <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
            )}
            <div>
              <span>{result.name}</span>
              {result.error && <p className="text-xs text-destructive">{result.error}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
