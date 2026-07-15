import Link from "next/link";
import { getSearches } from "@/lib/pulsar/api";
import { SearchFilters } from "@/components/search-filters";
import { SearchTable } from "@/components/search-table";
import type { SearchType } from "@/lib/pulsar/types";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    name?: string;
    type?: string;
    after?: string;
  }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const type = params.type ? ([params.type] as SearchType[]) : undefined;

  const connection = await getSearches({
    name: params.name,
    type,
    first: 25,
    after: params.after,
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pulsar Search Console</h1>
          <p className="text-sm text-muted-foreground">
            {connection.totalCount} searches on your Pulsar team
          </p>
        </div>
      </div>

      <SearchFilters initialName={params.name} initialType={params.type} />

      <div className="mt-6">
        <SearchTable searches={connection.nodes} />
      </div>

      <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing {connection.nodes.length} of {connection.totalCount}
        </span>
        {connection.pageInfo.hasNextPage && connection.pageInfo.endCursor ? (
          <Link
            className="underline underline-offset-4 hover:text-foreground"
            href={{
              pathname: "/",
              query: {
                ...params,
                after: connection.pageInfo.endCursor,
              },
            }}
          >
            Next page →
          </Link>
        ) : null}
      </div>
    </main>
  );
}
