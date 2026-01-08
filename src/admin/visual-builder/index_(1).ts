/**
 * Visual Builder - Main Entry Point
 * 
 * Admin tool for creating widgets visually without code.
 */

// Types
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
} from './types/BuilderSchema';

export {
  createDefaultBuilderSchema,
  validateBuilderSchema,
} from './types/BuilderSchema';

// Logic
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
  AVAILABLE_FIELDS,
} from './logic/aiCompilation';

// Context
export {
  BuilderProvider,
  useBuilder,
  loadDraftFromStorage,
  clearDraftFromStorage,
} from './components/BuilderContext';

// Components
export { VisualBuilderPage } from './components/VisualBuilderPage';
export { VisualizationPanel } from './components/panels/VisualizationPanel';
export { FieldMappingPanel } from './components/panels/FieldMappingPanel';
export { LogicPanel } from './components/panels/LogicPanel';
export { PreviewPanel } from './components/panels/PreviewPanel';
export { PublishPanel } from './components/panels/PublishPanel';
