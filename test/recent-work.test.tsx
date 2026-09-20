import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import {
  readChannel,
  resetChannelsForTests,
  subscribeToEvent,
  writeChannel,
} from "@zephytiju/prism-react";
import { RecentWork } from "../src/index.js";
import type { RecentWorkProps, OpenedFile, RecentFileEntry, RecentFilesProjection } from "../src/index.js";
import { en, locales, zhCN } from "../src/index.js";
import type { RecentWorkStrings } from "../src/index.js";

function publishEntries(entries: readonly RecentFileEntry[] | null): void {
  act(() => {
    writeChannel<RecentFilesProjection | null>(
      "recent-work.file-entries",
      entries === null ? null : { entries },
    );
  });
}

(globalThis as { __PRISM_REACT_TEST__?: boolean }).__PRISM_REACT_TEST__ = true;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const isoMinutesAgo = (minutes: number): string =>
  new Date(Date.now() - minutes * 60_000).toISOString();

const entries: readonly RecentFileEntry[] = [
  {
    id: "f-001",
    name: "Redwater Corridor Brief",
    kind: "dossier",
    sizeBytes: 482_133,
    updatedAt: isoMinutesAgo(4),
    sync: "live",
    detail: "8 BLOCKS",
  },
  {
    id: "f-002",
    name: "WF-014 Corridor Watch",
    kind: "workflow-board",
    sizeBytes: 214_690,
    updatedAt: isoMinutesAgo(12),
    sync: "synced",
    status: "LATTICE",
    detail: "7 BLOCKS",
  },
  {
    id: "f-003",
    name: "Redwater Watch View",
    kind: "world",
    sizeBytes: 1_204_318,
    updatedAt: isoMinutesAgo(47),
    sync: "live",
    status: "SAVED STATE",
    detail: "LIVE",
  },
  {
    id: "f-004",
    name: "Terminal Evidence Pack",
    kind: "evidence",
    sizeBytes: 3_611_040,
    updatedAt: isoMinutesAgo(125),
    sync: "live",
    detail: "19 BLOCKS",
  },
  {
    id: "f-005",
    name: "AC-0031 Audit Chain",
    kind: "audit-board",
    sizeBytes: 96_204,
    updatedAt: isoMinutesAgo(185),
    sync: "synced",
    status: "APPEND-ONLY",
    detail: "12 ENTRIES",
  },
  {
    id: "f-006",
    name: "Convoy 07 Assessment",
    kind: "dossier",
    sizeBytes: 655_360,
    updatedAt: isoMinutesAgo(305),
    sync: "live",
    detail: "12 BLOCKS",
  },
];

const listProps: RecentWorkProps = {};

beforeEach(() => {
  resetChannelsForTests();
});

afterEach(() => {
  cleanup();
});

function renderSection(props: RecentWorkProps = listProps): void {
  render(
    <MantineProvider>
      <RecentWork {...props} />
    </MantineProvider>,
  );
}

