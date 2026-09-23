import { Group, Text } from "@mantine/core";

export interface SectionHeaderProps {
  /** Resolved section title (locale string or explicit configuration override). */
  readonly title: string;
  /** Resolved continue-where-you-left-off meta (locale string or override). */
  readonly meta: string;
}

/**
 * The Recent Work section header: the section title on the left and the
 * continue-where-you-left-off meta on the right. The header is part of the
 * component (Prism has no composed title node), so titles render from
 * component configuration keys. No palette is hardcoded — colors resolve to
 * semantic theme tokens supplied by the host's MantineProvider.
 */
export function SectionHeader({ title, meta }: SectionHeaderProps) {
  return (
    <Group justify="space-between" align="baseline" wrap="nowrap" gap={8}>
      <Text
        fz={12}
        fw={600}
        style={{ color: "var(--mantine-color-text-filled)", letterSpacing: "0.02em" }}
        data-testid="recent-work-section-title"
      >
        {title}
      </Text>
      <Text
        ff="var(--mantine-font-family-monospace)"
        fz={9}
        style={{ color: "var(--mantine-color-muted-filled)" }}
        data-testid="recent-work-section-meta"
      >
        {meta}
      </Text>
    </Group>
  );
}
