import { useCallback } from "react";
import type { ReactElement } from "react";
import { Stack, Text, UnstyledButton } from "@mantine/core";
import { emitPrismEvent, usePrismStateSetter, usePrismStateValue } from "@zephytiju/prism-react";
import type { FileEntrySummary } from "@zephytiju/lattice-common-interfaces";
import { formatMessage } from "./locales/index.js";
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

const MONO = "var(--mantine-font-family-monospace)";
const TEXT = "var(--mantine-color-text-filled)";
const MUTED = "var(--mantine-color-muted-filled)";
const CARD_BG = "var(--mantine-color-card-filled)";
const BORDER = "var(--mantine-color-border-filled)";
const INPUT_BG = "var(--mantine-color-input-filled)";
const ACCENT = "var(--mantine-color-accent-filled)";

// ---------------------------------------------------------------------------
// Per-kind icons — the exact drawings of the VAULT v9 prototype
// (vault-standalone.html): folder, dossier doc, workflow board, audit board,
// world view. Kind families map onto the prototype's distinct drawings; the
// token (not a hardcoded color) supplies the per-kind hue.
// ---------------------------------------------------------------------------

const FolderIcon = (): ReactElement => (
  <svg width={30} height={26} viewBox="0 0 48 42" fill="none" aria-hidden="true">
    <path d="M3 6h14l4 5h24v25H3z" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" />
    <path d="M3 16h42" stroke="currentColor" strokeWidth={2} />
  </svg>
);

const DocIcon = (): ReactElement => (
  <svg width={26} height={30} viewBox="0 0 28 32" fill="none" aria-hidden="true">
    <path d="M4 2h13l7 7v21H4z" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" />
    <path d="M17 2v7h7M8 14h10M8 19h10M8 24h6" stroke="currentColor" strokeWidth={1.6} />
  </svg>
);

const WorkflowBoardIcon = (): ReactElement => (
  <svg width={28} height={28} viewBox="0 0 30 30" fill="none" aria-hidden="true">
    <rect x={2} y={2} width={9} height={9} rx={1.5} stroke="currentColor" strokeWidth={2} />
    <rect x={19} y={11} width={9} height={9} rx={1.5} stroke="currentColor" strokeWidth={2} />
    <rect x={2} y={19} width={9} height={9} rx={1.5} stroke="currentColor" strokeWidth={2} />
    <path
      d="M11 6.5h5.5A2.5 2.5 0 0 1 19 9v2M19 20.5h-5.5A2.5 2.5 0 0 1 11 18v-5"
      stroke="currentColor"
      strokeWidth={2}
    />
  </svg>
);

const AuditBoardIcon = (): ReactElement => (
  <svg width={28} height={28} viewBox="0 0 30 30" fill="none" aria-hidden="true">
    <rect x={2} y={2} width={9} height={9} rx={1.5} stroke="currentColor" strokeWidth={2} />
    <rect x={19} y={2} width={9} height={9} rx={1.5} stroke="currentColor" strokeWidth={2} />
    <rect x={10} y={19} width={9} height={9} rx={1.5} stroke="currentColor" strokeWidth={2} />
    <path
      d="M11 11v3a2 2 0 0 0 2 2h3M15 7h4M7 11v8"
      stroke="currentColor"
      strokeWidth={2}
    />
  </svg>
);

const WorldIcon = (): ReactElement => (
  <svg width={28} height={28} viewBox="0 0 30 30" fill="none" aria-hidden="true">
    <circle cx={15} cy={15} r={12} stroke="currentColor" strokeWidth={2} />
    <path d="M3 15h24M15 3c4 4 4 20 0 24M15 3c-4 4-4 20 0 24" stroke="currentColor" strokeWidth={1.6} />
  </svg>
);

type IconComponent = () => ReactElement;

interface KindVisual {
  readonly Icon: IconComponent;
  readonly token: string;
}

/**
 * Kind → distinct prototype drawing + semantic token. The prototype palette:
 * folder blue(accent), doc mint(ok), board amber(warn), world purple(signal).
 */
const KIND_VISUALS: Readonly<Record<string, KindVisual>> = {
  folder: { Icon: FolderIcon, token: "accent" },
  dossier: { Icon: DocIcon, token: "ok" },
  evidence: { Icon: DocIcon, token: "ok" },
  reference: { Icon: DocIcon, token: "ok" },
  board: { Icon: WorkflowBoardIcon, token: "warn" },
  "workflow-board": { Icon: WorkflowBoardIcon, token: "warn" },
  "audit-board": { Icon: AuditBoardIcon, token: "warn" },
  world: { Icon: WorldIcon, token: "signal" },
};

/** Unknown kinds render the generic doc drawing under the accent token. */
const FALLBACK_VISUAL: KindVisual = { Icon: DocIcon, token: "accent" };

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
function defaultDescriptor(entry: RecentFileEntry, strings: RecentWorkStrings): string {
  const middle =
    entry.status ?? formatMessage(strings.editedAgo, { ago: formatAgo(entry.updatedAt, strings) });
  return [kindLabelFor(entry.kind, strings), middle, entry.detail]
    .filter((part) => part !== undefined && part !== "")
    .join(" • ");
}

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

  const visual = KIND_VISUALS[entry.kind] ?? FALLBACK_VISUAL;
  const Icon = visual.Icon;
  const sync: FileSyncState = entry.sync ?? "live";
  const syncToken = SYNC_TOKENS[sync];

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
        aria-label={strings[SYNC_LABEL_KEYS[sync]]}
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
