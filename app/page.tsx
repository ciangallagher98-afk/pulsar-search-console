import { getFolders, getSearches } from "@/lib/pulsar/api";
import { withAuthGuard } from "@/lib/pulsar/guard";
import { SearchFilters } from "@/components/search-filters";
import { SearchTable } from "@/components/search-table";
import { SessionBar } from "@/components/session-bar";
import { PaginationBar } from "@/components/pagination-bar";
import { splitLicenseValues, type Category, type SearchRealtimeStatus, type SearchType } from "@/lib/pulsar/types";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    folderId?: string;
    name?: string;
    type?: string;
    realtimeStatus?: string;
    categories?: string;
    licenses?: string;
    cursors?: string;
    pageSize?: string;
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

  const cursors = parseList(params.cursors);
  const pageSize = params.pageSize && ["25", "50", "75", "100", "ALL"].includes(params.pageSize)
    ? params.pageSize
    : "25";
  const first = pageSize === "ALL" ? Infinity : Number(pageSize);
  const after = cursors.length ? cursors[cursors.length - 1] : undefined;

  const { connection, folders } = await withAuthGuard(async () => {
    const [connection, folders] = await Promise.all([
      getSearches({
        name: params.name,
        type: type.length ? type : undefined,
        realtimeStatus: realtimeStatus.length ? realtimeStatus : undefined,
        categories: categories.length ? categories : undefined,
        onlineNewsLicenses: onlineNewsLicenses.length ? onlineNewsLicenses : undefined,
        printNewsLicenses: printNewsLicenses.length ? printNewsLicenses : undefined,
        folderId: params.folderId,
        first,
        after,
      }),
      getFolders(),
    ]);
    return { connection, folders };
  });

  const rangeStart = cursors.length * Number(pageSize === "ALL" ? 0 : pageSize) + 1;
  const rangeEnd = rangeStart + connection.nodes.length - 1;

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
        folders={folders}
        initialFolderId={params.folderId}
        initialName={params.name}
        initialType={params.type}
        initialRealtimeStatus={params.realtimeStatus}
        initialCategories={params.categories}
        initialLicenses={params.licenses}
      />

      <div className="mt-6">
        <SearchTable searches={connection.nodes} />
      </div>

      <div className="mt-6">
        <PaginationBar
          currentParams={params}
          cursors={cursors}
          pageSize={pageSize}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          totalCount={connection.totalCount}
          hasNextPage={connection.pageInfo.hasNextPage}
          nextCursor={connection.pageInfo.endCursor}
        />
      </div>
    </main>
  );
}
