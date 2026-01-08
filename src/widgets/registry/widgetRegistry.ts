/**
 * Widget Registry
 *
 * Central registry for all widget definitions.
 * Widgets register themselves on import, then can be looked up by ID.
 *
 * Usage:
 *
 * // In widget file:
 * import { registerWidget } from './widgetRegistry';
 * registerWidget(myWidgetDefinition);
 *
 * // To execute:
 * const widget = getWidgetDefinition('my-widget-id');
 * const data = await widget.calculate({ supabase, customerId, params });
 */

import type { WidgetDefinition, WidgetCategory, WidgetAccess } from '../types/WidgetTypes';

// =============================================================================
// REGISTRY STORAGE
// =============================================================================

const widgetRegistry = new Map<string, WidgetDefinition>();

// =============================================================================
// REGISTRATION
// =============================================================================

/**
 * Register a widget definition
 * Called during module initialization
 */
export function registerWidget(widget: WidgetDefinition): void {
  if (widgetRegistry.has(widget.id)) {
    console.warn(`[WidgetRegistry] Widget "${widget.id}" is already registered. Overwriting.`);
  }
  widgetRegistry.set(widget.id, widget);
}

/**
 * Register multiple widgets at once
 */
export function registerWidgets(widgets: WidgetDefinition[]): void {
  for (const widget of widgets) {
    registerWidget(widget);
  }
}

/**
 * Unregister a widget (for testing or dynamic removal)
 */
export function unregisterWidget(widgetId: string): boolean {
  return widgetRegistry.delete(widgetId);
}

/**
 * Clear all registered widgets (for testing)
 */
export function clearRegistry(): void {
  widgetRegistry.clear();
}

// =============================================================================
// LOOKUP
// =============================================================================

/**
 * Get a widget definition by ID
 * Throws if not found
 */
export function getWidgetDefinition(id: string): WidgetDefinition {
  const widget = widgetRegistry.get(id);
  if (!widget) {
    throw new Error(`[WidgetRegistry] Widget not found: ${id}`);
  }
  return widget;
}

/**
 * Get a widget definition by ID, returns null if not found
 */
export function findWidgetDefinition(id: string): WidgetDefinition | null {
  return widgetRegistry.get(id) || null;
}

/**
 * Check if a widget is registered
 */
export function hasWidget(id: string): boolean {
  return widgetRegistry.has(id);
}

/**
 * Get all registered widget IDs
 */
export function getRegisteredWidgetIds(): string[] {
  return Array.from(widgetRegistry.keys());
}

/**
 * Get all registered widgets
 */
export function getAllWidgets(): WidgetDefinition[] {
  return Array.from(widgetRegistry.values());
}

// =============================================================================
// FILTERING
// =============================================================================

/**
 * Get widgets by category
 */
export function getWidgetsByCategory(category: WidgetCategory): WidgetDefinition[] {
  return getAllWidgets().filter(w => w.category === category);
}

/**
 * Get widgets by access level
 */
export function getWidgetsByAccess(access: WidgetAccess): WidgetDefinition[] {
  return getAllWidgets().filter(w => w.access === access || w.access === 'all');
}

/**
 * Get widgets available for a user
 */
export function getAvailableWidgets(isAdmin: boolean): WidgetDefinition[] {
  return getAllWidgets().filter(w => {
    if (w.access === 'all') return true;
    if (w.access === 'admin') return isAdmin;
    if (w.access === 'customer') return true;
    return false;
  });
}

/**
 * Get widgets by category and access
 */
export function getFilteredWidgets(options: {
  category?: WidgetCategory;
  access?: WidgetAccess;
  isAdmin?: boolean;
  search?: string;
}): WidgetDefinition[] {
  let widgets = getAllWidgets();

  if (options.category) {
    widgets = widgets.filter(w => w.category === options.category);
  }

  if (options.access) {
    widgets = widgets.filter(w => w.access === options.access || w.access === 'all');
  }

  if (options.isAdmin !== undefined) {
    widgets = widgets.filter(w => {
      if (w.access === 'all') return true;
      if (w.access === 'admin') return options.isAdmin;
      return true;
    });
  }

  if (options.search) {
    const searchLower = options.search.toLowerCase();
    widgets = widgets.filter(w =>
      w.name.toLowerCase().includes(searchLower) ||
      w.description.toLowerCase().includes(searchLower)
    );
  }

  return widgets;
}

// =============================================================================
// DEBUG
// =============================================================================

/**
 * Get registry stats (for debugging)
 */
export function getRegistryStats(): {
  totalWidgets: number;
  byCategory: Record<string, number>;
  byAccess: Record<string, number>;
} {
  const widgets = getAllWidgets();

  const byCategory: Record<string, number> = {};
  const byAccess: Record<string, number> = {};

  for (const widget of widgets) {
    byCategory[widget.category] = (byCategory[widget.category] || 0) + 1;
    byAccess[widget.access] = (byAccess[widget.access] || 0) + 1;
  }

  return {
    totalWidgets: widgets.length,
    byCategory,
    byAccess,
  };
}

/**
 * Log registry contents (for debugging)
 */
export function debugRegistry(): void {
  console.group('[WidgetRegistry] Contents');
  console.log('Stats:', getRegistryStats());
  console.log('Widgets:', getRegisteredWidgetIds());
  console.groupEnd();
}
