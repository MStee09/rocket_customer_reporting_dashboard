interface StatusBadgeProps {
  statusName: string;
  isCompleted: boolean;
  isCancelled: boolean;
}

export function StatusBadge({ statusName, isCompleted, isCancelled }: StatusBadgeProps) {
  let colorClass = 'bg-rocket-blue/10 text-rocket-blue border-rocket-blue/20';

  if (isCompleted) {
    colorClass = 'bg-rocket-green/10 text-rocket-green border-rocket-green/20';
  } else if (isCancelled) {
    colorClass = 'bg-red-100 text-red-800 border-red-200';
  }

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${colorClass}`}>
      {statusName}
    </span>
  );
}
