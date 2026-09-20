# PrismRecentWorkMicroUI

Platform Prism recent-work micro-UI. Component id: `recent-work`.
Published to npm as [`@zephytiju/prism-recent-work`](https://www.npmjs.com/package/@zephytiju/prism-recent-work).

The VAULT root-level continuation strip (Guanlan File Hub page): the
`RECENT WORK / CONTINUE WHERE YOU LEFT OFF` header (titles render from component
configuration keys — Prism has no composed title node) followed by per-prototype
file-row members — kind icon, file name, descriptor line, live/sync dot —
rendered 0..N at app runtime from recent `IFileEntry` records (decision D3),
ordered by `updatedAt` with an optional recency window. It consumes the
host-seeded `recent-work.file-entries` channel and never talks to Lattice
itself. Opening a row publishes the navigation/open intent consumed by the
shell and the File Viewer's path slot (D6/D8). Composed applications (for
example Guanlan) consume it as-is; the component is platform-owned.

## Configuration keys

| Prop | Meaning |
| --- | --- |
| `locale` | UI locale for the component-fixed strings: `"en" \| "zh-CN"` (default `"en"`) — see [i18n](#internationalization-i18n) |
| `sectionTitle` | Section header title (defaults to the locale's `sectionTitle`) |
| `sectionMeta` | Continue-where-you-left-off meta on the header's right (defaults to the locale's `sectionMeta`) |
| `columns` | Row-grid column count (default `2` — the design's default 2-column row grid; the VAULT page composition passes `3`) |
| `recencyWindowHours` | Recency window in hours: entries older than now − N hours are excluded (default no window) |
| `descriptor` | `(entry) => string` full descriptor line (default `KIND • STATUS-or-EDITED-ago • DETAIL`) |
| `insertAffordance` | Renders the `+` insert affordance on rows (insert contexts only; default off) |
| `insertLabel` | Label for the insert affordance (defaults to the locale's `insert`) |

## Channel contract

| Direction | Kind | Id | Payload |
| --- | --- | --- | --- |
| consumes | state | `recent-work.file-entries` | `RecentFilesProjection \| null` — recent `RecentFileEntry` records (the bounded `FileEntrySummary` plus `updatedAt`, `sync`, optional `status`/`detail`) |
| publishes | state | `recent-work.opened-file` | `{ id, name, kind, sync, ontologyInterface: "IFileEntry" }` on row open — the navigation/open intent (D8): a bounded file reference the shell and the File Viewer's path slot interpret in their own way (D6); receivers fetch their own domain data (D4) |
| emits | event | `recent-work.insert-file` | same bounded `IFileEntry` reference — only when `insertAffordance` is enabled (insert contexts) |

Channel ids are string literals at every call-site so the build-time channel-graph scanner can
derive the graph. Channel reads use `usePrismStateValue`; both publications are
setter-only (`usePrismStateSetter`) / event emissions. `RecentFileEntry` carries
exactly the recency data the design specifies on top of `IFileEntry` — `updatedAt`
(ordering + "EDITED 4M AGO") and the workspace `sync` state driving the live dot.

## Audit rule

Rendering recent files is a routine read and is NOT audit-worthy. This component
emits NO audit event. The only event it can ever emit is the config-gated
`recent-work.insert-file` (an insert-context handshake, not an observable domain
action).

## Internationalization (i18n)

The component ships `en` and `zh-CN` locale bundles — `src/locales/en.json` / `src/locales/zh-CN.json` —
and every component-fixed UI string is resolved from them (the section title and
continue-where-you-left-off meta, the per-kind descriptor labels, the
`EDITED {ago} AGO` relativization with its `M/H/D` units, the empty-state title
and hint, the open tooltip, the sync labels, and the insert label). The component
renders no hardcoded copy.

```json
{
  "recent-work": {
    "sectionTitle": "RECENT WORK",
    "sectionMeta": "CONTINUE WHERE YOU LEFT OFF",
    "emptyTitle": "No recent work yet",
    "emptyHint": "Files you open and edit will appear here so you can pick up where you left off.",
    "openFile": "Open file",
    "editedAgo": "EDITED {ago} AGO",
    "minutesAgo": "{count}M",
    "hoursAgo": "{count}H",
    "daysAgo": "{count}D",
    "syncLive": "Live",
    "syncSyncing": "Syncing",
    "syncSynced": "Synced",
    "insert": "+",
    "kindFolder": "FOLDER",
    "kindDossier": "DOSSIER FILE",
    "kindEvidence": "EVIDENCE FILE",
    "kindReference": "REFERENCE",
    "kindBoard": "BOARD",
    "kindWorkflowBoard": "WORKFLOW BOARD",
    "kindAuditBoard": "AUDIT BOARD",
    "kindWorld": "GEOVISION FILE"
  }
}
```

- `locale?: "en" | "zh-CN"` prop (default `"en"`) selects the string table per instance.
- `editedAgo` uses a simple `{ago}` placeholder interpolated with the relative
  age (plain substitution, no regexes — `formatMessage` is exported from the
  package entry).
- Explicit `sectionTitle` / `sectionMeta` props override the locale strings.
- **Composition-authored strings are localized by the composer; component-fixed strings live in the
  locale JSONs.** An explicit `sectionTitle` override (and the `descriptor`
  callback) is configuration-authored: a host with a localized section passes its
  own string per locale. Entry `status`/`detail` parts are host data and stay
  host-localized.
- Locale bundles are namespaced under the component id (`"recent-work"`) so a composer can
  deep-merge every component's bundle into ONE UI language bundle without collisions:

```ts
import { locales as recentWorkLocales } from "@zephytiju/prism-recent-work";
// recentWorkLocales["zh-CN"] -> { "recent-work": { … } }
const uiBundle = deepMerge(hostStrings, recentWorkLocales["zh-CN"]);
```

The parsed bundles are exported from the package entry (`locales`, `en`, `zhCN`,
`stringsForLocale`), and the raw JSONs are also served by the `./locales/*` exports subpath
(e.g. `@zephytiju/prism-recent-work/locales/zh-CN.json`); `files` ships both `dist` and
`locales`.

## Theme

No palette is hardcoded. Every color resolves to SEMANTIC theme tokens (`ok`,
`accent`, `threat`, `warn`, `signal`, `card`, `card-dark`, `input`, `border`,
`line`, `text`, `muted`, `deep`, `panel`) consumed as CSS variables, plus
`--mantine-font-family-monospace` for the mono typography — the palette is
supplied entirely by the host's `MantineProvider`. The local demo ships TWO
themes, both defined in `src/demo.tsx`: `geovisionTheme` (dark), mapping each
semantic token onto the exact `:root` variables of the VAULT v9 prototype (deep
bg, panel black, card, mint, red, blue, amber, purple, muted, border), and the
contrasting `latticeLightTheme` (light), mapping the SAME semantic token keys
onto a different palette — the component is skinned purely through the
surrounding `MantineProvider`. Per-kind icon hues follow the prototype's palette
(doc mint → `ok`, board amber → `warn`, world purple → `signal`, folder blue →
`accent`); the sync dot uses `ok` (dimmed when synced) / `warn` (syncing).

## Source layout

`src/` is strictly two parts:

- Component source (what the package compiles): `RecentWork.tsx` (the section),
  `FileRow.tsx` (the file-row member — the File Row sub-library axiom, owning
  the open-intent publication), `index.ts` (public entry), and `src/locales/`
  (`en.json`, `zh-CN.json`, `index.ts` — the i18n string bundles, their
  resolver, and the `{ago}` interpolation helper).
- Demo: exactly ONE file, `src/demo.tsx` — the two host themes (GeoVision v9 +
  Lattice Light), all demo test data (the six per-prototype recent files with
  mixed kinds and relative recency), the channel seeding
  (`seedDemoChannels`) and channel monitors, and the demo page rendering TWO
  `RecentWork` instances side by side behind a global EN | 中文 language switcher
  (plus per-instance switches): HOST A runs the default 2-column row grid, HOST
  B the VAULT page's 3-column composition, with reseed/clear buttons.

The npm package ships `dist` (compiled component + type declarations + locale
JSONs) and the top-level `locales/` directory (the raw JSON bundles, served by
the `./locales/*` exports subpath); no demo code is published.
`scripts/copy-locales.mjs` copies the JSON bundles into both locations during
`npm run build`.

## Local development

```sh
npm install
npm run typecheck
npm test
npm run dev
npm run shot-demo
```

`npm install` pulls the platform peers (`@zephytiju/prism-react`,
`@zephytiju/lattice-common-interfaces`) from the npm registry, along with the
host-side peer dependencies (`react`, `react-dom`, `@mantine/core`). When
consuming the published package, install it directly
(`npm install @zephytiju/prism-recent-work`) and provide those peer dependencies
in the host application.

The demo (`npm run dev`, entry `src/demo.tsx`) plays the host: on load it seeds
the six per-prototype recent files onto the GLOBAL recent-work channel (the
component itself makes no Lattice calls, so no mock executor is needed) and
renders TWO `RecentWork` instances side by side, each inside its own
`MantineProvider` with a different theme (GeoVision v9 dark left with the
default 2-column grid, Lattice Light right with the page's 3-column
composition) — since both instances consume the same global channels, they
always render the same rows in two skins. A global EN | 中文 segmented control
switches the `locale` prop of BOTH instances at once, and each instance carries
its own per-instance control so the two hosts can render DIFFERING locales
simultaneously. Buttons reseed the recent files or clear the channel to inspect
the guided empty state — in both themes and both languages — and the channel
monitors show the shared consumed state plus the `recent-work.opened-file`
publication. `npm run shot-demo` boots the vite dev server, drives the demo in
headless Chrome (LEFT instance `en`, RIGHT instance `zh-CN`), OPENS a recent
file row so the monitor shows the published open intent, and captures the
language switcher plus both themed instances in one shot to
`/tmp/guanlan-review/demo-recent-work-themes.png`.

## Design record

Page design: https://qcnwge0wy4s0.feishu.cn/wiki/TLFtwgBgpiW8iWkXT7rcOyKgnAd —
Component — Recent Work Section:
https://qcnwge0wy4s0.feishu.cn/wiki/Cfu2w4uLUiwwlIkzFCMcWIktnMF — File Row
sub-library: https://qcnwge0wy4s0.feishu.cn/wiki/BmoTw4WnriMV9MkKK8HchKO8nfg —
Grouping: https://qcnwge0wy4s0.feishu.cn/wiki/X7qdw8Akeiq1w0kJBdmcgTHBnmh.
Visual reference: the page's v9 interactive HTML prototype
(`vault-standalone.html`, `.sec-l` / `.sec-r` / `.frow` / `.fic`).
