import {
  AUTHORIZE_AND_START_HISTORIC,
  DELETE_HISTORIC,
  LAUNCH_HISTORIC,
  RESUME_HISTORIC,
  STOP_HISTORIC,
} from "./mutations";
import type { HistoricAvailableAction } from "./types";

// Shared between the single-search Historic Ingestion tab and the bulk
// historics wizard so both agree on what counts as "still working."
export const TRANSIENT_STATUSES = new Set([
  "CREATED",
  "INITIALIZING",
  "INITIALIZED",
  "VALIDATING",
  "VALIDATED",
  "COMPILING",
  "COMPILED",
  "PREPARED",
  "PREPARING",
  "PREVIEWING",
  "LAUNCHING",
  "STARTING",
  "STOPPING",
  "RESUMING",
  "COMPLETING",
]);

export const ACTION_LABEL: Record<HistoricAvailableAction, string> = {
  LAUNCH: "Launch ingestion",
  AUTHORIZE_AND_START: "Authorize & start ingestion",
  RESUME: "Resume",
  STOP: "Stop",
  DELETE: "Delete",
  EXPORT: "Export",
};

export const DESTRUCTIVE_ACTIONS = new Set<HistoricAvailableAction>(["STOP", "DELETE"]);

export const ACTION_MUTATION: Record<Exclude<HistoricAvailableAction, "EXPORT">, string> = {
  LAUNCH: LAUNCH_HISTORIC,
  AUTHORIZE_AND_START: AUTHORIZE_AND_START_HISTORIC,
  RESUME: RESUME_HISTORIC,
  STOP: STOP_HISTORIC,
  DELETE: DELETE_HISTORIC,
};
