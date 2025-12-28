import { CategoryCard } from './CategoryCard';
import { ReportTheme } from './reportTheme';

export interface CategoryData {
  category: string;
  value: number;
  format?: 'currency' | 'number' | 'percent';
  subtitle?: string;
  color?: string;
}

export interface CategoryGridProps {
  categories: CategoryData[];
  columns?: 2 | 3 | 4;
  theme?: ReportTheme;
  onCategoryClick?: (category: string) => void;
  compact?: boolean;
}

const gridClasses = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};

export function CategoryGrid({
  categories,
  columns = 3,
  theme = 'blue',
  onCategoryClick,
  compact = false,
}: CategoryGridProps) {
  const effectiveColumns = Math.min(columns, Math.max(2, categories.length)) as 2 | 3 | 4;
  const gap = compact ? 'gap-2' : 'gap-4';

  return (
    <div className={`grid ${gridClasses[effectiveColumns]} ${gap}`}>
      {categories.map((cat, index) => (
        <CategoryCard
          key={cat.category}
          category={cat.category}
          value={cat.value}
          format={cat.format}
          subtitle={cat.subtitle}
          color={cat.color}
          theme={theme}
          colorIndex={index}
          onClick={onCategoryClick ? () => onCategoryClick(cat.category) : undefined}
          compact={compact}
        />
      ))}
    </div>
  );
}
