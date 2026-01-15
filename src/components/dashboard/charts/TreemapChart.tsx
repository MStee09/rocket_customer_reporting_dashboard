import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import { Loader2 } from 'lucide-react';

export interface TreemapNode {
  name: string;
  value: number;
  children?: TreemapNode[];
  color?: string;
}

interface TreemapChartProps {
  data: TreemapNode[];
  isLoading?: boolean;
  title?: string;
  subtitle?: string;
  height?: number;
  valuePrefix?: string;
  valueSuffix?: string;
  colorScale?: string[];
  className?: string;
}

interface TreemapContentProps {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  value: number;
  depth: number;
  colors: string[];
  valuePrefix: string;
  valueSuffix: string;
}

const TreemapContent = ({ x, y, width, height, name, value, depth, colors, valuePrefix, valueSuffix }: TreemapContentProps) => {
  if (width < 30 || height < 30) return null;

  const color = colors[depth % colors.length];

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
        stroke="#fff"
        strokeWidth={2}
        rx={4}
        ry={4}
      />
      {width > 50 && height > 40 && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 6}
            textAnchor="middle"
            fill="#fff"
            fontSize={width > 80 ? 12 : 10}
            fontWeight={600}
          >
            {name.length > 15 ? name.substring(0, 12) + '...' : name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 10}
            textAnchor="middle"
            fill="rgba(255,255,255,0.8)"
            fontSize={10}
          >
            {valuePrefix}{value.toLocaleString()}{valueSuffix}
          </text>
        </>
      )}
    </g>
  );
};

export function TreemapChart({
  data,
  isLoading = false,
  title = 'Composition Analysis',
  subtitle,
  height = 400,
  valuePrefix = '$',
  valueSuffix = '',
  colorScale = ['#f97316', '#3b82f6', '#22c55e', '#8b5cf6', '#ef4444', '#06b6d4', '#f59e0b'],
  className = '',
}: TreemapChartProps) {
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className={`flex items-center justify-center text-slate-500 ${className}`} style={{ height }}>
        No composition data available
      </div>
    );
  }

  const treemapData = [{ name: 'root', children: data }];
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className={className}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h3 className="font-semibold text-slate-800">{title}</h3>}
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <Treemap
          data={treemapData}
          dataKey="value"
          aspectRatio={4 / 3}
          stroke="#fff"
          content={(props: TreemapContentProps & { depth: number }) => (
            <TreemapContent
              {...props}
              colors={colorScale}
              valuePrefix={valuePrefix}
              valueSuffix={valueSuffix}
            />
          )}
        >
          <Tooltip
            content={({ payload }) => {
              if (!payload || !payload.length) return null;
              const item = payload[0].payload;
              if (item.name === 'root') return null;

              const percent = ((item.value / total) * 100).toFixed(1);

              return (
                <div className="bg-white px-3 py-2 rounded-lg shadow-xl border border-slate-200 text-xs">
                  <div className="font-medium text-slate-800">{item.name}</div>
                  <div className="font-bold text-slate-900">
                    {valuePrefix}{item.value.toLocaleString()}{valueSuffix}
                  </div>
                  <div className="text-slate-500">{percent}% of total</div>
                </div>
              );
            }}
          />
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
}

export function buildSpendTreemapData(spend: Array<{
  category: string;
  subcategories: Array<{ name: string; value: number }>;
}>): TreemapNode[] {
  return spend.map((category) => ({
    name: category.category,
    value: category.subcategories.reduce((sum, s) => sum + s.value, 0),
    children: category.subcategories.map(sub => ({
      name: sub.name,
      value: sub.value,
    })),
  }));
}

export default TreemapChart;
