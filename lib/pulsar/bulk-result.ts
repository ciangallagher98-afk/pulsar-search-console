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
  stoppedEarly?: boolean;
}

// Pulsar creates one Historic per data-source category, so a multi-category
// pull for a single search comes back as several Historic objects — every
// caller here needs to track and act on all of them, not just the first.
export interface BulkHistoricResult {
  searchId: string;
  name: string;
  historicIds: number[];
  ok: boolean;
  error?: string;
}

export interface BulkHistoricRunResult {
  results: BulkHistoricResult[];
  sessionExpired: boolean;
  stoppedEarly?: boolean;
}

export interface BulkHistoricStatus {
  searchId: string;
  name: string;
  historics: Historic[];
  error?: string;
}

export interface BulkHistoricStatusRunResult {
  statuses: BulkHistoricStatus[];
  sessionExpired: boolean;
}
