import "server-only";
import { pulsarRequest } from "./client";
import { HISTORICS_QUERY, SEARCHES_QUERY, SEARCH_QUERY } from "./queries";
import type { Historic, Search, SearchConnection, SearchesFilter } from "./types";

export async function getSearches(filter: SearchesFilter = {}): Promise<SearchConnection> {
  const data = await pulsarRequest<{ searches: SearchConnection }>(SEARCHES_QUERY, {
    name: filter.name || undefined,
    status: filter.status?.length ? filter.status : undefined,
    type: filter.type?.length ? filter.type : undefined,
    realtimeStatus: filter.realtimeStatus?.length ? filter.realtimeStatus : undefined,
    categories: filter.categories?.length ? filter.categories : undefined,
    onlineNewsLicenses: filter.onlineNewsLicenses?.length ? filter.onlineNewsLicenses : undefined,
    printNewsLicenses: filter.printNewsLicenses?.length ? filter.printNewsLicenses : undefined,
    first: filter.first ?? 25,
    after: filter.after,
  });
  return data.searches;
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
