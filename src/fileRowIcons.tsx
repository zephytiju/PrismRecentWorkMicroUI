import type { ReactElement } from "react";

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

/** Resolves an entry kind to its prototype drawing + semantic token. */
export function visualForKind(kind: string): KindVisual {
  return KIND_VISUALS[kind] ?? FALLBACK_VISUAL;
}
