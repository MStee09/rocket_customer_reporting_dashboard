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
const SAMPLE_LIMIT = 1;
const DATA_LOOKBACK_DAYS = 90;

const SUPPORTED_TABLES = new Set([
  'shipment_report_view',
  'shipment',
  'customer',
  'carrier',
  'shipment_address',
  'shipment_item',
  'shipment_carrier',
]);

function getCacheKey(columnId: string, customerId: string): string {
  return `${columnId}_${customerId}`;
}

function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp < CACHE_TTL;
}

function formatSampleValue(value: any, columnType: string, columnFormat?: string, columnId?: string): string {
  if (value === null || value === undefined) return '';

  switch (columnType) {
    case 'number':
      const num = Number(value);
      if (isNaN(num)) return String(value);

      const isIdField = columnId?.endsWith('_id') || columnId === 'load_id';

      if (columnFormat === 'currency') {
        return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      } else if (isIdField) {
        return String(Math.round(num));
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
  const columnName = columnDef.column;
  const tableName = columnDef.table;

  let query: string;

  switch (tableName) {
    case 'shipment_report_view':
      query = `
        SELECT DISTINCT ${columnName} as sample_value, COUNT(*) as frequency
        FROM shipment_report_view
        WHERE customer_id = ${customerId}
          AND pickup_date >= '${lookbackDate}'
          AND ${columnName} IS NOT NULL
          AND CAST(${columnName} AS TEXT) != ''
        GROUP BY ${columnName}
        ORDER BY frequency DESC
        LIMIT ${SAMPLE_LIMIT}
      `;
      break;

    case 'shipment':
      query = `
        SELECT DISTINCT s.${columnName} as sample_value, COUNT(*) as frequency
        FROM shipment s
        WHERE s.customer_id = ${customerId}
          AND s.pickup_date >= '${lookbackDate}'
          AND s.${columnName} IS NOT NULL
          AND CAST(s.${columnName} AS TEXT) != ''
        GROUP BY s.${columnName}
        ORDER BY frequency DESC
        LIMIT ${SAMPLE_LIMIT}
      `;
      break;

    case 'customer':
      query = `
        SELECT DISTINCT ${columnName} as sample_value
        FROM customer
        WHERE customer_id = ${customerId}
          AND ${columnName} IS NOT NULL
          AND CAST(${columnName} AS TEXT) != ''
        LIMIT ${SAMPLE_LIMIT}
      `;
      break;

    case 'carrier':
      query = `
        SELECT DISTINCT c.${columnName} as sample_value, COUNT(*) as frequency
        FROM carrier c
        INNER JOIN shipment_report_view srv ON srv.carrier_id = c.carrier_id
        WHERE srv.customer_id = ${customerId}
          AND srv.pickup_date >= '${lookbackDate}'
          AND c.${columnName} IS NOT NULL
          AND CAST(c.${columnName} AS TEXT) != ''
        GROUP BY c.${columnName}
        ORDER BY frequency DESC
        LIMIT ${SAMPLE_LIMIT}
      `;
      break;

    case 'shipment_address':
      const addressType = columnId.startsWith('origin_') ? 'origin' : 'destination';
      query = `
        SELECT DISTINCT sa.${columnName} as sample_value, COUNT(*) as frequency
        FROM shipment_address sa
        INNER JOIN shipment s ON s.load_id = sa.load_id
        WHERE s.customer_id = ${customerId}
          AND s.pickup_date >= '${lookbackDate}'
          AND sa.address_type = '${addressType}'
          AND sa.${columnName} IS NOT NULL
          AND CAST(sa.${columnName} AS TEXT) != ''
        GROUP BY sa.${columnName}
        ORDER BY frequency DESC
        LIMIT ${SAMPLE_LIMIT}
      `;
      break;

    case 'shipment_item':
      query = `
        SELECT DISTINCT si.${columnName} as sample_value, COUNT(*) as frequency
        FROM shipment_item si
        INNER JOIN shipment s ON s.load_id = si.load_id
        WHERE s.customer_id = ${customerId}
          AND s.pickup_date >= '${lookbackDate}'
          AND si.${columnName} IS NOT NULL
          AND CAST(si.${columnName} AS TEXT) != ''
        GROUP BY si.${columnName}
        ORDER BY frequency DESC
        LIMIT ${SAMPLE_LIMIT}
      `;
      break;

    case 'shipment_carrier':
      query = `
        SELECT DISTINCT sc.${columnName} as sample_value, COUNT(*) as frequency
        FROM shipment_carrier sc
        INNER JOIN shipment s ON s.load_id = sc.load_id
        WHERE s.customer_id = ${customerId}
          AND s.pickup_date >= '${lookbackDate}'
          AND sc.${columnName} IS NOT NULL
          AND CAST(sc.${columnName} AS TEXT) != ''
        GROUP BY sc.${columnName}
        ORDER BY frequency DESC
        LIMIT ${SAMPLE_LIMIT}
      `;
      break;

    default:
      throw new Error(`Unsupported table: ${tableName}`);
  }

  return query.trim();
}

function canQueryColumn(columnId: string): boolean {
  const columnDef = getColumnById(columnId);
  if (!columnDef) return false;
  return SUPPORTED_TABLES.has(columnDef.table);
}

export function canShowSamples(columnId: string): boolean {
  return canQueryColumn(columnId);
}

export async function fetchColumnSamples(
  columnId: string,
  customerId: string
): Promise<string[]> {
  console.log('[ColumnSamples] Fetching samples for:', columnId, 'customerId:', customerId);

  if (!canQueryColumn(columnId)) {
    console.log('[ColumnSamples] Column not queryable, skipping:', columnId);
    return [];
  }

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
      console.error('[ColumnSamples] Database error:', error);
      throw new Error(`Database error: ${error.message || 'Failed to fetch sample data'}`);
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
        columnDef.format,
        columnId
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
