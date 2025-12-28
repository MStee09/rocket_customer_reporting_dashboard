import { WidgetDefinition, WidgetSizeLevel } from '../types/widgets';
import { WidgetType, WidgetSize } from '../config/widgetLibrary';

export const getBaseColSpan = (widgetType: WidgetType, widgetSize: WidgetSize): number => {
  if (widgetSize === 'hero') return 3;
  if (widgetType === 'map' || widgetSize === 'large') return 2;
  if (widgetType === 'line_chart' || widgetType === 'bar_chart' || widgetSize === 'wide') return 2;
  if (widgetType === 'table') return 2;
  return 1;
};

export const getWidgetColSpan = (widget: WidgetDefinition, sizeLevel?: WidgetSizeLevel): number => {
  const baseSpan = getBaseColSpan(widget.type, widget.size);

  if (!sizeLevel || sizeLevel === 'default') {
    return baseSpan;
  }

  if (sizeLevel === 'large') return Math.min(baseSpan + 1, 3);
  if (sizeLevel === 'xlarge') return Math.min(baseSpan + 2, 3);
  if (sizeLevel === 'full') return 3;

  return baseSpan;
};

export const getWidgetRowSpan = (widget: WidgetDefinition): number => {
  if (widget.type === 'map' && widget.size === 'hero') return 3;
  if (widget.type === 'map') return 2;
  if (widget.type === 'table') return 2;
  if (widget.type === 'pie_chart') return 2;
  return 1;
};
