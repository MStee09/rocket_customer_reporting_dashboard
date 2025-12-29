import { DashboardWidgetCard } from '../DashboardWidgetCard';
import { widgetLibrary, getEffectiveColSpan, getScaleFactor } from '../../config/widgetLibrary';
import { WidgetSizeLevel } from '../../types/widgets';

interface WidgetItem {
  id: string;
  source: 'layout' | 'db';
}

interface WidgetGridProps {
  widgets: WidgetItem[];
  customWidgets: Record<string, any>;
  widgetSizes: Record<string, WidgetSizeLevel>;
  customerId: string | undefined;
  startDate: string;
  endDate: string;
  comparisonDates: { start: string; end: string } | null;
}

export function WidgetGrid({
  widgets,
  customWidgets,
  widgetSizes,
  customerId,
  startDate,
  endDate,
  comparisonDates,
}: WidgetGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-auto">
      {widgets.map((item) => {
        const widgetId = item.id;
        let widget = widgetLibrary[widgetId];
        let isCustom = false;

        if (!widget) {
          widget = customWidgets[widgetId];
          isCustom = true;
        }

        if (!widget) return null;

        const sizeLevel = widgetSizes[widgetId] || 'default';
        const colSpan = getEffectiveColSpan(widget.type, widget.size || 'small', sizeLevel);
        const scaleFactor = getScaleFactor(sizeLevel);

        return (
          <div key={widgetId} className={`${colSpan} transition-all duration-300 ease-out`}>
            <DashboardWidgetCard
              widget={widget}
              customerId={customerId}
              dateRange={{ start: startDate, end: endDate }}
              comparisonDateRange={comparisonDates || undefined}
              isEditing={false}
              isCustomWidget={isCustom}
              sizeLevel={sizeLevel}
              scaleFactor={scaleFactor}
              onRemove={() => {}}
              onCycleSize={() => {}}
              onResetSize={() => {}}
            />
          </div>
        );
      })}
    </div>
  );
}
