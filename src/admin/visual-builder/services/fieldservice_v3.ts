/**
 * Field Service for Visual Builder
 * 
 * Provides dynamic field discovery from the centralized schema.
 * This replaces hardcoded field lists with a single source of truth.
 * 
 * LOCATION: /src/admin/visual-builder/services/fieldService.ts
 */

import { 
  ALL_FIELDS, 
  type FieldDefinition,
  type FieldType,
  type FieldCategory,
  getGroupableFields as schemaGetGroupableFields,
  getAggregatableFields as schemaGetAggregatableFields,
} from '../../../config/schema/fieldSchema';
import { supabase } from '../../../lib/supabase';
import type { BuilderFieldDefinition } from '../types/BuilderSchema';

// =============================================================================
// TYPE CONVERSION
// =============================================================================

function convertFieldType(type: FieldType): BuilderFieldDefinition['type'] {
  switch (type) {
    case 'currency':
      return 'currency';
    case 'number':
    case 'percentage':
      return 'number';
    case 'date':
      return 'date';
    case 'boolean':
      return 'boolean';
    case 'string':
    case 'lookup':
    default:
      return 'string';
  }
}

function categorizeField(field: FieldDefinition): BuilderFieldDefinition['category'] {
  if (field.type === 'date') return 'date';
  if (field.availableForAggregation) return 'measure';
  return 'dimension';
}

// =============================================================================
// FIELD CONVERSION
// =============================================================================

export function convertToBuilderField(field: FieldDefinition): BuilderFieldDefinition {
  return {
    name: field.column,
    label: field.label,
    type: convertFieldType(field.type),
    category: categorizeField(field),
    fieldCategory: field.category,
    description: field.description,
    isGroupable: field.availableForGrouping ?? false,
    isAggregatable: field.availableForAggregation ?? false,
    defaultAggregation: field.defaultAggregation,
  };
}

// =============================================================================
// FIELD GETTERS
// =============================================================================

export function getAllBuilderFields(isAdmin: boolean = true): BuilderFieldDefinition[] {
  const fields = isAdmin 
    ? ALL_FIELDS 
    : ALL_FIELDS.filter(f => !f.adminOnly);
  
  return fields.map(convertToBuilderField);
}

export function getDimensionFields(isAdmin: boolean = true): BuilderFieldDefinition[] {
  const fields = schemaGetGroupableFields().filter(f => isAdmin || !f.adminOnly);
  return fields.map(convertToBuilderField);
}

export function getMeasureFields(isAdmin: boolean = true): BuilderFieldDefinition[] {
  const fields = schemaGetAggregatableFields().filter(f => isAdmin || !f.adminOnly);
  return fields.map(convertToBuilderField);
}

export function getDateFields(isAdmin: boolean = true): BuilderFieldDefinition[] {
  const fields = ALL_FIELDS.filter(f => 
    f.type === 'date' && (isAdmin || !f.adminOnly)
  );
  return fields.map(convertToBuilderField);
}

export function getFieldsByCategory(
  category: FieldCategory, 
  isAdmin: boolean = true
): BuilderFieldDefinition[] {
  const fields = ALL_FIELDS.filter(f => 
    f.category === category && (isAdmin || !f.adminOnly)
  );
  return fields.map(convertToBuilderField);
}

export function getGeoFields(isAdmin: boolean = true): BuilderFieldDefinition[] {
  const geoFieldNames = [
    'origin_state', 'destination_state',
    'origin_city', 'destination_city',
    'origin_country', 'destination_country',
    'origin_postal_code', 'destination_postal_code',
  ];
  
  const fields = ALL_FIELDS.filter(f => 
    geoFieldNames.includes(f.column) && (isAdmin || !f.adminOnly)
  );
  return fields.map(convertToBuilderField);
}

export function getFieldByName(name: string): BuilderFieldDefinition | undefined {
  const field = ALL_FIELDS.find(f => f.column === name);
  return field ? convertToBuilderField(field) : undefined;
}

// =============================================================================
// FILTER COUNT SERVICE
// =============================================================================

interface FilterCountParams {
  dateRange: { start: string; end: string };
  filters: Array<{ field: string; operator: string; value: any }>;
}

