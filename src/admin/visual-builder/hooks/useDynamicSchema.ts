import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

export interface TableInfo {
  name: string;
  displayName: string;
  description: string;
  category: 'core' | 'reference' | 'analytics';
}

export interface FieldInfo {
  name: string;
  displayName: string;
  dataType: string;
  isGroupable: boolean;
  isAggregatable: boolean;
  isFilterable: boolean;
  tableName: string;
}

export interface JoinInfo {
  fromTable: string;
  toTable: string;
  fromField: string;
  toField: string;
  joinType: 'left' | 'inner';
  displayName: string;
}

interface TableRpcResponse {
  table_name: string;
  description: string | null;
  category: 'core' | 'reference' | 'analytics' | null;
}

interface FieldRpcResponse {
  field_name: string;
  display_name: string | null;
  data_type: string;
  is_groupable: boolean | null;
  is_aggregatable: boolean | null;
  is_filterable: boolean | null;
}

interface JoinRpcResponse {
  from_table: string;
  to_table: string;
  from_field: string;
  to_field: string;
  join_type: 'left' | 'inner' | null;
  display_name: string | null;
}

export function useDynamicSchema() {
  const { isAdmin } = useAuth();
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [fields, setFields] = useState<Record<string, FieldInfo[]>>({});
  const [joins, setJoins] = useState<Record<string, JoinInfo[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTables = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('mcp_get_tables', {
        p_category: null,
        p_include_row_counts: false,
      });

      if (error) throw error;

      const tableList: TableInfo[] = (data || []).map((t: TableRpcResponse) => ({
        name: t.table_name,
        displayName: t.table_name.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
        description: t.description || '',
        category: t.category || 'core',
      }));

      setTables(tableList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tables');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFieldsForTable = useCallback(async (tableName: string): Promise<FieldInfo[]> => {
    if (fields[tableName]) return fields[tableName];

    try {
      const { data, error } = await supabase.rpc('mcp_get_fields', {
        p_table_name: tableName,
        p_include_samples: false,
        p_admin_mode: isAdmin(),
      });

      if (error) throw error;

      const fieldList: FieldInfo[] = (data || []).map((f: FieldRpcResponse) => ({
        name: f.field_name,
        displayName: f.display_name || f.field_name.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
        dataType: f.data_type,
        isGroupable: f.is_groupable || false,
        isAggregatable: f.is_aggregatable || false,
        isFilterable: f.is_filterable !== false,
        tableName,
      }));

      setFields(prev => ({ ...prev, [tableName]: fieldList }));
      return fieldList;
    } catch (err) {
      console.error(`Failed to load fields for ${tableName}:`, err);
      return [];
    }
  }, [fields, isAdmin]);

  const loadJoinsForTable = useCallback(async (tableName: string): Promise<JoinInfo[]> => {
    if (joins[tableName]) return joins[tableName];

    try {
      const { data, error } = await supabase.rpc('mcp_get_table_joins', {
        p_table_name: tableName,
      });

      if (error) throw error;

      const joinList: JoinInfo[] = (data || []).map((j: JoinRpcResponse) => ({
        fromTable: j.from_table,
        toTable: j.to_table,
        fromField: j.from_field,
        toField: j.to_field,
        joinType: j.join_type || 'left',
        displayName: j.display_name || `Join to ${j.to_table}`,
      }));

      setJoins(prev => ({ ...prev, [tableName]: joinList }));
      return joinList;
    } catch (err) {
      console.error(`Failed to load joins for ${tableName}:`, err);
      return [];
    }
  }, [joins]);

  const getGroupableFields = useCallback((tableNames: string[]): FieldInfo[] => {
    const allFields: FieldInfo[] = [];
    for (const tableName of tableNames) {
      const tableFields = fields[tableName] || [];
      allFields.push(...tableFields.filter(f => f.isGroupable));
    }
    return allFields;
  }, [fields]);

  const getAggregatableFields = useCallback((tableNames: string[]): FieldInfo[] => {
    const allFields: FieldInfo[] = [];
    for (const tableName of tableNames) {
      const tableFields = fields[tableName] || [];
      allFields.push(...tableFields.filter(f => f.isAggregatable));
    }
    return allFields;
  }, [fields]);

  const getFilterableFields = useCallback((tableNames: string[]): FieldInfo[] => {
    const allFields: FieldInfo[] = [];
    for (const tableName of tableNames) {
      const tableFields = fields[tableName] || [];
      allFields.push(...tableFields.filter(f => f.isFilterable));
    }
    return allFields;
  }, [fields]);

  useEffect(() => {
    loadTables();
  }, [loadTables]);

  useEffect(() => {
    if (tables.length > 0 && !loading) {
      ['shipment', 'shipment_item', 'carrier', 'customer'].forEach(table => {
        if (!fields[table]) loadFieldsForTable(table);
        if (!joins[table]) loadJoinsForTable(table);
      });
    }
  }, [tables, loading, fields, joins, loadFieldsForTable, loadJoinsForTable]);

  return {
    tables,
    fields,
    joins,
    loading,
    error,
    loadTables,
    loadFieldsForTable,
    loadJoinsForTable,
    getGroupableFields,
    getAggregatableFields,
    getFilterableFields,
  };
}
