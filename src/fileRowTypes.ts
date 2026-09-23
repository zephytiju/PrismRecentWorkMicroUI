import type { FileEntrySummary } from "@zephytiju/lattice-common-interfaces";
import type { RecentWorkStrings } from "./locales/index.js";

/**
 * Workspace sync state of a recent file — drives the row's live dot:
 * "live" renders the bright ok token (the prototype's mint dot), "syncing"
 * the warn token, "synced" the dimmed ok token.
 */
export type FileSyncState = "live" | "syncing" | "synced";

/**
 * One recent IFileEntry record: the bounded Lattice file-entry summary
 * (id, name, kind, sizeBytes) plus exactly the recency data the Recent Work
 * design specifies — the updatedAt instant the section orders and relativizes
 * ("EDITED 4M AGO"), the workspace sync state driving the live dot, and the
 * two optional descriptor metadata parts ("LATTICE", "8 BLOCKS").
 */
export interface RecentFileEntry extends FileEntrySummary {
  /** ISO-8601 instant of the last edit — rows order by this, descending. */
  readonly updatedAt: string;
  /** Workspace sync state driving the row's live dot (default "live"). */
  readonly sync?: FileSyncState;
  /** Leading metadata status for the descriptor line (e.g. "LATTICE"); replaces the edited-ago part when present. */
  readonly status?: string;
  /** Trailing metadata detail for the descriptor line (e.g. "8 BLOCKS"). */
  readonly detail?: string;
}

/** The recent-file projection the component consumes: entries ordered by recency by their publisher. */
export interface RecentFilesProjection {
  readonly entries: readonly RecentFileEntry[];
}

/**
 * Payload published on "recent-work.opened-file" when a row is opened — a
 * bounded file reference pinned to the IFileEntry interface. This is the
 * navigation/open INTENT (decision D8): the shell and the File Viewer's path
 * slot receive the identifier and interpret it in their own way (D6);
 * receivers fetch their own domain data (D4). Opening a recent file is NOT
 * audit-worthy.
 */
export type OpenedFile = {
  readonly id: string;
  readonly name: string;
  readonly kind: string;
  readonly sync: FileSyncState;
  readonly ontologyInterface: "IFileEntry";
};

export interface FileRowProps {
  /** The recent file entry the row renders. */
  readonly entry: RecentFileEntry;
  /** Locale-resolved string table (supplied by RecentWork or the host). */
  readonly strings: RecentWorkStrings;
  /** Supplies the full descriptor line (defaults to kind • status-or-editedAgo • detail). */
  readonly descriptor?: (entry: RecentFileEntry) => string;
  /** Renders the + insert affordance (insert contexts only; default off). */
  readonly insertAffordance?: boolean;
  /** Label for the insert affordance (defaults to the locale's `insert`). */
  readonly insertLabel?: string;
}
