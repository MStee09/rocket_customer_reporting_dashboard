// src/ai/index.ts
// Main AI module exports

export { AIService, getAIService, aiService } from './service';

export type {
  AIContext,
  AIRequest,
  AIResponse,
  Message,
  SchemaContext,
  SchemaField,
  DataProfile,
  KnowledgeContext,
  TermDefinition,
  CalculationDefinition,
  ProductMapping,
  BusinessRule,
  KnowledgeDocument,
  CustomerIntelligenceProfile,
  LearningExtraction,
  ValidationResult,
  AccessControlResult,
} from './types';

export {
  compileSchemaContext,
  formatSchemaForPrompt,
  getAvailableFields,
  compileKnowledgeContext,
  formatKnowledgeForPrompt,
} from './compiler';

export {
  getPromptAccessInstructions,
  enforceAccessControl,
  isFieldAccessible,
  validateReportOutput,
} from './policies';

export {
  extractLearnings,
  saveCustomerLearnings,
  getCustomerProfile,
  formatProfileForPrompt,
} from './learning';
