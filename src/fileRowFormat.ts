import { formatMessage } from "./locales/index.js";
import type { RecentWorkStrings } from "./locales/index.js";
import type { FileSyncState, RecentFileEntry } from "./fileRowTypes.js";

/** Sync state → semantic token for the live dot. */
const SYNC_TOKENS: Readonly<Record<FileSyncState, string>> = {
  live: "ok",
  syncing: "warn",
  synced: "ok",
};

const SYNC_LABEL_KEYS: Readonly<Record<FileSyncState, keyof RecentWorkStrings>> = {
  live: "syncLive",
  syncing: "syncSyncing",
  synced: "syncSynced",
};

const KIND_LABEL_KEYS: Readonly<Record<string, keyof RecentWorkStrings>> = {
  folder: "kindFolder",
  dossier: "kindDossier",
  evidence: "kindEvidence",
  reference: "kindReference",
  board: "kindBoard",
  "workflow-board": "kindWorkflowBoard",
  "audit-board": "kindAuditBoard",
  world: "kindWorld",
};

/** Semantic token driving the live dot's color for a sync state. */
export function syncTokenFor(state: FileSyncState): string {
  return SYNC_TOKENS[state];
}

/** Locale string-table key labeling a sync state (the dot's aria-label). */
export function syncLabelKeyFor(state: FileSyncState): keyof RecentWorkStrings {
  return SYNC_LABEL_KEYS[state];
}

/** Locale label for an entry kind; unknown kinds fall back to the uppercased kind. */
function kindLabelFor(kind: string, strings: RecentWorkStrings): string {
  const key = KIND_LABEL_KEYS[kind];
  return key === undefined ? kind.toUpperCase() : strings[key];
}

/** Compact relative age ("4M" / "2H" / "3D") interpolated through the locale templates. */
function formatAgo(updatedAt: string, strings: RecentWorkStrings): string {
  const time = Date.parse(updatedAt);
  if (Number.isNaN(time)) {
    return "";
  }
  const minutes = Math.max(1, Math.floor((Date.now() - time) / 60_000));
  if (minutes < 60) {
    return formatMessage(strings.minutesAgo, { count: minutes });
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return formatMessage(strings.hoursAgo, { count: hours });
  }
  return formatMessage(strings.daysAgo, { count: Math.floor(hours / 24) });
}

/** Default descriptor line: KIND • STATUS-or-EDITED-ago • DETAIL. */
export function defaultDescriptor(entry: RecentFileEntry, strings: RecentWorkStrings): string {
  const middle =
    entry.status ?? formatMessage(strings.editedAgo, { ago: formatAgo(entry.updatedAt, strings) });
  return [kindLabelFor(entry.kind, strings), middle, entry.detail]
    .filter((part) => part !== undefined && part !== "")
    .join(" • ");
}
