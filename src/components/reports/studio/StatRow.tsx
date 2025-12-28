import { StatCard, StatCardProps } from './StatCard';

export interface StatRowProps {
  stats: StatCardProps[];
  columns?: 2 | 3 | 4;
  compact?: boolean;
}

const gridClasses = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};

export function StatRow({ stats, columns = 3, compact = false }: StatRowProps) {
  const effectiveColumns = Math.min(columns, stats.length) as 2 | 3 | 4;
  const gap = compact ? 'gap-2' : 'gap-4';

  return (
    <div className={`grid ${gridClasses[effectiveColumns]} ${gap}`}>
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} compact={compact} />
      ))}
    </div>
  );
}