export async function getFilteredRowCount(params: FilterCountParams): Promise<number | null> {
  try {
    let query = supabase
      .from('shipment_report_view')
      .select('*', { count: 'exact', head: true })
      .gte('created_date', params.dateRange.start)
      .lte('created_date', params.dateRange.end);
    
    for (const filter of params.filters) {
      const { field, operator, value } = filter;
      
      switch (operator) {
        case 'eq':
          query = query.eq(field, value);
          break;
        case 'neq':
          query = query.neq(field, value);
          break;
        case 'gt':
          query = query.gt(field, value);
          break;
        case 'gte':
          query = query.gte(field, value);
          break;
        case 'lt':
          query = query.lt(field, value);
          break;
        case 'lte':
          query = query.lte(field, value);
          break;
        case 'contains':
          query = query.ilike(field, `%${value}%`);
          break;
        case 'in':
          if (Array.isArray(value)) {
            query = query.in(field, value);
          }
          break;
        case 'is_null':
          query = query.is(field, null);
          break;
        case 'is_not_null':
          query = query.not(field, 'is', null);
          break;
      }
    }
    
    const { count, error } = await query;
    
    if (error) {
      console.error('Error getting filter count:', error);
      return null;
    }
    
    return count ?? 0;
  } catch (err) {
    console.error('Error getting filter count:', err);
    return null;
  }
}

// =============================================================================
// FIELD CATEGORIES FOR UI
// =============================================================================

export const FIELD_CATEGORY_INFO = [
  { id: 'dimension', label: 'Dimensions', description: 'Categorical fields for grouping' },
  { id: 'measure', label: 'Measures', description: 'Numeric fields for calculations' },
  { id: 'date', label: 'Dates', description: 'Date fields for time-based analysis' },
] as const;

export const FIELD_SUBCATEGORIES = [
  { id: 'identification', label: 'IDs & References', icon: 'Hash' },
  { id: 'classification', label: 'Classification', icon: 'Tag' },
  { id: 'dates', label: 'Dates', icon: 'Calendar' },
  { id: 'customer', label: 'Customer', icon: 'Building' },
  { id: 'locations', label: 'Locations', icon: 'MapPin' },
  { id: 'financial', label: 'Financial', icon: 'DollarSign' },
  { id: 'operational', label: 'Operational', icon: 'Truck' },
  { id: 'carrier', label: 'Carrier', icon: 'Truck' },
  { id: 'items', label: 'Items', icon: 'Package' },
  { id: 'accessorials', label: 'Accessorials', icon: 'Plus' },
] as const;

// =============================================================================
// AGGREGATION OPTIONS
// =============================================================================

export const AGGREGATION_OPTIONS = [
  { value: 'sum', label: 'Sum', description: 'Total of all values' },
  { value: 'avg', label: 'Average', description: 'Mean of all values' },
  { value: 'count', label: 'Count', description: 'Number of records' },
  { value: 'min', label: 'Minimum', description: 'Smallest value' },
  { value: 'max', label: 'Maximum', description: 'Largest value' },
] as const;

// =============================================================================
// OPERATOR OPTIONS
// =============================================================================

export const FILTER_OPERATORS = [
  { value: 'eq', label: 'equals', types: ['string', 'number', 'boolean', 'date', 'currency'] },
  { value: 'neq', label: 'does not equal', types: ['string', 'number', 'boolean', 'date', 'currency'] },
  { value: 'gt', label: 'greater than', types: ['number', 'date', 'currency'] },
  { value: 'gte', label: 'greater than or equal', types: ['number', 'date', 'currency'] },
  { value: 'lt', label: 'less than', types: ['number', 'date', 'currency'] },
  { value: 'lte', label: 'less than or equal', types: ['number', 'date', 'currency'] },
  { value: 'contains', label: 'contains', types: ['string'] },
  { value: 'not_contains', label: 'does not contain', types: ['string'] },
  { value: 'starts_with', label: 'starts with', types: ['string'] },
  { value: 'ends_with', label: 'ends with', types: ['string'] },
  { value: 'in', label: 'is one of', types: ['string', 'number'] },
  { value: 'not_in', label: 'is not one of', types: ['string', 'number'] },
  { value: 'is_null', label: 'is empty', types: ['string', 'number', 'date', 'currency'] },
  { value: 'is_not_null', label: 'is not empty', types: ['string', 'number', 'date', 'currency'] },
  { value: 'between', label: 'is between', types: ['number', 'date', 'currency'] },
  // New OR-based operators
  { value: 'contains_any', label: 'contains any of', types: ['string'], description: 'Matches if field contains ANY of the specified values' },
  { value: 'contains_all', label: 'contains all of', types: ['string'], description: 'Matches if field contains ALL of the specified values' },
  { value: 'matches_any', label: 'matches any of', types: ['string', 'number'], description: 'Same as "is one of"' },
] as const;

export function getOperatorsForFieldType(fieldType: BuilderFieldDefinition['type']): typeof FILTER_OPERATORS[number][] {
  return FILTER_OPERATORS.filter(op => op.types.includes(fieldType));
}

// =============================================================================
// LEGACY COMPATIBILITY - Export for aiCompilation
// =============================================================================

export interface FieldInfo {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  sampleValues?: string[];
}

export function getAvailableFieldsForAI(): FieldInfo[] {
  return getAllBuilderFields(true).map(f => ({
    name: f.name,
    type: f.type === 'currency' ? 'number' : f.type as FieldInfo['type'],
    sampleValues: undefined,
  }));
}
