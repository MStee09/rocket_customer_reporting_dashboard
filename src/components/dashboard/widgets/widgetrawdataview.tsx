// src/pages/WidgetRawDataView.tsx

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  executeWidget,
  getWidgetMetadata,
  WidgetNotFoundError,
  type WidgetExecutionResult,
} from '@/services/widgetDataService';
import { DataTable } from '@/components/DataTable';
import { DateRangePicker } from '@/components/DateRangePicker';
import { ExportCSV } from '@/components/ExportCSV';
import { PrintPDF } from '@/components/PrintPDF';
import { SaveAsReportButton } from '@/components/SaveAsReportButton';
import { AIInvestigator } from '@/components/AIInvestigator';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { ReportExecutionParams } from '@/types/report';

// ============================================
// TYPES
// ============================================

type ViewState =
  | { status: 'loading' }
  | { status: 'success'; result: WidgetExecutionResult }
  | { status: 'error'; message: string }
  | { status: 'not-found'; widgetId: string };

// ============================================
// COMPONENT
// ============================================

export default function WidgetRawDataView() {
  const { widgetId } = useParams<{ widgetId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, customerId } = useAuth();

  const [viewState, setViewState] = useState<ViewState>({ status: 'loading' });

  // Parse execution params from URL
  const executionParams: ReportExecutionParams = {
    dateRange: {
      start: searchParams.get('start') || getDefaultStartDate(),
      end: searchParams.get('end') || getDefaultEndDate(),
    },
    filters: parseFilters(searchParams.get('filters')),
  };

  // Get widget metadata (without executing)
  const widgetMeta = widgetId ? getWidgetMetadata(widgetId) : null;

  // Load widget data
  const loadData = useCallback(async () => {
    if (!widgetId) {
      setViewState({ status: 'not-found', widgetId: 'unknown' });
      return;
    }

    if (!customerId) {
      setViewState({ status: 'error', message: 'No customer context' });
      return;
    }

    setViewState({ status: 'loading' });

    try {
      const result = await executeWidget(widgetId, executionParams, customerId);
      setViewState({ status: 'success', result });
    } catch (error) {
      if (error instanceof WidgetNotFoundError) {
        setViewState({ status: 'not-found', widgetId });
      } else {
        console.error('Widget execution failed:', error);
        setViewState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Failed to load data',
        });
      }
    }
  }, [widgetId, customerId, executionParams.dateRange?.start, executionParams.dateRange?.end]);

  // Load on mount and when params change
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle date range change
  const handleDateRangeChange = (start: string, end: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('start', start);
    newParams.set('end', end);
    setSearchParams(newParams);
  };

  // ============================================
  // RENDER: Loading State
  // ============================================
  if (viewState.status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-3 text-gray-600">Loading data...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: Not Found State
  // ============================================
  if (viewState.status === 'not-found') {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Widget Not Found</h2>
        <p className="text-gray-600 mt-2">
          The widget "{viewState.widgetId}" does not exist.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 text-blue-600 hover:underline"
        >
          Go Back
        </button>
      </div>
    );
  }

  // ============================================
  // RENDER: Error State
  // ============================================
  if (viewState.status === 'error') {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-red-600">Error Loading Data</h2>
        <p className="text-gray-600 mt-2">{viewState.message}</p>
        <div className="mt-4 flex justify-center gap-4">
          <button onClick={loadData} className="text-blue-600 hover:underline">
            Try Again
          </button>
          <button
            onClick={() => navigate(-1)}
            className="text-gray-600 hover:underline"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: Success State
  // ============================================
  const { result } = viewState;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="text-gray-500 hover:text-gray-700 text-sm mb-1 flex items-center gap-1"
          >
            <span>←</span> Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{result.widgetName}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {result.tableData.metadata.rowCount.toLocaleString()} rows
          </p>
        </div>

        {/* Date Range Control */}
        <DateRangePicker
          startDate={executionParams.dateRange?.start || ''}
          endDate={executionParams.dateRange?.end || ''}
          onChange={handleDateRangeChange}
        />
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <DataTable
          columns={result.tableData.columns}
          rows={result.tableData.rows}
        />
      </div>

      {/* Actions Bar */}
      <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
        <ExportCSV
          data={result.tableData.rows}
          columns={result.tableData.columns}
          filename={`${result.widgetName.replace(/\s+/g, '-').toLowerCase()}-${
            executionParams.dateRange?.start || 'export'
          }`}
        />
        <PrintPDF
          data={result.tableData.rows}
          columns={result.tableData.columns}
          title={result.widgetName}
        />
        <div className="flex-1" />
        <SaveAsReportButton
          widgetId={result.widgetId}
          widgetName={result.widgetName}
          executionParams={executionParams}
        />
      </div>

      {/* AI Investigator - passes widget context */}
      <div className="mt-8">
        <AIInvestigator
          context={{
            type: 'widget',
            widgetId: result.widgetId,
            widgetName: result.widgetName,
            data: result.tableData.rows,
            rowCount: result.tableData.metadata.rowCount,
            dateRange: executionParams.dateRange,
            aggregateValue: result.widgetData.value,
          }}
        />
      </div>
    </div>
  );
}

// ============================================
// UTILITIES
// ============================================

function getDefaultStartDate(): string {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  return date.toISOString().split('T')[0];
}

function getDefaultEndDate(): string {
  return new Date().toISOString().split('T')[0];
}

function parseFilters(filtersParam: string | null): Record<string, unknown> {
  if (!filtersParam) return {};
  try {
    return JSON.parse(filtersParam);
  } catch {
    return {};
  }
}
