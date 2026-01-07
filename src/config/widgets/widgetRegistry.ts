import { SupabaseClient } from '@supabase/supabase-js';
import { WidgetDefinition, WidgetAccess } from './widgetTypes';
import { customerWidgets } from './customerWidgets';
import { adminWidgets } from './adminWidgets';
import { CustomWidgetDefinition, isCustomWidget } from './customWidgetTypes';
import { loadAllCustomWidgets } from './customWidgetStorage';
import { widgetLibrary } from '../widgetLibrary';

export type AnyWidgetDefinition = WidgetDefinition | CustomWidgetDefinition;

const systemWidgets: Record<string, WidgetDefinition> = {
  ...customerWidgets,
  ...adminWidgets,
};

export const isSystemWidget = (widgetId: string): boolean => {
  return widgetId in systemWidgets;
};

export const getSystemWidget = (
  widgetId: string,
  isAdmin: boolean
): WidgetDefinition | null => {
  const widget = systemWidgets[widgetId];

  if (!widget) return null;
  if (!isAdmin && widget.access === 'admin') return null;

  return widget;
};

export const loadAllWidgets = async (
  supabase: SupabaseClient,
  isAdmin: boolean,
  customerId?: number
): Promise<Record<string, AnyWidgetDefinition>> => {
  const allWidgets: Record<string, AnyWidgetDefinition> = {};

  for (const [id, widget] of Object.entries(systemWidgets)) {
    if (isAdmin || widget.access === 'customer') {
      allWidgets[id] = widget;
    }
  }

  const customWidgets = await loadAllCustomWidgets(supabase, isAdmin, customerId);
  for (const widget of customWidgets) {
    allWidgets[widget.id] = widget;
  }

  return allWidgets;
};

export const getAvailableWidgetsForLibrary = async (
  supabase: SupabaseClient,
  isAdmin: boolean,
  isViewingAsCustomer: boolean,
  customerId?: number
): Promise<AnyWidgetDefinition[]> => {
  const allWidgets = await loadAllWidgets(supabase, isAdmin, customerId);

  return Object.values(allWidgets).filter(widget => {
    if (isViewingAsCustomer) {
      if (isCustomWidget(widget)) {
        return widget.visibility.type !== 'admin_only';
      }
      return widget.access === 'customer';
    }

    if (isAdmin) {
      if (isCustomWidget(widget)) {
        return widget.visibility.type === 'admin_only' ||
               widget.visibility.type === 'all_customers';
      }
      return widget.access === 'admin';
    }

    if (isCustomWidget(widget)) {
      const viz = widget.visibility;
      if (viz.type === 'all_customers') return true;
      if (viz.type === 'specific_customers' && customerId) {
        return viz.customerIds.includes(customerId);
      }
      return false;
    }

    return widget.access === 'customer';
  });
};

export function getWidgetsByAccess(access: WidgetAccess): WidgetDefinition[] {
  return Object.values(systemWidgets).filter(w => w.access === access);
}

export function getWidget(id: string): WidgetDefinition | undefined {
  return systemWidgets[id];
}

export function getWidgetsByCategory(category: string, access?: WidgetAccess): WidgetDefinition[] {
  return Object.values(systemWidgets).filter(
    w => w.category === category && (!access || w.access === access)
  );
}

export function getWidgetById(id: string): WidgetDefinition | undefined {
  if (systemWidgets[id]) {
    return systemWidgets[id];
  }

  const libraryWidget = widgetLibrary[id];
  if (libraryWidget) {
    return {
      id: libraryWidget.id,
      name: libraryWidget.name,
      description: libraryWidget.description || '',
      type: libraryWidget.type,
      category: libraryWidget.category,
      access: libraryWidget.scope === 'admin' ? 'admin' : 'customer',
      defaultSize: libraryWidget.size === 'large' ? 'large' : libraryWidget.size === 'medium' ? 'medium' : 'small',
      icon: libraryWidget.icon,
      iconColor: 'bg-blue-500',
      calculate: libraryWidget.calculate,
    } as WidgetDefinition;
  }

  return undefined;
}
