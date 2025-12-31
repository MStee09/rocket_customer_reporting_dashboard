import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, GripVertical, Plus, Package, DollarSign, MapPin, Flag, Truck, Box, Building, ChevronDown, ChevronRight, Filter, ArrowUpDown, Sparkles } from 'lucide-react';
import { COLUMN_CATEGORIES, getColumnsByCategory, getColumnById } from '../config/reportColumns';
import { SimpleReportColumn, SimpleReportBuilderState } from '../types/reports';
import { ColumnFilter, ColumnSort } from '../types/filters';
import { useAuth } from '../contexts/AuthContext';
import ColumnFilterSection from './reports/ColumnFilterSection';
import { ColumnPreviewTooltip } from './reports/ColumnPreviewTooltip';
import { buildEnhancementContext } from '../utils/reportEnhancementContext';
import { supabase } from '../lib/supabase';

interface SimpleReportBuilderProps {
  onClose: () => void;
  onSave: (config: SimpleReportBuilderState) => void;
  initialState?: Partial<SimpleReportBuilderState>;
  isInline?: boolean;
}

const categoryIcons = {
  Package,
  DollarSign,
  MapPin,
  Flag,
  Truck,
  Box,
  Building
};

const DEFAULT_LOAD_ID_COLUMN = {
  id: 'load_id',
  label: 'Load ID',
};