describe("RecentWork render states", () => {
  it("renders the guided empty state when the channel carries no projection", () => {
    renderSection();
    expect(screen.getByTestId("recent-work-empty")).toBeDefined();
    expect(screen.getByTestId("recent-work-empty-title").textContent).toBe("No recent work yet");
    expect(screen.getByTestId("recent-work-empty-hint").textContent).toContain(
      "Files you open and edit will appear here",
    );
    expect(screen.queryByTestId("recent-work-grid")).toBeNull();
    // The section header is part of the component (Prism has no composed
    // title node) and renders even when empty.
    expect(screen.getByTestId("recent-work-section-title").textContent).toBe("RECENT WORK");
    expect(screen.getByTestId("recent-work-section-meta").textContent).toBe(
      "CONTINUE WHERE YOU LEFT OFF",
    );
  });

  it("renders the empty state for an empty projection and again after clearing", () => {
    renderSection();
    publishEntries([]);
    expect(screen.getByTestId("recent-work-empty")).toBeDefined();
    publishEntries(null);
    expect(screen.getByTestId("recent-work-empty")).toBeDefined();
  });

  it("renders one file-row member per entry, ordered by updatedAt descending", () => {
    renderSection();
    // Seed deliberately out of recency order: f-006 oldest first.
    publishEntries([...entries].reverse());
    const rows = screen.getAllByTestId(/^recent-work-row-/);
    expect(rows.map((row) => row.getAttribute("data-testid"))).toEqual(
      entries.map((entry) => `recent-work-row-${entry.id}`),
    );
  });

  it("renders the default 2-column row grid and honors the columns config", () => {
    renderSection();
    publishEntries(entries);
    expect(screen.getByTestId("recent-work-grid").getAttribute("style")).toContain("repeat(2,");
    cleanup();
    resetChannelsForTests();

    renderSection({ columns: 3 });
    publishEntries(entries);
    expect(screen.getByTestId("recent-work-grid").getAttribute("style")).toContain("repeat(3,");
  });

  it("excludes entries older than the configured recency window", () => {
    renderSection({ recencyWindowHours: 1 });
    publishEntries(entries);
    // 4m, 12m and 47m survive; 2h05, 3h05 and 5h05 drop out.
    expect(screen.getByTestId("recent-work-row-f-001")).toBeDefined();
    expect(screen.getByTestId("recent-work-row-f-002")).toBeDefined();
    expect(screen.getByTestId("recent-work-row-f-003")).toBeDefined();
    expect(screen.queryByTestId("recent-work-row-f-004")).toBeNull();
    expect(screen.queryByTestId("recent-work-row-f-005")).toBeNull();
    expect(screen.queryByTestId("recent-work-row-f-006")).toBeNull();
  });

  it("lets explicit sectionTitle/sectionMeta props override the locale strings", () => {
    renderSection({ sectionTitle: "MY SECTION", sectionMeta: "custom meta" });
    publishEntries(entries);
    expect(screen.getByTestId("recent-work-section-title").textContent).toBe("MY SECTION");
    expect(screen.getByTestId("recent-work-section-meta").textContent).toBe("custom meta");
  });
});

