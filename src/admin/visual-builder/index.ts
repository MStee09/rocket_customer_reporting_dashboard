export type {
  VisualizationType,
  GeoMapKey,
  VisualizationConfig,
  FilterOperator,
  FilterBlock,
  AILogicBlock,
  CompiledRule,
  LogicBlock,
  PublishConfig,
  VisualBuilderSchema,
  ValidationResult,
  CustomerScope,
  ChartTypeAvailability,
} from './types/BuilderSchema';

export {
  createDefaultBuilderSchema,
  validateBuilderSchema,
  getChartTypeAvailability,
} from './types/BuilderSchema';

export {
  compileLogicBlocks,
  applyFiltersToQuery,
  createFilterBlock,
  createAILogicBlock,
  serializeLogicBlocks,
  deserializeLogicBlocks,
} from './logic/compileLogic';

export {
  compileAILogic,
  parseSimpleLogic,
  updateAIBlockWithCompilation,
  AVAILABLE_FIELDS,
} from './logic/aiCompilation';

export {
  BuilderProvider,
  useBuilder,
  loadDraftFromStorage,
  clearDraftFromStorage,
} from './components/BuilderContext';

export { VisualBuilderV5 as VisualBuilderPage } from './components/visualbuilderv5';
export { CustomerScopeSelector } from './components/CustomerScopeSelector';
export { ChartTypeSelector } from './components/ChartTypeSelector';
export { DateRangeDisplay } from './components/DateRangeDisplay';
export { ProductTagInput } from './components/ProductTagInput';

export { VisualizationPanel } from './components/panels/VisualizationPanel';
export { FieldMappingPanel } from './components/panels/FieldMappingPanel';
export { LogicPanel } from './components/panels/LogicPanel';
export { PreviewPanel } from './components/panels/PreviewPanel';
export { PublishPanel } from './components/panels/PublishPanel';

export type {
  WidgetQueryFilter,
  WidgetQueryAggregation,
  WidgetQueryJoin,
  WidgetQueryConfig,
  ChartType,
  VisualizationConfig as VisualizationConfigV3,
  WidgetVisibility,
  WidgetPlacement,
  WidgetDefinitionV3,
  BuilderMode,
  BuilderStep,
  AIResult,
  BuilderState,
  BuilderAction,
} from './types/BuilderSchemaV3';

export {
  initialBuilderState,
  builderReducer,
  buildQueryConfig,
  buildWidgetDefinition,
} from './types/BuilderSchemaV3';

export { BuilderProviderV3, useBuilderV3 } from './components/BuilderContextV3';

export type {
  ReasoningStep,
  AIWidgetSuggestion,
  AIInvestigationResult,
} from './hooks/useVisualBuilderAI';

export { useVisualBuilderAI } from './hooks/useVisualBuilderAI';

export type {
  TableInfo,
  FieldInfo,
  JoinInfo,
} from './hooks/useDynamicSchema';

export { useDynamicSchema } from './hooks/useDynamicSchema';

export type {
  DateRange,
  QueryExecutionContext,
  QueryResult,
} from './hooks/useWidgetQuery';

export { useWidgetQuery, executeWidgetQuery } from './hooks/useWidgetQuery';

export { PublishPanelV3 } from './components/PublishPanelV3';
export { VisualBuilderPageV3 } from './components/VisualBuilderPageV3';
export { VisualBuilderV4 } from './components/visualbuilderv4';
export { VisualBuilderV5 } from './components/visualbuilderv5';
