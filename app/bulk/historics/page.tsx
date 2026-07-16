import Link from "next/link";
import { getSearch } from "@/lib/pulsar/api";
import { withAuthGuard } from "@/lib/pulsar/guard";
import { BulkHistoricWizard } from "@/components/bulk-historic-wizard";
import { SessionBar } from "@/components/session-bar";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ ids?: string }>;
}

export default async function BulkHistoricsPage({ searchParams }: PageProps) {
  const { ids } = await searchParams;
  const searchIds = (ids ?? "").split(",").map((id) => id.trim()).filter(Boolean);

  const searches = await withAuthGuard(async () => {
    const fetched = await Promise.all(searchIds.map((id) => getSearch(id)));
    return fetched.filter((s) => s !== null);
  });

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← All searches
        </Link>
        <SessionBar />
      </div>

      <h1 className="mt-2 mb-8 text-2xl font-semibold tracking-tight">
        Bulk historic ingestion — {searches.length} searches
      </h1>

      {searches.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No valid searches selected. Go back and select some searches first.
        </p>
      ) : (
        <BulkHistoricWizard
          searches={searches.map((s) => ({
            id: String(s.id),
            name: s.name || `Search ${s.id}`,
            categories: s.categories ?? [],
          }))}
        />
      )}
    </main>
  );
}
