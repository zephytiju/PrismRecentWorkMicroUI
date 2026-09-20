import enBundle from "./en.json";
import zhCNBundle from "./zh-CN.json";

/**
 * Locales the recent-work micro-UI bundles. Every component-fixed UI string
 * is resolved from these bundles (statically imported, resolveJsonModule); the
 * component never hardcodes copy. Configuration-provided strings (an explicit
 * sectionTitle override, …) stay composition-authored and are localized by the
 * composer.
 */
export type RecentWorkLocale = "en" | "zh-CN";

/**
 * The per-locale string table — the keys of the en bundle. Declared widened
 * (string values) so the zh-CN bundle is checked for exact key parity at
 * compile time while keeping literal JSON types out of the public surface.
 */
export type RecentWorkStrings = {
  readonly [K in keyof typeof enBundle["recent-work"]]: string;
};

const bundles: Record<RecentWorkLocale, { readonly "recent-work": RecentWorkStrings }> = {
  en: enBundle,
  "zh-CN": zhCNBundle,
};

/** Parsed en locale bundle (namespaced under the component id "recent-work"). */
export const en = enBundle;

/** Parsed zh-CN locale bundle (namespaced under the component id "recent-work"). */
export const zhCN = zhCNBundle;

/** All bundled locale bundles keyed by locale id — for downstream deep-merge. */
export const locales = bundles;

/** Resolves the string table for a locale. */
export function stringsForLocale(locale: RecentWorkLocale): RecentWorkStrings {
  return bundles[locale]["recent-work"];
}

/**
 * Simple `{placeholder}` interpolation (e.g. `"EDITED {ago} AGO"` + ago).
 * Placeholder-for-value substitution only — no ICU, no regexes.
 */
export function formatMessage(
  template: string,
  values: Readonly<Record<string, string | number>>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    result = result.replaceAll(`{${key}}`, String(value));
  }
  return result;
}
