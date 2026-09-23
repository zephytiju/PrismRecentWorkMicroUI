import { useCallback } from "react";
import { Stack, Text, UnstyledButton } from "@mantine/core";
import { emitPrismEvent, usePrismStateSetter, usePrismStateValue } from "@zephytiju/prism-react";
import { visualForKind } from "./fileRowIcons.js";
import { defaultDescriptor, syncLabelKeyFor, syncTokenFor } from "./fileRowFormat.js";
import type { FileRowProps, FileSyncState, OpenedFile, RecentFileEntry } from "./fileRowTypes.js";
// The row's data contract stays re-exported from this module so the package's
// public surface (src/index.ts) is unchanged by the modularization.
export type {
  FileRowProps,
  FileSyncState,
  RecentFileEntry,
  RecentFilesProjection,
  OpenedFile,
} from "./fileRowTypes.js";

const MONO = "var(--mantine-font-family-monospace)";
const TEXT = "var(--mantine-color-text-filled)";
const MUTED = "var(--mantine-color-muted-filled)";
const CARD_BG = "var(--mantine-color-card-filled)";
const BORDER = "var(--mantine-color-border-filled)";
const INPUT_BG = "var(--mantine-color-input-filled)";
const ACCENT = "var(--mantine-color-accent-filled)";

/**
 * Per-prototype VAULT file row (the File Row sub-library axiom): kind icon,
 * file name, descriptor line, live/sync dot — the row itself is the click
 * target, and a + insert affordance appears in insert contexts only.
 *
 * The row OWNS the "recent-work.opened-file" channel binding: opening the row
 * (click or keyboard activation — it is a real button) publishes the
 * navigation/open intent, a bounded IFileEntry reference consumed by the shell
 * and the File Viewer's path slot (D6/D8). The opened highlight derives from
 * that same channel value, so every row bound to the channel (across hosts)
 * reflects the currently opened file consistently. The optional + affordance
 * emits the ephemeral "recent-work.insert-file" event instead. No Lattice
 * calls; routine reads are NOT audit-worthy.
 *
 * No palette is hardcoded: every color resolves to semantic theme tokens
 * (ok / warn / accent / card / border / muted / text / input …) supplied by
 * the host's MantineProvider.
 */
export function FileRow({
  entry,
  strings,
  descriptor,
  insertAffordance = false,
  insertLabel,
}: FileRowProps) {
  const publishOpenedFile = usePrismStateSetter<OpenedFile>("recent-work.opened-file");
  const openedFile = usePrismStateValue<OpenedFile>("recent-work.opened-file");
  const opened = openedFile?.id === entry.id;
  const resolvedDescriptor =
    descriptor ?? ((item: RecentFileEntry): string => defaultDescriptor(item, strings));

  const open = useCallback((): void => {
    publishOpenedFile({
      id: entry.id,
      name: entry.name,
      kind: entry.kind,
      sync: entry.sync ?? "live",
      ontologyInterface: "IFileEntry",
    });
  }, [entry, publishOpenedFile]);

  const visual = visualForKind(entry.kind);
  const Icon = visual.Icon;
  const sync: FileSyncState = entry.sync ?? "live";
  const syncToken = syncTokenFor(sync);

  return (
    <UnstyledButton
      onClick={() => {
        open();
      }}
      title={strings.openFile}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        height: 62,
        padding: "0 14px 0 12px",
        background: CARD_BG,
        border: `1px solid ${opened ? ACCENT : BORDER}`,
        borderRadius: 6,
        cursor: "pointer",
        textAlign: "left",
        ...(opened ? { boxShadow: "0 0 0 1px var(--mantine-color-accent-outline)" } : {}),
      }}
      data-testid={`recent-work-row-${entry.id}`}
    >
      <span
        style={{
          width: 30,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color: `var(--mantine-color-${visual.token}-filled)`,
        }}
        data-testid={`recent-work-icon-${entry.id}`}
      >
        <Icon />
      </span>
      <Stack gap={2} miw={0} style={{ flex: 1, alignItems: "flex-start" }}>
        <Text
          fz={12}
          fw={500}
          truncate="end"
          style={{ color: TEXT, letterSpacing: "0.01em", maxWidth: "100%" }}
          data-testid={`recent-work-name-${entry.id}`}
        >
          {entry.name}
        </Text>
        <Text
          ff={MONO}
          fz={9}
          truncate="end"
          style={{ color: MUTED, letterSpacing: "0.02em", maxWidth: "100%" }}
          data-testid={`recent-work-meta-${entry.id}`}
        >
          {resolvedDescriptor(entry)}
        </Text>
      </Stack>
      {insertAffordance ? (
        <UnstyledButton
          type="button"
          ff={MONO}
          fz={11}
          fw={500}
          c="accent"
          style={{
            flexShrink: 0,
            height: 22,
            padding: "0 10px",
            borderRadius: 11,
            background: INPUT_BG,
            border: `1px solid ${BORDER}`,
          }}
          data-testid={`recent-work-insert-${entry.id}`}
          onClick={(event) => {
            event.stopPropagation();
            emitPrismEvent("recent-work.insert-file", {
              id: entry.id,
              name: entry.name,
              kind: entry.kind,
              sync,
              ontologyInterface: "IFileEntry",
            } satisfies OpenedFile);
          }}
        >
          {insertLabel ?? strings.insert}
        </UnstyledButton>
      ) : null}
      <span
        aria-label={strings[syncLabelKeyFor(sync)]}
        role="img"
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: `var(--mantine-color-${syncToken}-filled)`,
          opacity: sync === "synced" ? 0.45 : 1,
          flexShrink: 0,
        }}
        data-testid={`recent-work-dot-${entry.id}`}
      />
    </UnstyledButton>
  );
}
