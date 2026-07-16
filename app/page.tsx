import Link from "next/link";
import { getSearches } from "@/lib/pulsar/api";
import { withAuthGuard } from "@/lib/pulsar/guard";
import { SearchFilters } from "@/components/search-filters";
import { SearchTable } from "@/components/search-table";
import { SessionBar } from "@/components/session-bar";
import { splitLicenseValues, type Category, type SearchRealtimeStatus, type SearchType } from "@/lib/pulsar/types";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    name?: string;
    type?: string;
    realtimeStatus?: string;
    categories?: string;
    licenses?: string;
    after?: string;
  }>;
}

function parseList(value?: string): string[] {
  return value ? value.split(",").filter(Boolean) : [];
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const type = parseList(params.type) as SearchType[];
  const realtimeStatus = parseList(params.realtimeStatus) as SearchRealtimeStatus[];
  const categories = parseList(params.categories) as Category[];
  const { online: onlineNewsLicenses, print: printNewsLicenses } = splitLicenseValues(
    parseList(params.licenses),
  );

  const connection = await withAuthGuard(() =>
    getSearches({
      name: params.name,
      type: type.length ? type : undefined,
      realtimeStatus: realtimeStatus.length ? realtimeStatus : undefined,
      categories: categories.length ? categories : undefined,
      onlineNewsLicenses: onlineNewsLicenses.length ? onlineNewsLicenses : undefined,
      printNewsLicenses: printNewsLicenses.length ? printNewsLicenses : undefined,
      first: 25,
      after: params.after,
    }),
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pulsar Search Console</h1>
          <p className="text-sm text-muted-foreground">
            {connection.totalCount} searches on your Pulsar team
          </p>
        </div>
        <SessionBar />
      </div>

      <SearchFilters
        initialName={params.name}
        initialType={params.type}
        initialRealtimeStatus={params.realtimeStatus}
        initialCategories={params.categories}
        initialLicenses={params.licenses}
      />

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
