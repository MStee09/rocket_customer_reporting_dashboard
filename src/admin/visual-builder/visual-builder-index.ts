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

export { UnifiedVisualBuilderPage as VisualBuilderPage } from './components/UnifiedVisualBuilderPage';
export { CustomerScopeSelector } from './components/CustomerScopeSelector';
export { ChartTypeSelector } from './components/ChartTypeSelector';
export { DateRangeDisplay } from './components/DateRangeDisplay';
export { ProductTagInput } from './components/ProductTagInput';

export { VisualizationPanel } from './components/panels/VisualizationPanel';
export { FieldMappingPanel } from './components/panels/FieldMappingPanel';
export { LogicPanel } from './components/panels/LogicPanel';
export { PreviewPanel } from './components/panels/PreviewPanel';
export { PublishPanel } from './components/panels/PublishPanel';
