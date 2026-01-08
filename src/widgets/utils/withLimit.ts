/**
 * Large Data Safety Utilities
 *
 * Prevents browser crashes from accidentally fetching 100k+ rows.
 * Apply these to all widget executions and data fetches.
 */

import type { ExecutionParams } from '../types/ExecutionParams';

/** Default row limit for widget queries */
export const DEFAULT_LIMIT = 1000;

/** Maximum allowed limit (safety ceiling) */
export const MAX_LIMIT = 10000;

/** Warning threshold - show user a warning above this */
export const WARNING_THRESHOLD = 5000;

/**
 * Ensures execution params have a safe limit applied
 *
 * @example
 * const safeParams = withLimit(params);
 * const { data } = await supabase.from('shipments').select('*').limit(safeParams.limit);
 */
export function withLimit(params: ExecutionParams): ExecutionParams {
  const requestedLimit = params.limit ?? DEFAULT_LIMIT;
  const safeLimit = Math.min(Math.max(1, requestedLimit), MAX_LIMIT);

  return {
    ...params,
    limit: safeLimit,
  };
}

/**
 * Check if a limit is considered "large" (may be slow)
 */
export function isLargeRequest(limit: number): boolean {
  return limit > WARNING_THRESHOLD;
}

/**
 * Get a human-readable warning message for large requests
 */
export function getLargeRequestWarning(limit: number): string | null {
  if (!isLargeRequest(limit)) return null;
  return `Requesting ${limit.toLocaleString()} rows may take longer to load.`;
}

/**
 * Apply limit to a Supabase query builder
 *
 * @example
 * const query = supabase.from('shipments').select('*');
 * const limitedQuery = applyQueryLimit(query, params);
 */
export function applyQueryLimit<T extends { limit: (count: number) => T }>(
  query: T,
  params: ExecutionParams
): T {
  const safeParams = withLimit(params);
  return query.limit(safeParams.limit!);
}

/**
 * Truncate data array to safe limit (for post-fetch safety)
 */
export function truncateData<T>(data: T[], limit: number = DEFAULT_LIMIT): T[] {
  const safeLimit = Math.min(limit, MAX_LIMIT);
  return data.slice(0, safeLimit);
}

/**
 * Check if result was truncated
 */
export function wasResultTruncated(
  returnedCount: number,
  requestedLimit: number
): boolean {
  return returnedCount >= requestedLimit;
}

/**
 * Get truncation message for UI
 */
export function getTruncationMessage(
  returnedCount: number,
  requestedLimit: number
): string | null {
  if (!wasResultTruncated(returnedCount, requestedLimit)) return null;
  return `Showing ${returnedCount.toLocaleString()} of ${requestedLimit.toLocaleString()}+ results. Adjust filters to see more specific data.`;
}
