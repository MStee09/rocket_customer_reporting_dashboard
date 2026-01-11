import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Table as TableIcon, Download, Loader2, AlertCircle, X, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { useBuilderV3 } from './BuilderContextV3';
import { useWidgetQuery } from '../hooks/useWidgetQuery';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

export function PreviewPanelV3() {
  const { state, dispatch, buildQueryConfig } = useBuilderV3();
  const { execute, isExecuting } = useWidgetQuery();
  const [showDataTable, setShowDataTable] = useState(false);

  const runQuery = useCallback(async () => {
    dispatch({ type: 'SET_PREVIEW_LOADING', loading: true });
    dispatch({ type: 'SET_PREVIEW_ERROR', error: null });

    try {
      const queryConfig = buildQueryConfig();
      const result = await execute(queryConfig, {
        customerId: state.customerScope === 'specific' ? state.selectedCustomerId : undefined,
        isAdmin: state.customerScope === 'all',
        dateRange: state.previewDateRange,
      });

      if (result.success) {
        dispatch({ type: 'SET_PREVIEW_DATA', data: result.data });
      } else {
        dispatch({ type: 'SET_PREVIEW_ERROR', error: result.error || 'Query failed' });
      }
    } catch (err) {
      dispatch({ type: 'SET_PREVIEW_ERROR', error: err instanceof Error ? err.message : 'Query failed' });
    } finally {
      dispatch({ type: 'SET_PREVIEW_LOADING', loading: false });
    }
  }, [buildQueryConfig, execute, state.customerScope, state.selectedCustomerId, state.previewDateRange, dispatch]);

  useEffect(() => {
    if (state.xField && state.yField && (state.step === 'preview' || state.step === 'configure')) {
      runQuery();
    }
  }, [state.xField, state.yField, state.step]);

  const handleExportCSV = () => {
    if (!state.previewData || state.previewData.length === 0) return;
    const headers = Object.keys(state.previewData[0]);
    const csv = [headers.join(','), ...state.previewData.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.name || 'widget'}_data.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          <input
            type="date"
            value={state.previewDateRange.start}
            onChange={(e) => dispatch({ type: 'SET_PREVIEW_DATE_RANGE', range: { ...state.previewDateRange, start: e.target.value } })}
            className="px-2 py-1 text-sm border border-slate-200 rounded"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={state.previewDateRange.end}
            onChange={(e) => dispatch({ type: 'SET_PREVIEW_DATE_RANGE', range: { ...state.previewDateRange, end: e.target.value } })}
            className="px-2 py-1 text-sm border border-slate-200 rounded"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runQuery}
            disabled={isExecuting}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
          >
            <RefreshCw className={`w-4 h-4 ${isExecuting ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowDataTable(true)}
            disabled={!state.previewData?.length}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50"
          >
            <TableIcon className="w-4 h-4" />
            View Data
          </button>
          <button
            onClick={handleExportCSV}
            disabled={!state.previewData?.length}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 min-h-[400px] flex items-center justify-center">
        {state.previewLoading ? (
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span>Loading...</span>
          </div>
        ) : state.previewError ? (
          <div className="flex flex-col items-center gap-3 text-red-500 p-6">
            <AlertCircle className="w-8 h-8" />
            <span className="font-medium">Error</span>
            <span className="text-sm text-center max-w-md">{state.previewError}</span>
            <button onClick={runQuery} className="mt-2 px-4 py-2 text-sm bg-red-50 text-red-600 rounded-lg">
              Retry
            </button>
          </div>
        ) : !state.previewData?.length ? (
          <div className="flex flex-col items-center gap-3 text-slate-400 p-6">
            <TableIcon className="w-12 h-12" />
            <span>Configure widget and click Refresh</span>
          </div>
        ) : (
          <div className="w-full h-[400px] p-4">
            <ChartRenderer
              type={state.chartType}
              data={state.previewData}
              xField={state.xField}
              yField={state.yField}
              aggregation={state.aggregation}
            />
          </div>
        )}
      </div>

      {state.previewData && state.previewData.length > 0 && (
        <div className="text-sm text-slate-600">{state.previewData.length} data points</div>
      )}

      {showDataTable && (
        <DataTableModal
          data={state.previewData || []}
          onClose={() => setShowDataTable(false)}
          onExport={handleExportCSV}
        />
      )}
    </div>
  );
}

function ChartRenderer({
  type,
  data,
  xField,
  yField,
  aggregation,
}: {
  type: string;
  data: any[];
  xField: string;
  yField: string;
  aggregation: string;
}) {
  const chartData = data.map((row, i) => {
    const labelKey = xField || Object.keys(row).find(k => typeof row[k] === 'string') || 'label';
    const valueKey = Object.keys(row).find(k => k.includes(aggregation) || k === 'value' || typeof row[k] === 'number') || 'value';
    return { label: row[labelKey] || `Item ${i + 1}`, value: Number(row[valueKey] || 0), ...row };
  });

  const formatValue = (v: number) =>
    yField?.includes('retail') || yField?.includes('cost')
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)
      : new Intl.NumberFormat('en-US').format(v);

  switch (type) {
    case 'bar':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 100 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={formatValue} />
            <YAxis type="category" dataKey="label" width={100} />
            <Tooltip formatter={(v: number) => formatValue(v)} />
            <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );

    case 'line':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis tickFormatter={formatValue} />
            <Tooltip formatter={(v: number) => formatValue(v)} />
            <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      );

    case 'area':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis tickFormatter={formatValue} />
            <Tooltip formatter={(v: number) => formatValue(v)} />
            <Area type="monotone" dataKey="value" fill="#3b82f6" fillOpacity={0.3} stroke="#3b82f6" />
          </AreaChart>
        </ResponsiveContainer>
      );

    case 'pie':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius={120}
              label={({ label, percent }) => `${label}: ${(percent * 100).toFixed(0)}%`}
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => formatValue(v)} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      );

    case 'kpi':
      const total = chartData.reduce((s, r) => s + r.value, 0);
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="text-5xl font-bold text-slate-900">{formatValue(total)}</div>
          <div className="text-lg text-slate-500 mt-2">
            {aggregation} of {yField}
          </div>
        </div>
      );

    default:
      return (
        <div className="overflow-auto max-h-full">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">{xField || 'Label'}</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">{yField || 'Value'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {chartData.map((row, i) => (
                <tr key={i}>
                  <td className="px-4 py-2 text-sm">{row.label}</td>
                  <td className="px-4 py-2 text-sm text-right">{formatValue(row.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

function DataTableModal({
  data,
  onClose,
  onExport,
}: {
  data: any[];
  onClose: () => void;
  onExport: () => void;
}) {
  const [page, setPage] = useState(0);
  const pageSize = 25;
  const totalPages = Math.ceil(data.length / pageSize);
  const pageData = data.slice(page * pageSize, (page + 1) * pageSize);
  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-[90vw] max-w-6xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-semibold">Data Table</h3>
            <p className="text-sm text-slate-500">{data.length} rows</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onExport}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-100 rounded-lg"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                {columns.map(col => (
                  <th key={col} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    {col.replace(/_/g, ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageData.map((row, i) => (
                <tr key={i}>
                  {columns.map(col => (
                    <td key={col} className="px-4 py-2 text-sm whitespace-nowrap">
                      {row[col] ?? '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200">
            <span className="text-sm text-slate-500">
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="p-2 hover:bg-slate-100 rounded disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="p-2 hover:bg-slate-100 rounded disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