describe("RecentWork file rows", () => {
  it("renders per-kind icons under the prototype's semantic tokens", () => {
    renderSection();
    publishEntries(entries);

    // Prototype palette: doc mint(ok), board amber(warn), world purple(signal).
    expect(screen.getByTestId("recent-work-icon-f-001").getAttribute("style")).toContain(
      "var(--mantine-color-ok-filled)",
    );
    expect(screen.getByTestId("recent-work-icon-f-002").getAttribute("style")).toContain(
      "var(--mantine-color-warn-filled)",
    );
    expect(screen.getByTestId("recent-work-icon-f-003").getAttribute("style")).toContain(
      "var(--mantine-color-signal-filled)",
    );
    expect(screen.getByTestId("recent-work-icon-f-005").getAttribute("style")).toContain(
      "var(--mantine-color-warn-filled)",
    );
    // The workflow and audit board drawings are distinct siblings under warn.
    expect(screen.getByTestId("recent-work-icon-f-002").querySelector("svg")?.innerHTML).not.toBe(
      screen.getByTestId("recent-work-icon-f-005").querySelector("svg")?.innerHTML,
    );
  });

  it("falls back to the generic doc drawing under the accent token for unknown kinds", () => {
    renderSection();
    publishEntries([
      { id: "f-x", name: "Mystery File", kind: "codex", sizeBytes: 1, updatedAt: isoMinutesAgo(2) },
    ]);
    expect(screen.getByTestId("recent-work-icon-f-x").getAttribute("style")).toContain(
      "var(--mantine-color-accent-filled)",
    );
    // Unknown kinds label through the uppercased kind.
    expect(screen.getByTestId("recent-work-meta-f-x").textContent).toContain("CODEX");
  });

  it("composes the descriptor from kind • status-or-editedAgo • detail", () => {
    renderSection();
    publishEntries(entries);
    // status replaces the edited-ago middle part when present.
    expect(screen.getByTestId("recent-work-meta-f-001").textContent).toBe(
      "DOSSIER FILE • EDITED 4M AGO • 8 BLOCKS",
    );
    expect(screen.getByTestId("recent-work-meta-f-002").textContent).toBe(
      "WORKFLOW BOARD • LATTICE • 7 BLOCKS",
    );
    expect(screen.getByTestId("recent-work-meta-f-003").textContent).toBe(
      "GEOVISION FILE • SAVED STATE • LIVE",
    );
    // 125 minutes relativizes to hours.
    expect(screen.getByTestId("recent-work-meta-f-004").textContent).toBe(
      "EVIDENCE FILE • EDITED 2H AGO • 19 BLOCKS",
    );
  });

  it("reflects the workspace sync state on the live dot", () => {
    renderSection();
    publishEntries(entries);
    expect(screen.getByTestId("recent-work-dot-f-001").getAttribute("style")).toContain(
      "var(--mantine-color-ok-filled)",
    );
    // synced dims to the same ok token; syncing switches to warn.
    expect(screen.getByTestId("recent-work-dot-f-002").getAttribute("style")).toContain(
      "opacity: 0.45",
    );
    expect(screen.getByTestId("recent-work-dot-f-003").getAttribute("style")).toContain(
      "opacity: 1",
    );
    cleanup();
    resetChannelsForTests();
    renderSection();
    publishEntries([
      {
        id: "f-sync",
        name: "Syncing File",
        kind: "dossier",
        sizeBytes: 1,
        updatedAt: isoMinutesAgo(1),
        sync: "syncing",
      },
    ]);
    expect(screen.getByTestId("recent-work-dot-f-sync").getAttribute("style")).toContain(
      "var(--mantine-color-warn-filled)",
    );
  });

  it("lets the descriptor callback replace the composed line (descriptor fields config)", () => {
    renderSection({
      descriptor: (entry) => `${entry.kind.toUpperCase()} · ${entry.name.length} CH`,
    });
    publishEntries(entries);
    expect(screen.getByTestId("recent-work-meta-f-001").textContent).toBe("DOSSIER · 23 CH");
  });

  it("hides the + insert affordance by default and renders it when configured", () => {
    renderSection();
    publishEntries(entries);
    expect(screen.queryByTestId("recent-work-insert-f-001")).toBeNull();
    cleanup();
    resetChannelsForTests();

    renderSection({ insertAffordance: true });
    publishEntries(entries);
    expect(screen.getByTestId("recent-work-insert-f-001").textContent).toBe("+");
  });
});

