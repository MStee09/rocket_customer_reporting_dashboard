import { formatValue } from './colors';
import { getTheme, ReportTheme } from './reportTheme';

export interface CategoryCardProps {
  category: string;
  value: number;
  format?: 'currency' | 'number' | 'percent';
  subtitle?: string;
  color?: string;
  theme?: ReportTheme;
  colorIndex?: number;
  onClick?: () => void;
  compact?: boolean;
}

export function CategoryCard({
  category,
  value,
  format = 'currency',
  subtitle,
  color,
  theme = 'blue',
  colorIndex = 0,
  onClick,
  compact = false,
}: CategoryCardProps) {
  const themeColors = getTheme(theme);
  const bgColor = color || themeColors.chartColors[colorIndex % themeColors.chartColors.length];
  const formattedValue = formatValue(value, format);

  if (compact) {
    return (
      <div
        className={`rounded-lg p-3 transition-all ${
          onClick ? 'cursor-pointer hover:scale-[1.02] hover:shadow-lg' : ''
        }`}
        style={{ backgroundColor: bgColor }}
        onClick={onClick}
      >
        <p data-category-label className="text-white/90 text-xs font-bold uppercase tracking-wider truncate">
          {category}
        </p>
        <p className="text-white text-xl font-bold mt-1 tracking-tight">
          {formattedValue}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl p-5 transition-all ${
        onClick ? 'cursor-pointer hover:scale-[1.02] hover:shadow-lg' : ''
      }`}
      style={{ backgroundColor: bgColor }}
      onClick={onClick}
    >
      <p data-category-label className="text-white/90 text-xs font-bold uppercase tracking-wider truncate">
        {category}
      </p>
      <p className="text-white text-3xl font-bold mt-2 tracking-tight">
        {formattedValue}
      </p>
      {subtitle && (
        <p className="text-white/70 text-sm mt-1">{subtitle}</p>
      )}
    </div>
  );
}
