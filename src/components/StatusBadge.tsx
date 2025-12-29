import { Badge } from './ui/Badge';

interface StatusBadgeProps {
  statusName: string;
  isCompleted: boolean;
  isCancelled: boolean;
}

export function StatusBadge({ statusName, isCompleted, isCancelled }: StatusBadgeProps) {
  let variant: 'success' | 'danger' | 'info' = 'info';

  if (isCompleted) {
    variant = 'success';
  } else if (isCancelled) {
    variant = 'danger';
  }

  return (
    <Badge variant={variant} size="md" dot={!isCancelled}>
      {statusName}
    </Badge>
  );
}
