import { supabase } from '../lib/supabase';
import { getColumnById } from '../config/reportColumns';
import { format, subDays } from 'date-fns';

interface ColumnSample {
  values: string[];
  isLoading: boolean;
  error?: string;
}

interface CacheEntry {
  data: string[];
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000;
const SAMPLE_LIMIT = 10;
const DATA_LOOKBACK_DAYS = 90;

function getCacheKey(columnId: string, customerId: string): string {
  return `${columnId}_${customerId}`;
}

function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp < CACHE_TTL;
}

function formatSampleValue(value: any, columnType: string, columnFormat?: string): string {
  if (value === null || value === undefined) return '';

  switch (columnType) {
    case 'number':
      const num = Number(value);
      if (isNaN(num)) return String(value);

      if (columnFormat === 'currency') {
        return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      } else if (columnFormat === 'integer') {
        return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
      } else {
        return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
      }

    case 'date':
      try {
        const date = new Date(value);
        if (isNaN(date.getTime())) return String(value);
        return format(date, 'MMM d, yyyy');
      } catch {
        return String(value);
      }

    case 'boolean':
      return value ? 'Yes' : 'No';

    default:
      const str = String(value);
      return str.length > 50 ? str.substring(0, 47) + '...' : str;
  }
}

function buildSampleQuery(columnId: string, customerId: string): string {
  const columnDef = getColumnById(columnId);
  if (!columnDef) {
    throw new Error(`Column ${columnId} not found`);
  }

  const lookbackDate = format(subDays(new Date(), DATA_LOOKBACK_DAYS), 'yyyy-MM-dd');

  const columnName = columnId;

  const query = `
    SELECT DISTINCT ${columnName} as sample_value, COUNT(*) as frequency
    FROM shipment_report_view
    WHERE customer_id = ${customerId}
      AND pickup_date >= '${lookbackDate}'
      AND ${columnName} IS NOT NULL
      AND CAST(${columnName} AS TEXT) != ''
    GROUP BY ${columnName}
    ORDER BY frequency DESC, ${columnName}
    LIMIT ${SAMPLE_LIMIT}
  `;

  return query.trim();
}

export async function fetchColumnSamples(
  columnId: string,
  customerId: string
): Promise<string[]> {
  console.log('[ColumnSamples] Fetching samples for:', columnId, 'customerId:', customerId);

  const cacheKey = getCacheKey(columnId, customerId);

  const cached = cache.get(cacheKey);
  if (cached && isCacheValid(cached)) {
    console.log('[ColumnSamples] Returning cached data');
    return cached.data;
  }

  try {
    const columnDef = getColumnById(columnId);
    if (!columnDef) {
      throw new Error(`Column definition not found for ${columnId}`);
    }

    const query = buildSampleQuery(columnId, customerId);
    console.log('[ColumnSamples] Query:', query);

    const { data, error } = await supabase.rpc('execute_custom_query', {
      query_text: query
    });

    if (error) {
      console.error('[ColumnSamples] Error fetching column samples:', error);
      throw new Error('Failed to fetch sample data');
    }

    console.log('[ColumnSamples] Raw data:', data);

    if (!data || data.length === 0) {
      console.log('[ColumnSamples] No data found');
      cache.set(cacheKey, { data: [], timestamp: Date.now() });
      return [];
    }

    const samples = data
      .map((row: any) => formatSampleValue(
        row.sample_value,
        columnDef.type,
        columnDef.format
      ))
      .filter((val: string) => val.trim() !== '');

    console.log('[ColumnSamples] Formatted samples:', samples);
    cache.set(cacheKey, { data: samples, timestamp: Date.now() });
    return samples;

  } catch (error) {
    console.error('[ColumnSamples] Error in fetchColumnSamples:', error);
    throw error;
  }
}

export function clearColumnSampleCache(): void {
  cache.clear();
}

export function clearColumnSampleCacheForCustomer(customerId: string): void {
  const keysToDelete: string[] = [];
  cache.forEach((_, key) => {
    if (key.endsWith(`_${customerId}`)) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(key => cache.delete(key));
}
