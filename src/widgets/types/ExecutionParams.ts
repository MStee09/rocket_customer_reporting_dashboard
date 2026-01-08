/**
 * ExecutionParams - Canonical execution parameters for all widgets
 *
 * This is the single source of truth for widget execution context.
 * Used by:
 * - Widget calculate() functions
 * - Raw data views
 * - Scheduled reports
 * - CSV exports
 */

export interface DateRange {
  start: string; // ISO date string (YYYY-MM-DD)
  end: string;   // ISO date string (YYYY-MM-DD)
}

export interface ExecutionParams {
  /** Required: Date range for data filtering */
  dateRange: DateRange;

  /** Optional: Additional filters (carrier, mode, state, etc.) */
  filters?: Record<string, string | number | boolean | string[]>;

  /** Optional: Maximum rows to return (default: 1000, max: 10000) */
  limit?: number;

  /** Optional: Sort configuration */
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };

  /** Optional: Comparison period for trend calculations */
  comparisonPeriod?: DateRange;
}

/**
 * Default execution params factory
 */
export function createDefaultExecutionParams(overrides?: Partial<ExecutionParams>): ExecutionParams {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return {
    dateRange: {
      start: thirtyDaysAgo.toISOString().split('T')[0],
      end: now.toISOString().split('T')[0],
    },
    limit: 1000,
    ...overrides,
  };
}

/**
 * Merge execution params with instance defaults
 */
export function mergeExecutionParams(
  defaults: Partial<ExecutionParams>,
  overrides: Partial<ExecutionParams>
): ExecutionParams {
  return {
    dateRange: overrides.dateRange || defaults.dateRange || createDefaultExecutionParams().dateRange,
    filters: { ...defaults.filters, ...overrides.filters },
    limit: overrides.limit ?? defaults.limit ?? 1000,
    sort: overrides.sort || defaults.sort,
    comparisonPeriod: overrides.comparisonPeriod || defaults.comparisonPeriod,
  };
}
