// src/ai/types.ts
// AI Service Type Definitions

import { AIReportDefinition } from '../types/aiReport';

// ============================================================================
// CONTEXT TYPES
// ============================================================================

export interface AIContext {
  customerId: string;
  customerName?: string;
  isAdmin: boolean;
  schema: SchemaContext;
  knowledge: KnowledgeContext;
  customerProfile: CustomerIntelligenceProfile | null;
  currentReport?: AIReportDefinition;
}

export interface SchemaContext {
  fields: SchemaField[];
  dataProfile: DataProfile;
}

export interface SchemaField {
  name: string;
  type: string;
  isGroupable: boolean;
  isAggregatable: boolean;
  businessContext?: string;
  aiInstructions?: string;
  adminOnly?: boolean;
}

export interface DataProfile {
  totalShipments: number;
  stateCount: number;
  carrierCount: number;
  monthsOfData: number;
  topStates: string[];
  topCarriers: string[];
  avgShipmentsPerDay: number;
  hasCanadaData?: boolean;
  dateRange?: { min: string; max: string };
}

export interface KnowledgeContext {
  terms: TermDefinition[];
  calculations: CalculationDefinition[];
  products: ProductMapping[];
  rules: BusinessRule[];
  documents: KnowledgeDocument[];
}

export interface TermDefinition {
  key: string;
  label?: string;
  definition: string;
  aiInstructions?: string;
  scope: 'global' | 'customer';
  aliases?: string[];
}

export interface CalculationDefinition {
  key: string;
  label?: string;
  definition: string;
  formula?: string;
  aiInstructions?: string;
}

export interface ProductMapping {
  name: string;
  keywords: string[];
  searchField: string;
}

export interface BusinessRule {
  key: string;
  definition: string;
  aiInstructions?: string;
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  description?: string;
  category: string;
  scope: 'global' | 'customer';
  extractedText?: string;
  priority: number;
}

// ============================================================================
// CUSTOMER INTELLIGENCE TYPES
// ============================================================================

export interface CustomerIntelligenceProfile {
  customerId: number;
  priorities: string[];
  products: CustomerProductMapping[];
  keyMarkets: string[];
  terminology: CustomerTermMapping[];
  benchmarkPeriod?: string;
  accountNotes?: string;
  preferences: CustomerPreferences;
  operationalProfile: OperationalProfile;
}

export interface CustomerProductMapping {
  name: string;
  keywords: string[];
  field: string;
}

export interface CustomerTermMapping {
  term: string;
  means: string;
  source: 'admin' | 'learned';
}

export interface CustomerPreferences {
  chartTypes?: Record<string, number>;
  commonQueries?: string[];
  focusAreas?: Record<string, number>;
}

export interface OperationalProfile {
  avgShipmentsPerDay: number;
  peakDays?: string[];
  topLanes?: string[];
  carrierMix?: Record<string, number>;
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIRequest {
  prompt: string;
  conversationHistory: Message[];
  context: AIContext;
}

export interface AIResponse<T> {
  success: boolean;
  data?: T;
  message: string;
  learnings?: LearningExtraction[];
  validationErrors?: string[];
}

// ============================================================================
// LEARNING TYPES
// ============================================================================

export interface LearningExtraction {
  type: 'terminology' | 'product' | 'preference' | 'correction';
  key: string;
  value: string;
  confidence: number;
  source: 'explicit' | 'inferred';
}

export interface LearningFlag {
  term: string;
  userSaid?: string;
  aiUnderstood?: string;
  confidence?: string;
  suggestedScope?: string;
  suggestedCategory?: string;
  mapsToField?: string;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  fixedReport?: AIReportDefinition;
}

export interface AccessControlResult {
  allowed: boolean;
  sanitizedReport?: AIReportDefinition;
  violations?: string[];
}

export interface AccessRule {
  field: string;
  requiredRole: 'admin';
  action: 'hide' | 'redact';
}

export interface AccessContext {
  isAdmin: boolean;
  customerId: string;
}
