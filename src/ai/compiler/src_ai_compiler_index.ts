// src/ai/compiler/index.ts

export {
  compileSchemaContext,
  formatSchemaForPrompt,
  getAvailableFields,
  isFieldAvailable,
  isFieldGroupable,
  isFieldAggregatable,
} from './schemaCompiler';

export {
  compileKnowledgeContext,
  formatKnowledgeForPrompt,
} from './knowledgeCompiler';
