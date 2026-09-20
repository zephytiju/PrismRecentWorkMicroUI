/**
 * Single-file demo host for the recent-work micro-UI (vite dev entry, see
 * index.html).
 *
 * Everything demo-related lives here:
 *  - the two host themes (GeoVision v9 dark + Lattice Light) mapping the SAME
 *    semantic token keys onto different palettes, proving the component ships
 *    no palette of its own;
 *  - every piece of demo test data (the six per-prototype recent file rows
 *    with mixed kinds and relative recency);
 *  - the demo page: TWO RecentWork instances side by side, each inside its
 *    own MantineProvider with a different theme, plus an EN | 中文 language
 *    switcher — one GLOBAL control that drives every instance, and a
 *    per-instance control proving locale is a per-instance prop. HOST A runs
 *    the component's default 2-column row grid; HOST B passes columns={3},
 *    the page composition the VAULT prototype uses, so the configuration is
 *    demonstrated side by side. The component makes NO Lattice calls, so the
 *    demo host seeds the recent-work.file-entries channel the way a shell
 *    with a live workspace would (writeChannel); the buttons reseed or clear
 *    the channel, and the channel monitors below show the shared consumed
 *    state plus the "recent-work.opened-file" publication (the open intent
 *    the shell and the File Viewer's path slot consume).
 */
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Box,
  Button,
  createTheme,
  Divider,
  Group,
  MantineProvider,
  SegmentedControl,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import type { MantineThemeOverride } from "@mantine/core";
import { usePrismStateValue, writeChannel } from "@zephytiju/prism-react";
import { RecentWork } from "./RecentWork.js";
import type { OpenedFile, RecentFileEntry, RecentFilesProjection } from "./FileRow.js";
import type { RecentWorkLocale } from "./locales/index.js";
import "@mantine/core/styles.css";

// ---------------------------------------------------------------------------
// Themes — the HOST side of the theme contract.
//
// The component uses only semantic color tokens (ok / accent / threat / warn /
// signal / card / card-dark / input / border / line / text / muted / deep /
// panel); each theme maps every token onto a concrete palette. Every shade of
// every token is the same design color so any Mantine shade index resolves to
// the exact hex.
// ---------------------------------------------------------------------------

type ColorShades = [string, string, string, string, string, string, string, string, string, string];

const shades = (hex: string): ColorShades => [
  hex,
  hex,
  hex,
  hex,
  hex,
  hex,
  hex,
  hex,
  hex,
  hex,
];

/** GeoVision v9 (dark) — the exact :root variables of the VAULT prototype. */
export const geovisionTheme = createTheme({
  colors: {
    // v9 :root neutrals
    deep: shades("#07100F"), // --bg
    panel: shades("#000000"), // --panel
    card: shades("#111F1C"), // --card
    "card-dark": shades("#0B1514"), // --cdark
    input: shades("#162823"), // --inp
    border: shades("#29463E"), // --border
    line: shades("#44685B"), // --grid2
    text: shades("#E8F2ED"), // --text
    muted: shades("#86A098"), // --muted
    // v9 :root signal palette, exposed under semantic tokens
    ok: shades("#6FEEB3"), // --mint
    accent: shades("#62B3FF"), // --blue
    threat: shades("#FF6B5F"), // --red
    warn: shades("#E8B84B"), // --amber
    signal: shades("#A88BFF"), // --purple
  },
  primaryColor: "ok",
  fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif",
  fontFamilyMonospace: "'IBM Plex Mono',ui-monospace,SFMono-Regular,monospace",
  defaultRadius: 4,
});

/**
 * Lattice Light (contrasting second host) — the SAME semantic token keys mapped
 * onto a light palette with system typography, proving a completely different
 * host can skin the component purely through MantineProvider.
 */
