/**
 * Logic Compiler
 * 
 * Compiles LogicBlocks into ExecutionParams filters.
 * 
 * KEY PRINCIPLE: AI runs at authoring time, execution is deterministic.
 * 
 * When an AI logic block is used:
 * 1. Admin writes a prompt like "Only include top 5 carriers by volume"
 * 2. AI compiles this to a deterministic rule: { field: 'carrier_name', operator: 'in', value: ['FedEx', 'UPS', ...] }
 * 3. At runtime, only the compiled rule executes - no AI involved
 */

import type { 
  LogicBlock, 
  FilterBlock, 
  AILogicBlock, 
  CompiledRule,
  FilterOperator 
} from '../types/BuilderSchema';
import type { ExecutionParams } from '../../../widgets/types/ExecutionParams';

// =============================================================================
// FILTER COMPILATION
// =============================================================================

interface CompiledFilter {
  field: string;
  operator: FilterOperator;
  value: string | number | boolean | string[];
}

/**
 * Compile a single filter block to a filter object
 */
function compileFilterBlock(block: FilterBlock): CompiledFilter | null {
  if (!block.enabled) return null;
  if (!block.field || block.value === undefined || block.value === null) return null;

  return {
    field: block.field,
    operator: block.operator,
    value: block.value,
  };
}

/**
 * Compile an AI logic block's compiled rule to filters
 */
function compileAIBlock(block: AILogicBlock): CompiledFilter[] {
  if (!block.enabled) return [];
  if (!block.compiledRule) return [];
  if (block.status !== 'compiled') return [];

  return block.compiledRule.filters.map(f => ({
    field: f.field,
    operator: f.operator,
    value: f.value,
  }));
}

// =============================================================================
// MAIN COMPILER
// =============================================================================

/**
 * Compile all logic blocks into ExecutionParams
 * 
 * This merges:
 * 1. Base execution params (date range, limit)
 * 2. Filter blocks (user-defined filters)
 * 3. AI blocks (pre-compiled deterministic rules)
 */
export function compileLogicBlocks(
  blocks: LogicBlock[],
  baseParams: ExecutionParams
): ExecutionParams {
  // Start with base params
  const compiledParams: ExecutionParams = {
    ...baseParams,
    filters: { ...baseParams.filters },
  };

  // Process each block
  for (const block of blocks) {
    if (block.type === 'filter') {
      const compiled = compileFilterBlock(block);
      if (compiled) {
        compiledParams.filters = {
          ...compiledParams.filters,
          [compiled.field]: {
            op: compiled.operator,
            value: compiled.value,
          },
        };
      }
    }

    if (block.type === 'ai') {
      const compiledFilters = compileAIBlock(block);
      for (const filter of compiledFilters) {
        compiledParams.filters = {
          ...compiledParams.filters,
          [filter.field]: {
            op: filter.operator,
            value: filter.value,
          },
        };
      }
    }
  }

  return compiledParams;
}

// =============================================================================
// FILTER APPLICATION (for Supabase queries)
// =============================================================================

/**
 * Apply compiled filters to a Supabase query
 * 
 * @example
 * let query = supabase.from('shipments').select('*');
 * query = applyFiltersToQuery(query, compiledParams.filters);
 */
export function applyFiltersToQuery<T extends { 
  eq: (col: string, val: any) => T;
  neq: (col: string, val: any) => T;
  gt: (col: string, val: any) => T;
  gte: (col: string, val: any) => T;
  lt: (col: string, val: any) => T;
  lte: (col: string, val: any) => T;
  like: (col: string, val: any) => T;
  in: (col: string, val: any[]) => T;
}>(
  query: T,
  filters?: Record<string, { op: string; value: any }>
): T {
  if (!filters) return query;

  let result = query;

  for (const [field, filter] of Object.entries(filters)) {
    const { op, value } = filter;

    switch (op) {
      case 'eq':
        result = result.eq(field, value);
        break;
      case 'neq':
        result = result.neq(field, value);
        break;
      case 'gt':
        result = result.gt(field, value);
        break;
      case 'gte':
        result = result.gte(field, value);
        break;
      case 'lt':
        result = result.lt(field, value);
        break;
      case 'lte':
        result = result.lte(field, value);
        break;
      case 'contains':
        result = result.like(field, `%${value}%`);
        break;
      case 'in':
        if (Array.isArray(value)) {
          result = result.in(field, value);
        }
        break;
      case 'not_in':
        // Supabase doesn't have direct not_in, would need raw SQL
        console.warn('not_in operator not directly supported');
        break;
    }
  }

  return result;
}

// =============================================================================
// BLOCK FACTORIES
// =============================================================================

/**
 * Create a new filter block
 */
export function createFilterBlock(
  field: string = '',
  operator: FilterOperator = 'eq',
  value: any = ''
): FilterBlock {
  return {
    id: crypto.randomUUID(),
    type: 'filter',
    field,
    operator,
    value,
    enabled: true,
  };
}

/**
 * Create a new AI logic block
 */
export function createAILogicBlock(prompt: string = ''): AILogicBlock {
  return {
    id: crypto.randomUUID(),
    type: 'ai',
    prompt,
    status: 'pending',
    enabled: true,
  };
}

// =============================================================================
// SERIALIZATION
// =============================================================================

/**
 * Serialize logic blocks for database storage
 */
export function serializeLogicBlocks(blocks: LogicBlock[]): string {
  return JSON.stringify(blocks);
}

/**
 * Deserialize logic blocks from database
 */
export function deserializeLogicBlocks(json: string | null): LogicBlock[] {
  if (!json) return [];
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}
