export type {
  DateRange,
  ExecutionParams,
} from './types/ExecutionParams';

export type {
  WidgetVisualizationType,
  WidgetCategory,
  WidgetAccess,
  WidgetSize,
  WidgetCalculateContext,
  WidgetData,
  WidgetDefinition,
  WidgetLocation,
  WidgetScope,
  WidgetInstance,
  WidgetRenderContext,
  WidgetExecutionResult,
} from './types/WidgetTypes';

export {
  createDefaultExecutionParams,
  mergeExecutionParams,
} from './types/ExecutionParams';

export {
  registerWidget,
  registerWidgets,
  unregisterWidget,
  clearRegistry,
  getWidgetDefinition,
  findWidgetDefinition,
  hasWidget,
  getRegisteredWidgetIds,
  getAllWidgets,
  getWidgetsByCategory,
  getWidgetsByAccess,
  getAvailableWidgets,
  getFilteredWidgets,
  getRegistryStats,
  debugRegistry,
} from './registry/widgetRegistry';

export {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  WARNING_THRESHOLD,
  withLimit,
  isLargeRequest,
  getLargeRequestWarning,
  applyQueryLimit,
  truncateData,
  wasResultTruncated,
  getTruncationMessage,
} from './utils/withLimit';

export {
  adaptLegacyWidget,
  adaptAndRegisterLegacyWidgets,
} from './utils/widgetAdapter';

export type {
  OldWidgetDefinition,
  OldWidgetCalculateParams,
} from './utils/widgetAdapter';

export { WidgetInstanceRenderer } from './components/WidgetInstanceRenderer';
