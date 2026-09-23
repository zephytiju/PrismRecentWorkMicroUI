import { Card, Stack, Text } from "@mantine/core";

export interface EmptyStateProps {
  /** Locale-resolved empty-state title (e.g. "No recent work yet"). */
  readonly title: string;
  /** Locale-resolved empty-state hint (e.g. "Files you open and edit will appear here"). */
  readonly hint: string;
}

/**
 * The guided empty state rendered when the recent-work channel carries no
 * projection (or an empty one) — a bordered card with a title and hint. No
 * palette is hardcoded; colors resolve to semantic theme tokens supplied by
 * the host's MantineProvider.
 */
export function EmptyState({ title, hint }: EmptyStateProps) {
  return (
    <Card withBorder data-testid="recent-work-empty">
      <Stack gap="xs">
        <Text fw={500} data-testid="recent-work-empty-title">
          {title}
        </Text>
        <Text size="sm" data-testid="recent-work-empty-hint">
          {hint}
        </Text>
      </Stack>
    </Card>
  );
}