describe("RecentWork i18n", () => {
  it("renders the default en strings (no locale prop)", () => {
    renderSection();
    expect(screen.getByTestId("recent-work-section-title").textContent).toBe("RECENT WORK");
    expect(screen.getByTestId("recent-work-section-meta").textContent).toBe(
      "CONTINUE WHERE YOU LEFT OFF",
    );
    publishEntries(entries);
    expect(screen.getByTestId("recent-work-meta-f-001").textContent).toBe(
      "DOSSIER FILE • EDITED 4M AGO • 8 BLOCKS",
    );
  });

  it("renders Chinese strings with locale=\"zh-CN\"", () => {
    renderSection({ locale: "zh-CN" });
    expect(screen.getByTestId("recent-work-section-title").textContent).toBe("最近工作");
    expect(screen.getByTestId("recent-work-section-meta").textContent).toBe("从上次中断处继续");
    expect(screen.getByTestId("recent-work-empty-title").textContent).toBe("暂无最近工作");

    publishEntries(entries);
    expect(screen.getByTestId("recent-work-meta-f-001").textContent).toBe(
      "案卷文件 • 编辑于 4分钟前 • 8 BLOCKS",
    );
    expect(screen.getByTestId("recent-work-meta-f-004").textContent).toBe(
      "证据文件 • 编辑于 2小时前 • 19 BLOCKS",
    );
    expect(screen.getByTestId("recent-work-row-f-001").getAttribute("title")).toBe("打开文件");
  });

  it("interpolates the {ago} placeholder with the live relative age", () => {
    renderSection();
    publishEntries([
      {
        id: "f-age",
        name: "Age Probe",
        kind: "dossier",
        sizeBytes: 1,
        updatedAt: isoMinutesAgo(2),
        detail: "1 BLOCK",
      },
    ]);
    expect(screen.getByTestId("recent-work-meta-f-age").textContent).toBe(
      "DOSSIER FILE • EDITED 2M AGO • 1 BLOCK",
    );
  });

  it("exports namespaced locale bundles that deep-merge with other components' bundles without collision", () => {
    // Key parity between bundles is the mergeability precondition.
    expect(Object.keys(en["recent-work"]).sort()).toEqual(Object.keys(zhCN["recent-work"]).sort());

    // A representative sibling component bundle (namespaced by its own
    // component id) — deep-merging the two en bundles must keep both
    // components' strings intact, which is only possible because every
    // bundle is namespaced under its component id.
    const siblingEn = { "other-component": { retry: "RETRY", next: "MORE" } };
    const merge = (a: Record<string, unknown>, b: Record<string, unknown>): Record<string, unknown> => {
      const out: Record<string, unknown> = { ...a };
      for (const [key, value] of Object.entries(b)) {
        const existing = out[key];
        out[key] =
          existing !== undefined &&
          typeof existing === "object" &&
          existing !== null &&
          typeof value === "object" &&
          value !== null
            ? merge(existing as Record<string, unknown>, value as Record<string, unknown>)
            : value;
      }
      return out;
    };

    const merged = merge(locales.en, siblingEn) as {
      "recent-work": RecentWorkStrings;
      "other-component": { retry: string; next: string };
    };
    expect(merged["recent-work"].sectionTitle).toBe("RECENT WORK");
    expect(merged["recent-work"].editedAgo).toBe("EDITED {ago} AGO");
    expect(merged["other-component"]).toEqual({ retry: "RETRY", next: "MORE" });
    expect(Object.keys(merged).sort()).toEqual(["other-component", "recent-work"]);
  });
});

describe("RecentWork interactions", () => {
  it("publishes the open intent as a bounded IFileEntry reference on row click", () => {
    renderSection();
    publishEntries(entries);
    fireEvent.click(screen.getByTestId("recent-work-row-f-001"));
    expect(readChannel<OpenedFile>("recent-work.opened-file")).toEqual({
      id: "f-001",
      name: "Redwater Corridor Brief",
      kind: "dossier",
      sync: "live",
      ontologyInterface: "IFileEntry",
    });
    // The row owns the opened highlight too: it derives "opened" from the
    // channel value it just published, so the opened row shows the accent
    // ring while the others do not.
    expect(screen.getByTestId("recent-work-row-f-001").getAttribute("style")).toContain("box-shadow");
    expect(screen.getByTestId("recent-work-row-f-002").getAttribute("style")).not.toContain(
      "box-shadow",
    );
  });

  it("moves the opened highlight when another row opens (current-value semantics)", () => {
    renderSection();
    publishEntries(entries);
    fireEvent.click(screen.getByTestId("recent-work-row-f-001"));
    fireEvent.click(screen.getByTestId("recent-work-row-f-003"));
    expect(readChannel<OpenedFile>("recent-work.opened-file")?.id).toBe("f-003");
    expect(screen.getByTestId("recent-work-row-f-003").getAttribute("style")).toContain("box-shadow");
    expect(screen.getByTestId("recent-work-row-f-001").getAttribute("style")).not.toContain(
      "box-shadow",
    );
  });

  it("emits recent-work.insert-file with the bounded payload and no open publication", () => {
    const payloads: unknown[] = [];
    const unsubscribe = subscribeToEvent("recent-work.insert-file", (payload) => {
      payloads.push(payload);
    });
    renderSection({ insertAffordance: true });
    publishEntries(entries);
    fireEvent.click(screen.getByTestId("recent-work-insert-f-002"));
    expect(payloads).toEqual([
      {
        id: "f-002",
        name: "WF-014 Corridor Watch",
        kind: "workflow-board",
        sync: "synced",
        ontologyInterface: "IFileEntry",
      },
    ]);
    expect(readChannel<OpenedFile>("recent-work.opened-file")).toBeNull();
    unsubscribe();
  });
});
