import { supabase } from './supabase';
import { TableMetadata } from '../types/database';

export async function fetchTablesAndViews(): Promise<TableMetadata[]> {
  try {
    const { data, error } = await supabase.rpc('get_tables_and_views');

    if (error) {
      const knownTables = [
        'role', 'user_roles', 'customer', 'carrier', 'shipment_status',
        'shipment_mode', 'equipment_type', 'shipment', 'shipment_stop',
        'shipment_document'
      ];

      const tables: TableMetadata[] = knownTables.map(name => ({
        name,
        type: 'table' as const,
        rowCount: null,
        isLoading: false
      }));

      return tables;
    }

    return data || [];
  } catch (err) {
    console.error('Error fetching tables and views:', err);
    return [];
  }
}

export async function getRowCount(tableName: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error(`Error getting row count for ${tableName}:`, error);
      return 0;
    }

    return count || 0;
  } catch (err) {
    console.error(`Error getting row count for ${tableName}:`, err);
    return 0;
  }
}

export async function fetchTableData(
  tableName: string,
  page: number = 1,
  pageSize: number = 10
) {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const [dataResult, countResult] = await Promise.all([
      supabase
        .from(tableName)
        .select('*')
        .range(from, to),
      supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })
    ]);

    if (dataResult.error) {
      throw dataResult.error;
    }

    const rows = dataResult.data || [];
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    const totalCount = countResult.count || 0;

    return {
      columns,
      rows,
      totalCount,
      currentPage: page,
      pageSize,
      error: undefined
    };
  } catch (err) {
    return {
      columns: [],
      rows: [],
      totalCount: 0,
      currentPage: page,
      pageSize,
      error: err instanceof Error ? err.message : 'Failed to fetch table data'
    };
  }
}

export async function verifyConnection(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('shipment')
      .select('load_id')
      .limit(1);

    return !error;
  } catch (err) {
    return false;
  }
}
