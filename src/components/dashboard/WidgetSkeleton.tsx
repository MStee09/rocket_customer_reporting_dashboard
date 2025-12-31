type WidgetType = 'kpi' | 'featured_kpi' | 'number' | 'currency' | 'percentage' |
                  'line_chart' | 'bar_chart' | 'pie_chart' | 'table' | 'map';

interface WidgetSkeletonProps {
  widgetType: WidgetType | string;
  size?: 1 | 2 | 3;
  showHeader?: boolean;
}

export function WidgetSkeleton({
  widgetType,
  size = 1,
  showHeader = true
}: WidgetSkeletonProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-pulse">
      {showHeader && (
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-200 rounded-xl" />
          <div className="flex-1">
            <div className="h-4 w-32 bg-slate-200 rounded" />
          </div>
        </div>
      )}
      <div className="p-4">
        {renderSkeletonContent(widgetType, size)}
      </div>
    </div>
  );
}

function renderSkeletonContent(widgetType: string, size: number) {
  switch (widgetType) {
    case 'kpi':
    case 'featured_kpi':
    case 'number':
    case 'currency':
    case 'percentage':
      return <KPISkeleton />;
    case 'bar_chart':
      return <BarChartSkeleton bars={size === 3 ? 12 : size === 2 ? 8 : 5} />;
    case 'line_chart':
      return <LineChartSkeleton />;
    case 'pie_chart':
      return <PieChartSkeleton showLegend={size >= 2} />;
    case 'table':
      return <TableSkeleton rows={size === 3 ? 8 : size === 2 ? 5 : 3} />;
    case 'map':
      return <MapSkeleton />;
    default:
      return <KPISkeleton />;
  }
}

function KPISkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-10 w-32 bg-slate-200 rounded" />
      <div className="h-4 w-24 bg-slate-100 rounded" />
    </div>
  );
}

function BarChartSkeleton({ bars = 7 }: { bars?: number }) {
  return (
    <div className="space-y-4">
      <div className="h-48 flex items-end gap-2">
        {Array.from({ length: bars }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-slate-200 rounded-t"
            style={{ height: `${30 + Math.random() * 70}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between">
        {Array.from({ length: Math.min(bars, 6) }).map((_, i) => (
          <div key={i} className="h-3 w-8 bg-slate-100 rounded" />
        ))}
      </div>
    </div>
  );
}

function LineChartSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="w-8 flex flex-col justify-between">
          <div className="h-3 w-full bg-slate-100 rounded" />
          <div className="h-3 w-full bg-slate-100 rounded" />
          <div className="h-3 w-full bg-slate-100 rounded" />
        </div>
        <div className="flex-1 h-48 bg-slate-100 rounded relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-200/50 to-transparent animate-shimmer" />
        </div>
      </div>
      <div className="flex justify-between ml-10">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-3 w-8 bg-slate-100 rounded" />
        ))}
      </div>
    </div>
  );
}

function PieChartSkeleton({ showLegend = true }: { showLegend?: boolean }) {
  return (
    <div className={`flex ${showLegend ? 'gap-6' : 'justify-center'}`}>
      <div className="w-32 h-32 rounded-full border-8 border-slate-200 relative">
        <div className="absolute inset-2 rounded-full border-4 border-slate-100" />
      </div>
      {showLegend && (
        <div className="flex-1 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-200" />
              <div className="h-3 flex-1 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4 pb-2 border-b border-slate-100">
        <div className="h-4 w-1/4 bg-slate-200 rounded" />
        <div className="h-4 w-1/4 bg-slate-200 rounded" />
        <div className="h-4 w-1/4 bg-slate-200 rounded" />
        <div className="h-4 w-1/4 bg-slate-200 rounded" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="h-4 w-1/4 bg-slate-100 rounded" />
          <div className="h-4 w-1/4 bg-slate-100 rounded" />
          <div className="h-4 w-1/4 bg-slate-100 rounded" />
          <div className="h-4 w-1/4 bg-slate-100 rounded" />
        </div>
      ))}
    </div>
  );
}

function MapSkeleton() {
  return (
    <div className="h-64 bg-slate-100 rounded-xl relative overflow-hidden">
      <svg viewBox="0 0 100 60" className="absolute inset-0 w-full h-full opacity-20">
        <path
          d="M10,20 L20,15 L35,18 L50,15 L65,18 L80,15 L90,20 L92,35 L85,45 L70,48 L50,50 L30,48 L15,45 L8,35 Z"
          fill="currentColor"
          className="text-slate-300"
        />
      </svg>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-200/30 to-transparent animate-shimmer" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="px-3 py-1.5 bg-white/80 rounded-full text-xs text-slate-500">
          Loading map data...
        </div>
      </div>
    </div>
  );
}
