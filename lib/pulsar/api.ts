import "server-only";
import { pulsarRequest } from "./client";
import { FOLDERS_QUERY, HISTORICS_QUERY, SEARCHES_QUERY, SEARCH_QUERY } from "./queries";
import type { Folder, Historic, Search, SearchConnection, SearchesFilter } from "./types";

// Pulsar caps `first` at 50 per request regardless of what's asked for, so
// page sizes above that (or "ALL", passed as Infinity) are served by
// chaining sequential requests and merging them into one logical page.
const MAX_PAGE_SIZE = 50;

interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
}

interface RawSearchConnection {
  totalCount: number;
  pageInfo: PageInfo;
  nodes: Search[];
}

async function fetchSearchesPage(
  filter: SearchesFilter,
  after: string | undefined,
  take: number,
): Promise<RawSearchConnection> {
  const data = await pulsarRequest<{ searches: RawSearchConnection }>(SEARCHES_QUERY, {
    name: filter.name || undefined,
    status: filter.status?.length ? filter.status : undefined,
    type: filter.type?.length ? filter.type : undefined,
    realtimeStatus: filter.realtimeStatus?.length ? filter.realtimeStatus : undefined,
    categories: filter.categories?.length ? filter.categories : undefined,
    onlineNewsLicenses: filter.onlineNewsLicenses?.length ? filter.onlineNewsLicenses : undefined,
    printNewsLicenses: filter.printNewsLicenses?.length ? filter.printNewsLicenses : undefined,
    folderId: filter.folderId || undefined,
    first: take,
    after,
  });
  return data.searches;
}

export async function getSearches(filter: SearchesFilter = {}): Promise<SearchConnection> {
  const target = filter.first ?? 25;
  let after = filter.after;
  let nodes: Search[] = [];
  let totalCount = 0;
  let firstPageInfo: PageInfo | null = null;
  let lastPageInfo: PageInfo | null = null;

  while (nodes.length < target) {
    const take = Math.min(MAX_PAGE_SIZE, target - nodes.length);
    const page = await fetchSearchesPage(filter, after, take);
    firstPageInfo ??= page.pageInfo;
    lastPageInfo = page.pageInfo;
    totalCount = page.totalCount;
    nodes = nodes.concat(page.nodes);
    after = page.pageInfo.endCursor ?? undefined;
    if (!page.pageInfo.hasNextPage || page.nodes.length === 0) break;
  }

  return {
    nodes,
    totalCount,
    pageInfo: {
      hasNextPage: lastPageInfo?.hasNextPage ?? false,
      hasPreviousPage: firstPageInfo?.hasPreviousPage ?? false,
      startCursor: firstPageInfo?.startCursor ?? null,
      endCursor: lastPageInfo?.endCursor ?? null,
    },
  };
}

export async function getFolders(): Promise<Folder[]> {
  let after: string | undefined;
  let all: Folder[] = [];

  for (;;) {
    const data = await pulsarRequest<{
      folders: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: Folder[] };
    }>(FOLDERS_QUERY, { first: MAX_PAGE_SIZE, after });
    all = all.concat(data.folders.nodes);
    if (!data.folders.pageInfo.hasNextPage) break;
    after = data.folders.pageInfo.endCursor ?? undefined;
  }

  return all;
}

export async function getSearch(id: string): Promise<Search | null> {
  const data = await pulsarRequest<{ search: { search: Search } | null }>(SEARCH_QUERY, {
    id,
  });
  return data.search?.search ?? null;
}

export async function getHistorics(searchId: string): Promise<Historic[]> {
  const data = await pulsarRequest<{ historics: { nodes: Historic[] } }>(HISTORICS_QUERY, {
    searchId,
  });
  return data.historics.nodes;
}