export const latticeLightTheme = createTheme({
  colors: {
    deep: shades("#EAF0EE"),
    panel: shades("#FFFFFF"),
    card: shades("#F2F6F4"),
    "card-dark": shades("#E7EEEB"),
    input: shades("#FBFDFC"),
    border: shades("#C3D2CC"),
    line: shades("#9DB4AB"),
    text: shades("#172925"),
    muted: shades("#5A6E67"),
    ok: shades("#0E7A52"),
    accent: shades("#1F6FE0"),
    threat: shades("#CE3F35"),
    warn: shades("#9A6E10"),
    signal: shades("#6E4FD8"),
  },
  primaryColor: "ok",
  fontFamily: "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif",
  fontFamilyMonospace: "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace",
  defaultRadius: 4,
});

// ---------------------------------------------------------------------------
// Demo test data — the six per-prototype recent rows (mixed file kinds, each
// with its distinct icon), with recency relative to seeding time.
// ---------------------------------------------------------------------------

const minutesAgo = (minutes: number): string =>
  new Date(Date.now() - minutes * 60_000).toISOString();

/** Deterministic sample recent-file rows mirroring the VAULT v9 prototype strip. */
export function sampleRecentFiles(): readonly RecentFileEntry[] {
  return [
    {
      id: "f-001",
      name: "Redwater Corridor Brief",
      kind: "dossier",
      sizeBytes: 482_133,
      updatedAt: minutesAgo(4),
      sync: "live",
      detail: "8 BLOCKS",
    },
    {
      id: "f-002",
      name: "WF-014 Corridor Watch",
      kind: "workflow-board",
      sizeBytes: 214_690,
      updatedAt: minutesAgo(12),
      sync: "synced",
      status: "LATTICE",
      detail: "7 BLOCKS",
    },
    {
      id: "f-003",
      name: "Redwater Watch View",
      kind: "world",
      sizeBytes: 1_204_318,
      updatedAt: minutesAgo(47),
      sync: "live",
      status: "SAVED STATE",
      detail: "LIVE",
    },
    {
      id: "f-004",
      name: "Terminal Evidence Pack",
      kind: "evidence",
      sizeBytes: 3_611_040,
      updatedAt: minutesAgo(125),
      sync: "live",
      detail: "19 BLOCKS",
    },
    {
      id: "f-005",
      name: "AC-0031 Audit Chain",
      kind: "audit-board",
      sizeBytes: 96_204,
      updatedAt: minutesAgo(185),
      sync: "synced",
      status: "APPEND-ONLY",
      detail: "12 ENTRIES",
    },
    {
      id: "f-006",
      name: "Convoy 07 Assessment",
      kind: "dossier",
      sizeBytes: 655_360,
      updatedAt: minutesAgo(305),
      sync: "live",
      detail: "12 BLOCKS",
    },
  ];
}

/** Seeds the recent-work channel the way a shell with a live workspace would. */
export function seedDemoChannels(): void {
  writeChannel<RecentFilesProjection | null>("recent-work.file-entries", {
    entries: sampleRecentFiles(),
  });
}

// ---------------------------------------------------------------------------
// Demo page — two themed RecentWork instances + shared-channel readouts.
// ---------------------------------------------------------------------------

const MONO = "var(--mantine-font-family-monospace)";

/** Segmented-control options shared by the global and per-instance switchers. */
const localeOptions = [
  { value: "en", label: "EN" },
  { value: "zh-CN", label: "中文" },
];

/** Shared-channel readout: BOTH instances render from the SAME global channel. */
function ChannelState() {
  const projection = usePrismStateValue<RecentFilesProjection | null>("recent-work.file-entries");
  return (
    <Stack gap={4} miw={0}>
      <Text size="sm" fw={600} c="var(--mantine-color-text-filled)">
        recent-work channel state (consumed by BOTH instances)
      </Text>
      <Text size="sm" c="var(--mantine-color-muted-filled)" data-testid="demo-entries">
        file-entries:{" "}
        {projection === null
          ? "null"
          : `${String(projection.entries.length)} entries (${projection.entries
              .map((entry) => entry.kind)
              .join(", ")})`}
      </Text>
    </Stack>
  );
}

