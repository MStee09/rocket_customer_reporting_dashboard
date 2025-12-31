export type WidgetSizeConstraint = 1 | 2 | 3;

export interface WidgetConstraints {
  minSize: WidgetSizeConstraint;
  maxSize: WidgetSizeConstraint;
  optimalSize: WidgetSizeConstraint;
  minHeight: number;
}

type WidgetType = 'kpi' | 'featured_kpi' | 'number' | 'currency' | 'percentage' |
                  'line_chart' | 'bar_chart' | 'pie_chart' | 'table' | 'map';

const widgetTypeConstraints: Record<WidgetType, WidgetConstraints> = {
  kpi: { minSize: 1, maxSize: 3, optimalSize: 1, minHeight: 120 },
  featured_kpi: { minSize: 1, maxSize: 3, optimalSize: 1, minHeight: 140 },
  number: { minSize: 1, maxSize: 3, optimalSize: 1, minHeight: 120 },
  currency: { minSize: 1, maxSize: 3, optimalSize: 1, minHeight: 120 },
  percentage: { minSize: 1, maxSize: 3, optimalSize: 1, minHeight: 120 },
  pie_chart: { minSize: 1, maxSize: 2, optimalSize: 1, minHeight: 200 },
  bar_chart: { minSize: 2, maxSize: 3, optimalSize: 2, minHeight: 280 },
  line_chart: { minSize: 2, maxSize: 3, optimalSize: 2, minHeight: 280 },
  table: { minSize: 2, maxSize: 3, optimalSize: 2, minHeight: 300 },
  map: { minSize: 2, maxSize: 3, optimalSize: 3, minHeight: 400 },
};

const widgetSpecificConstraints: Record<string, Partial<WidgetConstraints>> = {
  flow_map: { minSize: 3, maxSize: 3, optimalSize: 3, minHeight: 500 },
  cost_by_state: { minSize: 2, optimalSize: 3, minHeight: 400 },
  carrier_mix: { minSize: 1, maxSize: 2, optimalSize: 1, minHeight: 200 },
  top_lanes: { minSize: 2, optimalSize: 2, minHeight: 320 },
  monthly_spend: { minSize: 2, optimalSize: 2, minHeight: 280 },
};

export function getWidgetConstraints(widgetId: string, widgetType: string): WidgetConstraints {
  const typeConstraints = widgetTypeConstraints[widgetType as WidgetType] || widgetTypeConstraints.kpi;
  const specificOverrides = widgetSpecificConstraints[widgetId];
  return { ...typeConstraints, ...specificOverrides };
}

export function clampWidgetSize(
  requestedSize: WidgetSizeConstraint,
  widgetId: string,
  widgetType: string
): WidgetSizeConstraint {
  const constraints = getWidgetConstraints(widgetId, widgetType);
  return Math.max(constraints.minSize, Math.min(constraints.maxSize, requestedSize)) as WidgetSizeConstraint;
}

export function isValidWidgetSize(
  size: WidgetSizeConstraint,
  widgetId: string,
  widgetType: string
): boolean {
  const constraints = getWidgetConstraints(widgetId, widgetType);
  return size >= constraints.minSize && size <= constraints.maxSize;
}

export function getSizeLabel(size: WidgetSizeConstraint): string {
  switch (size) {
    case 1: return 'Small';
    case 2: return 'Medium';
    case 3: return 'Large';
    default: return 'Auto';
  }
}

export function getSizeColSpan(size: WidgetSizeConstraint): string {
  switch (size) {
    case 1: return 'col-span-1';
    case 2: return 'col-span-1 md:col-span-2';
    case 3: return 'col-span-1 md:col-span-2 lg:col-span-3';
    default: return 'col-span-1';
  }
}
