import { supabase } from '../lib/supabase';

export interface ColumnSchema {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  ordinal_position: number;
}

export interface TableSchema {
  table_name: string;
  columns: ColumnSchema[];
}

interface SchemaRpcRow extends ColumnSchema {
  table_name: string;
}

const SHIPMENT_TABLES = [
  'shipment',
  'shipment_accessorial',
  'shipment_item',
  'shipment_address',
  'shipment_carrier',
  'shipment_detail',
  'shipment_note'
];

let schemaCache: Map<string, TableSchema> | null = null;

export async function loadAllShipmentSchemas(): Promise<Map<string, TableSchema>> {
  if (schemaCache) {
    return schemaCache;
  }

  const { data, error } = await supabase.rpc('get_table_schemas', {
    table_names: SHIPMENT_TABLES
  });

  if (error) {
    console.warn('Failed to load schemas from RPC, falling back to information_schema query:', error);
    return loadSchemasFromInformationSchema();
  }

  const schemaMap = new Map<string, TableSchema>();

  if (data) {
    const rows = data as SchemaRpcRow[];
    SHIPMENT_TABLES.forEach(tableName => {
      const tableColumns = rows.filter(col => col.table_name === tableName);
      if (tableColumns.length > 0) {
        schemaMap.set(tableName, {
          table_name: tableName,
          columns: tableColumns.map(col => ({
            column_name: col.column_name,
            data_type: col.data_type,
            is_nullable: col.is_nullable,
            column_default: col.column_default,
            ordinal_position: col.ordinal_position
          }))
        });
      }
    });
  }

  schemaCache = schemaMap;
  return schemaMap;
}

async function loadSchemasFromInformationSchema(): Promise<Map<string, TableSchema>> {
  const schemaMap = new Map<string, TableSchema>();

  for (const tableName of SHIPMENT_TABLES) {
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default, ordinal_position')
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
      .order('ordinal_position');

    if (!error && data) {
      schemaMap.set(tableName, {
        table_name: tableName,
        columns: data as ColumnSchema[]
      });
    }
  }

  schemaCache = schemaMap;
  return schemaMap;
}

export function getSchemaForTable(tableName: string, schemas: Map<string, TableSchema>): TableSchema | null {
  return schemas.get(tableName) || null;
}

export function mergeSchemaWithData(schema: TableSchema | null, data: Record<string, unknown>[]): { columns: string[], hasData: Set<string> } {
  if (!schema) {
    const allKeys = new Set<string>();
    data.forEach(row => {
      Object.keys(row).forEach(key => allKeys.add(key));
    });
    return {
      columns: Array.from(allKeys).sort(),
      hasData: allKeys
    };
  }

  const columnNames = schema.columns
    .sort((a, b) => a.ordinal_position - b.ordinal_position)
    .map(col => col.column_name);

  const dataKeys = new Set<string>();
  data.forEach(row => {
    Object.keys(row).forEach(key => dataKeys.add(key));
  });

  return {
    columns: columnNames,
    hasData: dataKeys
  };
}

export function getColumnMetadata(columnName: string, schema: TableSchema | null): ColumnSchema | null {
  if (!schema) return null;
  return schema.columns.find(col => col.column_name === columnName) || null;
}
