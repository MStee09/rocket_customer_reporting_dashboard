import { useState, useEffect, useMemo } from 'react';
import { Loader2, AlertCircle, Table as TableIcon, ArrowUp, ArrowDown, ArrowUpDown, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import FilterSummary from './reports/FilterSummary';
import { SimpleReportConfig } from '../types/reports';
import { executeSimpleReport } from '../utils/simpleQueryBuilder';
import { getColumnById } from '../config/reportColumns';
import { useAuth } from '../contexts/AuthContext';
import { useLookupTables } from '../hooks/useLookupTables';
import { ExportMenu } from './ui/ExportMenu';
import { ColumnConfig } from '../services/exportService';
import { AIVisualizationStudio, VisualizationConfig } from './ai-studio';

interface SimpleReportViewerProps {
  config: SimpleReportConfig;
  customerId?: string;
  onDataLoad?: (data: Record<string, unknown>[]) => void;
}

export default function SimpleReportViewer({ config, customerId, onDataLoad }: SimpleReportViewerProps) {
  const { isAdmin, isViewingAsCustomer } = useAuth();
  const canSeeAdminColumns = isAdmin() && !isViewingAsCustomer;
  const { lookups, loading: lookupsLoading } = useLookupTables();

  const filteredConfig = useMemo(() => {
    const filtered = { ...config };
    filtered.columns = config.columns.filter(col => {
      const columnDef = getColumnById(col.id);
      if (columnDef?.adminOnly && !canSeeAdminColumns) {
        return false;
      }
      return true;
    });
    return filtered;
  }, [config, canSeeAdminColumns]);

  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showVisualizationStudio, setShowVisualizationStudio] = useState(false);

  const configKey = useMemo(() => {
    return JSON.stringify({
      id: config.id,
      columns: filteredConfig.columns,
      isSummary: filteredConfig.isSummary,
      groupBy: filteredConfig.groupBy,
      filters: filteredConfig.filters,
      sorts: filteredConfig.sorts,
    });
  }, [filteredConfig]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configKey, customerId]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await executeSimpleReport(filteredConfig, customerId);
      setData(result);
      onDataLoad?.(result);
    } catch (err: any) {
      console.error('Error loading report data:', err);
      setError(err.message || 'Failed to load report data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumn(columnId);
      setSortDirection('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortColumn || !data) return data;

    const column = getColumnById(sortColumn);
    if (!column) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      if (aVal === null || aVal === undefined) return sortDirection === 'asc' ? 1 : -1;
      if (bVal === null || bVal === undefined) return sortDirection === 'asc' ? -1 : 1;

      if (column.type === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      if (column.type === 'date') {
        return sortDirection === 'asc'
          ? new Date(aVal).getTime() - new Date(bVal).getTime()
          : new Date(bVal).getTime() - new Date(aVal).getTime();
      }

      const strA = String(aVal).toLowerCase();
      const strB = String(bVal).toLowerCase();
      if (sortDirection === 'asc') {
        return strA.localeCompare(strB);
      }
      return strB.localeCompare(strA);
    });
  }, [data, sortColumn, sortDirection]);

  const exportColumns: ColumnConfig[] = useMemo(() => {
    return filteredConfig.columns.map(col => {
      const columnDef = getColumnById(col.id);
      let format: ColumnConfig['format'] = 'text';

      if (columnDef?.type === 'number') {
        format = columnDef.format === 'currency' ? 'currency' : 'number';
      } else if (columnDef?.type === 'date') {
        format = 'date';
      }

      return {
        key: col.id,
        header: col.label,
        format,
        width: 15
      };
    });
  }, [filteredConfig.columns]);

  const handleAddVisualization = (vizConfig: VisualizationConfig) => {
    console.log('Adding visualization to report:', vizConfig);
    setShowVisualizationStudio(false);
  };

  const formatValue = (value: any, columnDef?: { type?: string; format?: string; id?: string }): string => {
    if (value === null || value === undefined) return 'N/A';

    const type = columnDef?.type;
    const formatType = columnDef?.format;
    const columnId = columnDef?.id;

    if (type === 'lookup' && lookups) {
      const numVal = typeof value === 'number' ? value : parseInt(String(value), 10);
      if (columnId === 'mode_id') {
        return lookups.modes.get(numVal)?.code || lookups.modes.get(numVal)?.name || String(value);
      }
      if (columnId === 'status_id') {
        return lookups.statuses.get(numVal)?.code || lookups.statuses.get(numVal)?.name || String(value);
      }
      if (columnId === 'equipment_type_id') {
        return lookups.equipmentTypes.get(numVal)?.code || lookups.equipmentTypes.get(numVal)?.name || String(value);
      }
      return String(value);
    }

    switch (type) {
      case 'number':
        if (formatType === 'currency') {
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }).format(value);
        } else if (formatType === 'integer') {
          return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
            useGrouping: false
          }).format(value);
        } else {
          return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }).format(value);
        }
      case 'date':
        try {
          return format(new Date(value), 'MMM dd, yyyy');
        } catch {
          return value;
        }
      case 'boolean':
        return value ? 'Yes' : 'No';
      default:
        return String(value);
    }
  };

  if (isLoading || lookupsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-12 h-12 text-rocket-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-red-200 p-12 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-800 mb-2">Error Loading Report</h3>
        <p className="text-gray-600 mb-6">{error}</p>
        <button
          onClick={loadData}
          className="px-6 py-2 bg-rocket-600 hover:bg-rocket-700 text-white font-medium rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
        <TableIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-800 mb-2">No Data Available</h3>
        <p className="text-gray-600">
          No data found matching your report criteria.
        </p>
      </div>
    );
  }

  return (
    <div data-report-content className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {data.length} row{data.length !== 1 ? 's' : ''} returned
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowVisualizationStudio(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-lg transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Add Visualization
          </button>
          <ExportMenu
            data={data}
            columns={exportColumns}
            filename={filteredConfig.name}
            title={filteredConfig.name}
          />
        </div>
      </div>

      <FilterSummary filters={filteredConfig.filters || []} />

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {filteredConfig.columns.map((col) => (
                  <th
                    key={col.id}
                    onClick={() => handleSort(col.id)}
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
                  >
                    <div className="flex items-center gap-2">
                      <span>{col.label}</span>
                      {sortColumn === col.id ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-4 h-4 text-rocket-600" />
                        ) : (
                          <ArrowDown className="w-4 h-4 text-rocket-600" />
                        )
                      ) : (
                        <ArrowUpDown className="w-4 h-4 text-gray-400" />
                      )}
                      {col.aggregation && (
                        <span className="ml-1 text-rocket-600 normal-case">({col.aggregation})</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedData.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-50 transition-colors">
                  {filteredConfig.columns.map((col) => {
                    const columnDef = getColumnById(col.id);
                    const value = row[col.id];

                    return (
                      <td key={col.id} className="px-6 py-4 text-sm text-gray-900">
                        {formatValue(value, columnDef ? { type: columnDef.type, format: columnDef.format, id: columnDef.id } : undefined)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredConfig.isSummary && filteredConfig.groupBy && filteredConfig.groupBy.length > 0 && (
        <div className="bg-rocket-50 border border-rocket-200 rounded-lg p-4">
          <p className="text-sm text-rocket-800">
            <strong>Summary Report:</strong> Data is grouped by{' '}
            {filteredConfig.groupBy.map(id => getColumnById(id)?.label).join(', ')}
          </p>
        </div>
      )}

      <AIVisualizationStudio
        isOpen={showVisualizationStudio}
        onClose={() => setShowVisualizationStudio(false)}
        reportData={data}
        availableColumns={filteredConfig.columns.map(c => c.id)}
        reportName={filteredConfig.name}
        reportId={filteredConfig.id}
        onAddVisualization={handleAddVisualization}
      />
    </div>
  );
}