/** Readout for the single channel the component PUBLISHES (the open intent). */
function OpenedFileMonitor() {
  const opened = usePrismStateValue<OpenedFile>("recent-work.opened-file");
  return (
    <Stack gap={4} miw={0}>
      <Text size="sm" fw={600} c="var(--mantine-color-text-filled)">
        recent-work.opened-file — open intent for the shell / File Viewer path slot
      </Text>
      <Text size="sm" c="var(--mantine-color-muted-filled)" data-testid="demo-opened-file">
        {opened === null ? "null" : JSON.stringify(opened)}
      </Text>
    </Stack>
  );
}

/**
 * One recent-work instance inside its OWN scoped MantineProvider.
 *
 * Mantine emits theme CSS variables as `cssVariablesSelector { … }` style tags
 * (default selector ":root", i.e. global), so two nested providers would fight:
 * the last-mounted theme would win document-wide. Each instance provider is
 * therefore scoped to a wrapper class (cssVariablesSelector) and its
 * forceColorScheme attribute is written to that same wrapper (getRootElement),
 * keeping both palettes live side by side.
 */
interface ThemedInstanceProps {
  readonly theme: MantineThemeOverride;
  readonly colorScheme: "dark" | "light";
  readonly scopeClass: string;
  readonly label: string;
  readonly panelTestid: string;
  readonly locale: RecentWorkLocale;
  readonly onLocaleChange: (locale: RecentWorkLocale) => void;
  readonly localeTestid: string;
  readonly columns: number;
}

function ThemedRecentWorkInstance({
  theme,
  colorScheme,
  scopeClass,
  label,
  panelTestid,
  locale,
  onLocaleChange,
  localeTestid,
  columns,
}: ThemedInstanceProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  return (
    <MantineProvider
      theme={theme}
      forceColorScheme={colorScheme}
      cssVariablesSelector={`.${scopeClass}`}
      getRootElement={() => hostRef.current ?? document.documentElement}
    >
      <Stack
        gap={8}
        miw={0}
        className={scopeClass}
        data-mantine-color-scheme={colorScheme}
        ref={hostRef}
      >
        <Group gap={10} wrap="nowrap" align="center">
          <Text ff={MONO} fz={9} fw={600} c="var(--mantine-color-signal-filled)">
            {label}
          </Text>
          {/* Per-instance language control — locale is a per-instance prop, so
              the two themed hosts may render DIFFERING locales at once. */}
          <SegmentedControl
            size="xs"
            data-testid={localeTestid}
            value={locale}
            onChange={(value) => {
              onLocaleChange(value as RecentWorkLocale);
            }}
            data={localeOptions}
          />
        </Group>
        <Box
          p={12}
          style={{
            width: 700,
            background: "var(--mantine-color-panel-filled)",
            border: "1px solid var(--mantine-color-border-filled)",
          }}
          data-testid={panelTestid}
        >
          <RecentWork locale={locale} columns={columns} />
        </Box>
      </Stack>
    </MantineProvider>
  );
}

