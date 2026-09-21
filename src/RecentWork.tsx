import { useMemo } from "react";
import { Box, Stack } from "@mantine/core";
import { usePrismStateValue } from "@zephytiju/prism-react";
import { FileRow } from "./FileRow.js";
import type { RecentFileEntry, RecentFilesProjection } from "./FileRow.js";
import { EmptyState } from "./EmptyState.js";
import { SectionHeader } from "./SectionHeader.js";
import { stringsForLocale } from "./locales/index.js";
import type { RecentWorkLocale } from "./locales/index.js";

export interface RecentWorkProps {
  /** Section header title (defaults to the locale's `sectionTitle`). */
  readonly sectionTitle?: string;
  /** Continue-where-you-left-off meta on the header's right (defaults to the locale's `sectionMeta`). */
  readonly sectionMeta?: string;
  /** Row-grid column count (default 2 — the design's default 2-column row grid). */
  readonly columns?: number;
  /** Recency window in hours: entries older than now − N hours are excluded (default no window). */
  readonly recencyWindowHours?: number;
  /** Supplies the full row descriptor line (defaults to kind • status-or-editedAgo • detail). */
  readonly descriptor?: (entry: RecentFileEntry) => string;
  /** Renders the + insert affordance on every row (insert contexts only; default off). */
  readonly insertAffordance?: boolean;
  /** Label for the insert affordance (defaults to the locale's `insert`). */
  readonly insertLabel?: string;
  /** UI locale for the component-fixed strings (default "en"). */
  readonly locale?: RecentWorkLocale;
}

/**
 * Platform Prism recent-work micro-UI (component id "recent-work") — the
 * VAULT root-level continuation strip: the "RECENT WORK / CONTINUE WHERE YOU
 * LEFT OFF" header followed by per-prototype file-row members (kind icon,
 * name, descriptor, live sync dot) rendered 0..N at app runtime from recent
 * IFileEntry records (decision D3). The section title is part of this
 * component — Prism has no composed title node, so titles render from
 * component configuration keys.
 *
 * Rows order by updatedAt (most recent first) and can be bounded by a
 * recency-window configuration; the live dot on each row reflects that
 * entry's workspace sync state. Opening a row publishes the navigation/open
 * intent on "recent-work.opened-file" — consumed by the shell and the File
 * Viewer's path slot (D6/D8). The component is a read-only consumer of the
 * host-seeded "recent-work.file-entries" channel and makes NO Lattice calls;
 * rendering recent files is a routine read and is NOT audit-worthy.
 *
 * No palette is hardcoded: every color resolves to semantic theme tokens
 * (ok / accent / card / border / muted / text …) supplied by the host's
 * MantineProvider.
 */
export function RecentWork({
  sectionTitle,
  sectionMeta,
  columns = 2,
  recencyWindowHours,
  descriptor,
  insertAffordance = false,
  insertLabel,
  locale = "en",
}: RecentWorkProps) {
  // Every component-fixed UI string comes from the bundled locale JSONs;
  // configuration-provided strings (an explicit sectionTitle override, …)
  // stay composition-authored.
  const strings = stringsForLocale(locale);
  const resolvedSectionTitle = sectionTitle ?? strings.sectionTitle;
  const resolvedSectionMeta = sectionMeta ?? strings.sectionMeta;
  const projection = usePrismStateValue<RecentFilesProjection | null>("recent-work.file-entries");

  // App-runtime member rendering (D3): sort by updatedAt descending (most
  // recent first — the design's recency ordering), then apply the optional
  // recency window. Malformed timestamps sink to the end and fall outside
  // any window.
  const entries = useMemo<readonly RecentFileEntry[]>(() => {
    const listed = [...(projection?.entries ?? [])];
    listed.sort((a, b) => {
      const at = Date.parse(a.updatedAt);
      const bt = Date.parse(b.updatedAt);
      const aTime = Number.isNaN(at) ? Number.NEGATIVE_INFINITY : at;
      const bTime = Number.isNaN(bt) ? Number.NEGATIVE_INFINITY : bt;
      if (bTime !== aTime) {
        return bTime - aTime;
      }
      return a.name.localeCompare(b.name);
    });
    if (recencyWindowHours === undefined) {
      return listed;
    }
    const cutoff = Date.now() - recencyWindowHours * 3_600_000;
    return listed.filter((entry) => {
      const time = Date.parse(entry.updatedAt);
      return !Number.isNaN(time) && time >= cutoff;
    });
  }, [projection, recencyWindowHours]);

  return (
    <Stack gap={10} miw={0} data-testid="recent-work-section">
      <SectionHeader title={resolvedSectionTitle} meta={resolvedSectionMeta} />

      {entries.length === 0 ? (
        <EmptyState title={strings.emptyTitle} hint={strings.emptyHint} />
      ) : (
        <Box
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.max(1, columns)}, minmax(0, 1fr))`,
            gap: 12,
          }}
          data-testid="recent-work-grid"
        >
          {entries.map((entry) => (
            <FileRow
              key={entry.id}
              entry={entry}
              strings={strings}
              descriptor={descriptor}
              insertAffordance={insertAffordance}
              insertLabel={insertLabel}
            />
          ))}
        </Box>
      )}
    </Stack>
  );
}