export default function SimpleReportBuilder({ onClose, onSave, initialState, isInline = false }: SimpleReportBuilderProps) {
  const navigate = useNavigate();
  const { isAdmin, isViewingAsCustomer, effectiveCustomerId } = useAuth();
  const canSeeAdminColumns = isAdmin() && !isViewingAsCustomer;

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const getInitialColumns = () => {
    if (initialState?.selectedColumns && initialState.selectedColumns.length > 0) {
      return initialState.selectedColumns;
    }
    return [DEFAULT_LOAD_ID_COLUMN];
  };

  const [state, setState] = useState<SimpleReportBuilderState>({
    name: initialState?.name || '',
    description: initialState?.description || '',
    selectedColumns: getInitialColumns(),
    isSummary: initialState?.isSummary || false,
    groupByColumns: initialState?.groupByColumns || [],
    visualization: initialState?.visualization || 'table',
    filters: initialState?.filters || [],
    sorts: initialState?.sorts || []
  });

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['shipment', 'financial'])
  );
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const columnButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const addColumn = (columnId: string) => {
    const column = getColumnById(columnId);
    if (!column) return;

    const newColumn: SimpleReportColumn = {
      id: column.id,
      label: column.label,
      aggregation: state.isSummary && column.aggregatable ? 'sum' : undefined
    };

    setState(prev => ({
      ...prev,
      selectedColumns: [...prev.selectedColumns, newColumn]
    }));
  };

  const removeColumn = (index: number) => {
    const columnId = state.selectedColumns[index]?.id;
    setState(prev => ({
      ...prev,
      selectedColumns: prev.selectedColumns.filter((_, i) => i !== index),
      filters: prev.filters?.filter(f => f.columnId !== columnId) || [],
      sorts: prev.sorts?.filter(s => s.columnId !== columnId) || []
    }));
  };

  const updateColumnAggregation = (index: number, aggregation: string) => {
    setState(prev => ({
      ...prev,
      selectedColumns: prev.selectedColumns.map((col, i) =>
        i === index ? { ...col, aggregation: aggregation as any } : col
      )
    }));
  };

  const getFiltersForColumn = (columnId: string): ColumnFilter[] => {
    return state.filters?.filter(f => f.columnId === columnId) || [];
  };

  const getSortForColumn = (columnId: string): ColumnSort | undefined => {
    return state.sorts?.find(s => s.columnId === columnId);
  };

  const updateFiltersForColumn = (columnId: string, filters: ColumnFilter[]) => {
    setState(prev => {
      const otherFilters = prev.filters?.filter(f => f.columnId !== columnId) || [];
      return { ...prev, filters: [...otherFilters, ...filters] };
    });
  };

  const updateSortForColumn = (columnId: string, sort: ColumnSort | undefined) => {
    setState(prev => {
      const otherSorts = prev.sorts?.filter(s => s.columnId !== columnId) || [];
      if (sort && sort.direction !== 'none') {
        return { ...prev, sorts: [...otherSorts, sort] };
      }
      return { ...prev, sorts: otherSorts };
    });
  };

  const totalActiveFilters = state.filters?.filter(f => f.enabled).length || 0;
  const totalSorts = state.sorts?.length || 0;

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const handleColumnHoverStart = (columnId: string, event: React.MouseEvent<HTMLButtonElement>) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();

    hoverTimeoutRef.current = setTimeout(() => {
      setTooltipPosition({
        top: rect.top,
        left: rect.right + 10
      });
      setHoveredColumn(columnId);
    }, 300);
  };

  const handleColumnHoverEnd = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setHoveredColumn(null);
    setTooltipPosition(null);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newColumns = [...state.selectedColumns];
    const draggedColumn = newColumns[draggedIndex];
    newColumns.splice(draggedIndex, 1);
    newColumns.splice(index, 0, draggedColumn);

    setState(prev => ({ ...prev, selectedColumns: newColumns }));
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const toggleSummaryMode = () => {
    setState(prev => ({
      ...prev,
      isSummary: !prev.isSummary,
      groupByColumns: !prev.isSummary ? [] : prev.groupByColumns,
      selectedColumns: prev.selectedColumns.map(col => {
        const columnDef = getColumnById(col.id);
        if (!prev.isSummary && columnDef?.aggregatable) {
          return { ...col, aggregation: 'sum' };
        }
        if (prev.isSummary) {
          return { ...col, aggregation: undefined };
        }
        return col;
      })
    }));
  };

  const toggleGroupBy = (columnId: string) => {
    setState(prev => {
      const isCurrentlyGrouped = prev.groupByColumns.includes(columnId);
      return {
        ...prev,
        groupByColumns: isCurrentlyGrouped
          ? prev.groupByColumns.filter(id => id !== columnId)
          : [...prev.groupByColumns, columnId]
      };
    });
  };

  const handleSave = () => {
    if (!state.name.trim()) {
      alert('Please enter a report name');
      return;
    }
    if (state.selectedColumns.length === 0) {
      alert('Please select at least one column');
      return;
    }
    if (state.isSummary && state.groupByColumns.length === 0) {
      alert('Summary mode requires at least one grouping column');
      return;
    }
    onSave(state);
  };

  const handleAnalyzeWithAI = async () => {
    if (state.selectedColumns.length === 0) {
      alert('Please select at least one column before analyzing with AI.');
      return;
    }

    setIsAnalyzing(true);

    try {
      const reportName = state.name.trim() || `AI Report ${new Date().toLocaleDateString()}`;

      let sampleData: Record<string, unknown>[] = [];

      if (effectiveCustomerId) {
        const columnIds = state.selectedColumns.map(c => c.id);
        const selectFields = columnIds.join(', ');

        const { data, error } = await supabase
          .from('shipment_report_view')
          .select(selectFields)
          .eq('customer_id', effectiveCustomerId)
          .limit(100);

        if (!error && data) {
          sampleData = data;
        }
      }

      const enhancementContext = buildEnhancementContext(
        {
          id: `temp-${Date.now()}`,
          name: reportName,
          description: state.description,
          columns: state.selectedColumns,
          isSummary: state.isSummary,
          groupBy: state.groupByColumns,
          filters: state.filters,
          sorts: state.sorts
        },
        sampleData,
        { type: 'last30' }
      );

      sessionStorage.setItem('enhancement_context', JSON.stringify(enhancementContext));

      if (state.name.trim()) {
        onSave({ ...state });
      }

      onClose();
      navigate('/ai-studio', {
        state: {
          enhancementMode: true,
          sourceReport: reportName
        }
      });
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to analyze with AI. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const isColumnSelected = (columnId: string) => {
    return state.selectedColumns.some(col => col.id === columnId);
  };

  const wrapperClasses = isInline
    ? "h-full flex flex-col"
    : "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4";

  const containerClasses = isInline
    ? "bg-white h-full flex flex-col"
    : "bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col";

  return (
    <div className={wrapperClasses}>
      <div className={containerClasses}>
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">
              {initialState?.name ? 'Edit Report' : 'Column Builder'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">Pick columns, reorder them, and choose how to display your data</p>
          </div>
          {!isInline && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        <div className="p-6 border-b bg-gray-50">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Report Name *
              </label>
              <input
                type="text"
                value={state.name}
                onChange={(e) => setState(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rocket-500"
                placeholder="e.g., Monthly Shipment Summary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                value={state.description}
                onChange={(e) => setState(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rocket-500"
                placeholder="Optional description"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={state.isSummary}
                onChange={toggleSummaryMode}
                className="w-4 h-4 text-rocket-600 border-gray-300 rounded focus:ring-rocket-500"
              />
              <span className="text-sm font-medium text-gray-700">Summary Mode</span>
            </label>
            <span className="text-xs text-gray-500">
              {state.isSummary
                ? 'Group data and calculate totals'
                : 'Show individual records'}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex">
          <div className="w-1/3 border-r overflow-y-auto">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Available Columns</h3>

              {Object.entries(COLUMN_CATEGORIES).map(([key, config]) => {
                const IconComponent = categoryIcons[config.icon as keyof typeof categoryIcons];
                const isExpanded = expandedCategories.has(key);
                const columns = getColumnsByCategory(key, canSeeAdminColumns);

                return (
                  <div key={key} className="mb-2">
                    <button
                      onClick={() => toggleCategory(key)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                      <IconComponent className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">{config.label}</span>
                      <span className="ml-auto text-xs text-gray-500">{columns.length}</span>
                    </button>

                    {isExpanded && (
                      <div className="ml-6 mt-1 space-y-1">
                        {columns.map(column => (
                          <button
                            key={column.id}
                            ref={(el) => {
                              if (el) {
                                columnButtonRefs.current.set(column.id, el);
                              }
                            }}
                            onClick={() => {
                              addColumn(column.id);
                              handleColumnHoverEnd();
                            }}
                            onMouseEnter={(e) => handleColumnHoverStart(column.id, e)}
                            onMouseLeave={handleColumnHoverEnd}
                            disabled={isColumnSelected(column.id)}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-left rounded-md transition-colors ${
                              isColumnSelected(column.id)
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'hover:bg-rocket-50 text-gray-700'
                            }`}
                          >
                            <Plus className="w-3 h-3" />
                            <span className="text-sm">{column.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold text-gray-700">
                  Selected Columns ({state.selectedColumns.length})
                </h3>
                {(totalActiveFilters > 0 || totalSorts > 0) && (
                  <div className="flex items-center gap-2">
                    {totalActiveFilters > 0 && (
                      <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-rocket-100 text-rocket-700 rounded-full">
                        <Filter className="w-3 h-3" />
                        {totalActiveFilters}
                      </span>
                    )}
                    {totalSorts > 0 && (
                      <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                        <ArrowUpDown className="w-3 h-3" />
                        {totalSorts}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {state.selectedColumns.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No columns selected</p>
                  <p className="text-xs mt-1">Pick columns from the left to get started</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {state.selectedColumns.map((column, index) => {
                    const columnDef = getColumnById(column.id);
                    const canAggregate = columnDef?.aggregatable && state.isSummary;
                    const canGroup = columnDef?.groupable && state.isSummary;
                    const isGrouped = state.groupByColumns.includes(column.id);

                    return (
                      <div
                        key={`${column.id}-${index}`}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`p-3 bg-white border rounded-lg ${
                          draggedIndex === index ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <GripVertical className="w-4 h-4 text-gray-400 cursor-move flex-shrink-0" />

                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900">{column.label}</div>
                            {columnDef?.description && (
                              <div className="text-xs text-gray-500 mt-0.5">{columnDef.description}</div>
                            )}
                          </div>

                          {canGroup && (
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isGrouped}
                                onChange={() => toggleGroupBy(column.id)}
                                className="w-4 h-4 text-rocket-600 border-gray-300 rounded focus:ring-rocket-500"
                              />
                              <span className="text-xs text-gray-600">Group</span>
                            </label>
                          )}

                          {canAggregate && (
                            <select
                              value={column.aggregation || 'sum'}
                              onChange={(e) => updateColumnAggregation(index, e.target.value)}
                              className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-rocket-500"
                            >
                              <option value="sum">Sum</option>
                              <option value="avg">Average</option>
                              <option value="count">Count</option>
                              <option value="min">Min</option>
                              <option value="max">Max</option>
                            </select>
                          )}

                          <button
                            onClick={() => removeColumn(index)}
                            className="text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {columnDef && (
                          <ColumnFilterSection
                            column={columnDef}
                            filters={getFiltersForColumn(column.id)}
                            sort={getSortForColumn(column.id)}
                            onFiltersChange={(filters) => updateFiltersForColumn(column.id, filters)}
                            onSortChange={(sort) => updateSortForColumn(column.id, sort)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {state.isSummary && state.selectedColumns.length > 0 && (
                <div className="mt-4 p-3 bg-rocket-50 border border-rocket-200 rounded-lg">
                  <p className="text-xs text-rocket-800">
                    <strong>Summary Mode:</strong> Check "Group" on columns to group by, and choose aggregations for numeric columns
                  </p>
                  {state.groupByColumns.length > 0 && (
                    <p className="text-xs text-rocket-700 mt-2">
                      Grouping by: {state.groupByColumns.map(id => getColumnById(id)?.label).join(', ')}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-6 border-t bg-gray-50 flex-shrink-0">
          <div className="text-sm text-gray-600">
            {state.selectedColumns.length} column{state.selectedColumns.length !== 1 ? 's' : ''} selected
            {totalActiveFilters > 0 && ` • ${totalActiveFilters} filter${totalActiveFilters !== 1 ? 's' : ''}`}
            {totalSorts > 0 && ` • ${totalSorts} sort${totalSorts !== 1 ? 's' : ''}`}
          </div>
          <div className="flex gap-3">
            {!isInline && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            )}
            {!isInline && (
              <button
                onClick={handleAnalyzeWithAI}
                disabled={state.selectedColumns.length === 0 || isAnalyzing}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-teal-500 to-teal-600 rounded-md hover:from-teal-600 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                title="Open in AI Studio for visualization"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Analyze with AI</span>
                  </>
                )}
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!state.name.trim() || state.selectedColumns.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-rocket-600 rounded-md hover:bg-rocket-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {initialState?.name ? 'Save Changes' : 'Create Report'}
            </button>
          </div>
        </div>
      </div>

      {hoveredColumn && tooltipPosition && effectiveCustomerId && (
        <ColumnPreviewTooltip
          columnId={hoveredColumn}
          customerId={String(effectiveCustomerId)}
          position={tooltipPosition}
          onClose={handleColumnHoverEnd}
        />
      )}
    </div>
  );
}