function DemoPage() {
  // Seed the recent-work channel once, the way a shell with a live workspace
  // would — the component itself makes no Lattice calls.
  useEffect(() => {
    seedDemoChannels();
  }, []);

  // The GLOBAL switch drives both instances at once; each instance also has
  // its own control, so the two themed hosts can render differing locales.
  const [globalLocale, setGlobalLocale] = useState<RecentWorkLocale>("en");
  const [leftOverride, setLeftOverride] = useState<RecentWorkLocale | null>(null);
  const [rightOverride, setRightOverride] = useState<RecentWorkLocale | null>(null);
  const leftLocale = leftOverride ?? globalLocale;
  const rightLocale = rightOverride ?? globalLocale;
  const applyGlobalLocale = (locale: RecentWorkLocale): void => {
    setGlobalLocale(locale);
    setLeftOverride(null);
    setRightOverride(null);
  };

  return (
    <MantineProvider theme={geovisionTheme} forceColorScheme="dark">
      <Box mih="100vh" p={24} style={{ background: "var(--mantine-color-deep-filled)" }} data-testid="demo-page">
        <Stack gap={16} maw={1480}>
          <Title order={3} c="var(--mantine-color-text-filled)">
            Prism recent-work demo — theme swap × locale swap × shared channels
          </Title>
          <Text size="sm" c="var(--mantine-color-muted-filled)" data-testid="demo-caption">
            Two hosts, two palettes, one component: the same semantic tokens mapped onto GeoVision
            v9 (left, dark — the component&apos;s default 2-column row grid) and Lattice Light
            (right, light — configured with the VAULT page&apos;s 3-column composition). Recent
            mixed-type files are seeded onto the GLOBAL recent-work.file-entries channel, so BOTH
            instances — and the shared readouts below — always render the same rows, ordered by
            updatedAt with distinct per-kind icons and live sync dots. The LANGUAGE switch drives
            both instances; each host also carries its own EN/中文 control, so the two instances can
            render differing locales at once. Each file row OWNS the
            &quot;recent-work.opened-file&quot; publication: open a row in EITHER instance and the
            monitor below shows the published open intent (a bounded IFileEntry reference for the
            shell and the File Viewer&apos;s path slot) — and because the opened highlight derives
            from that same shared channel, the matching row highlights in BOTH hosts.
          </Text>
          <Stack gap={20} data-testid="demo-locale-stage">
            <Group gap={10} wrap="nowrap" align="center" data-testid="demo-locale-bar">
              <Text ff={MONO} fz={9} fw={600} c="var(--mantine-color-muted-filled)">
                LANGUAGE
              </Text>
              <SegmentedControl
                data-testid="demo-locale-switcher"
                value={globalLocale}
                onChange={(value) => {
                  applyGlobalLocale(value as RecentWorkLocale);
                }}
                data={localeOptions}
              />
            </Group>
            <Group align="flex-start" gap={20} wrap="wrap" data-testid="demo-instances">
              <ThemedRecentWorkInstance
                theme={geovisionTheme}
                colorScheme="dark"
                scopeClass="demo-scope-geovision"
                label="HOST A · GEOVISION V9 · 2 COLUMNS (DEFAULT)"
                panelTestid="demo-recent-panel-a"
                locale={leftLocale}
                onLocaleChange={setLeftOverride}
                localeTestid="demo-instance-locale-a"
                columns={2}
              />
              <ThemedRecentWorkInstance
                theme={latticeLightTheme}
                colorScheme="light"
                scopeClass="demo-scope-light"
                label="HOST B · LATTICE LIGHT · 3 COLUMNS (PAGE COMPOSITION)"
                panelTestid="demo-recent-panel-b"
                locale={rightLocale}
                onLocaleChange={setRightOverride}
                localeTestid="demo-instance-locale-b"
                columns={3}
              />
            </Group>
          </Stack>
          <Divider
            color="var(--mantine-color-border-filled)"
            label={
              <Text ff={MONO} fz={9} c="var(--mantine-color-muted-filled)">
                HOST DEMO AFFORDANCES
              </Text>
            }
          />
          <Group gap="xs">
            <Button
              variant="outline"
              c="ok"
              onClick={() => {
                seedDemoChannels();
              }}
            >
              Reseed recent files
            </Button>
            <Button
              variant="outline"
              c="threat"
              onClick={() => {
                writeChannel<RecentFilesProjection | null>("recent-work.file-entries", null);
              }}
            >
              Clear (empty state)
            </Button>
          </Group>
          <ChannelState />
          <OpenedFileMonitor />
          <Text fz={9} ff={MONO} c="var(--mantine-color-muted-filled)" data-testid="demo-seed-note">
            seeded projection: 6 recent IFileEntry records — dossier · workflow-board · world ·
            evidence · audit-board · dossier
          </Text>
        </Stack>
      </Box>
    </MantineProvider>
  );
}

createRoot(document.getElementById("root")!).render(<DemoPage />);
