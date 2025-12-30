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
  let selectExpr = '';
  let fromClause = 'shipment s';
  let whereClause = `s.customer_id = ${customerId} AND s.pickup_date >= '${lookbackDate}'`;
  let joinClauses = '';

  if (columnId.startsWith('origin_')) {
    joinClauses += `
      LEFT JOIN address origin_addr ON s.origin_address_id = origin_addr.address_id
    `;
    selectExpr = `origin_addr.${columnDef.column}`;
  } else if (columnId.startsWith('destination_')) {
    joinClauses += `
      LEFT JOIN address dest_addr ON s.destination_address_id = dest_addr.address_id
    `;
    selectExpr = `dest_addr.${columnDef.column}`;
  } else if (columnId.startsWith('carrier_')) {
    joinClauses += `
      LEFT JOIN carrier c ON s.carrier_id = c.carrier_id
    `;
    selectExpr = `c.${columnDef.column}`;
  } else if (columnDef.table === 'shipment_item') {
    joinClauses += `
      INNER JOIN shipment_item si ON s.load_id = si.load_id
    `;
    selectExpr = `si.${columnDef.column}`;
  } else if (columnDef.type === 'lookup' && columnDef.lookup) {
    const lookupTable = columnDef.lookup.table;
    const keyField = columnDef.lookup.keyField;
    const displayField = columnDef.lookup.displayField;

    joinClauses += `
      LEFT JOIN ${lookupTable} lt ON s.${columnDef.column} = lt.${keyField}
    `;
    selectExpr = `lt.${displayField}`;
  } else {
    selectExpr = `s.${columnDef.column}`;
  }

  const query = `
    SELECT DISTINCT ${selectExpr} as sample_value, COUNT(*) as frequency
    FROM ${fromClause}
    ${joinClauses}
    WHERE ${whereClause}
      AND ${selectExpr} IS NOT NULL
      AND ${selectExpr} != ''
    GROUP BY ${selectExpr}
    ORDER BY frequency DESC, ${selectExpr}
    LIMIT ${SAMPLE_LIMIT}
  `;

  return query.trim();
}

export async function fetchColumnSamples(
  columnId: string,
  customerId: string
): Promise<string[]> {
  const cacheKey = getCacheKey(columnId, customerId);

  const cached = cache.get(cacheKey);
  if (cached && isCacheValid(cached)) {
    return cached.data;
  }

  try {
    const columnDef = getColumnById(columnId);
    if (!columnDef) {
      throw new Error(`Column definition not found for ${columnId}`);
    }

    const query = buildSampleQuery(columnId, customerId);

    const { data, error } = await supabase.rpc('execute_custom_query', {
      query_text: query
    });

    if (error) {
      console.error('Error fetching column samples:', error);
      throw new Error('Failed to fetch sample data');
    }

    if (!data || data.length === 0) {
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

    cache.set(cacheKey, { data: samples, timestamp: Date.now() });
    return samples;

  } catch (error) {
    console.error('Error in fetchColumnSamples:', error);
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
