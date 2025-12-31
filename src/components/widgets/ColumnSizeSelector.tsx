import { WidgetSizeLevel } from '../../types/widgets';

interface ColumnSizeSelectorProps {
  value: WidgetSizeLevel;
  onChange: (size: WidgetSizeLevel) => void;
  baseColumns?: number;
}

export function ColumnSizeSelector({ value, onChange, baseColumns = 1 }: ColumnSizeSelectorProps) {
  const sizes: { level: WidgetSizeLevel; columns: number; label: string }[] = [
    { level: 'default', columns: baseColumns, label: `${baseColumns} col` },
    { level: 'large', columns: Math.min(baseColumns + 1, 3), label: `${Math.min(baseColumns + 1, 3)} col` },
    { level: 'full', columns: 3, label: 'Full' },
  ];

  const uniqueSizes = sizes.filter((s, i, arr) =>
    arr.findIndex(t => t.columns === s.columns) === i
  );

  return (
    <div className="flex gap-2">
      {uniqueSizes.map((size) => {
        const isSelected = value === size.level ||
          (value === 'default' && size.level === 'default') ||
          (value === 'xlarge' && size.columns === 3);

        return (
          <button
            key={size.level}
            onClick={() => onChange(size.level)}
            className={`
              p-2 rounded-lg border-2 transition-all
              ${isSelected
                ? 'border-rocket-500 bg-rocket-50'
                : 'border-slate-200 hover:border-slate-300'
              }
            `}
          >
            <div className="flex gap-0.5 mb-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className={`
                    w-3 h-6 rounded-sm transition-colors
                    ${i < size.columns
                      ? isSelected ? 'bg-rocket-500' : 'bg-slate-400'
                      : 'bg-slate-200'
                    }
                  `}
                />
              ))}
            </div>
            <div className={`text-xs font-medium ${isSelected ? 'text-rocket-600' : 'text-slate-500'}`}>
              {size.label}
            </div>
          </button>
        );
      })}
    </div>
  );
}
