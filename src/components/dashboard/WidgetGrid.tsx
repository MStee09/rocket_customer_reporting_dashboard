import { DashboardWidgetCard } from '../DashboardWidgetCard';
import { AIWidgetRenderer } from './AIWidgetRenderer';
import { InlineAddWidgetCard } from './InlineAddWidgetCard';
import { widgetLibrary, getEffectiveColSpan, getScaleFactor } from '../../config/widgetLibrary';
import { WidgetSizeLevel } from '../../types/widgets';

interface WidgetItem {
  id: string;
  source: 'layout' | 'db';
}

interface AvailableWidget {
  id: string;
  name: string;
  description: string;
  type: string;
  iconColor?: string;
  category?: string;
}

interface WidgetGridProps {
  widgets: WidgetItem[];
  customWidgets: Record<string, any>;
  widgetSizes: Record<string, WidgetSizeLevel>;
  customerId: string | undefined;
  startDate: string;
  endDate: string;
  comparisonDates: { start: string; end: string } | null;
  onWidgetRemoved?: () => void;
  isEditing?: boolean;
  availableWidgets?: AvailableWidget[];
  onAddWidget?: (widgetId: string) => void;
}

function getAIWidgetColSpan(size: string | undefined): string {
  switch (size) {
    case 'small':
      return 'col-span-1';
    case 'medium':
      return 'col-span-1';
    case 'wide':
      return 'col-span-1 md:col-span-2';
    case 'full':
      return 'col-span-1 md:col-span-2 lg:col-span-3';
    default:
      return 'col-span-1';
  }
}

export function WidgetGrid({
  widgets,
  customWidgets,
  widgetSizes,
  customerId,
  startDate,
  endDate,
  comparisonDates,
  onWidgetRemoved,
  isEditing = false,
  availableWidgets = [],
  onAddWidget,
}: WidgetGridProps) {
  const currentWidgetIds = widgets.map(w => w.id);

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

        const isAIWidget = widget.type === 'ai_report' || widget.source === 'ai';

        if (isAIWidget) {
          const aiSize = widget.display?.defaultSize || 'medium';
          const colSpan = getAIWidgetColSpan(aiSize);

          return (
            <div key={widgetId} className={`${colSpan} transition-all duration-300 ease-out`}>
              <AIWidgetRenderer
                widget={widget}
                onDelete={onWidgetRemoved}
                compact={true}
              />
            </div>
          );
        }

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
              isEditing={isEditing}
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

      {onAddWidget && availableWidgets.length > 0 && (
        <InlineAddWidgetCard
          availableWidgets={availableWidgets}
          currentWidgets={currentWidgetIds}
          onAddWidget={onAddWidget}
        />
      )}
    </div>
  );
}
