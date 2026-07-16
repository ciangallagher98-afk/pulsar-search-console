import type { Historic } from "./types";

export const SESSION_EXPIRED_MESSAGE = "Your session expired. Please sign in again.";

export interface BulkResult {
  searchId: string;
  name: string;
  ok: boolean;
  error?: string;
}

export interface BulkRunResult {
  results: BulkResult[];
  sessionExpired: boolean;
}

export interface BulkHistoricResult {
  searchId: string;
  name: string;
  historicId: number | null;
  ok: boolean;
  error?: string;
}

export interface BulkHistoricRunResult {
  results: BulkHistoricResult[];
  sessionExpired: boolean;
}

export interface BulkHistoricStatus {
  searchId: string;
  name: string;
  historicId: number;
  historic: Historic | null;
  error?: string;
}

export interface BulkHistoricStatusRunResult {
  statuses: BulkHistoricStatus[];
  sessionExpired: boolean;
}
