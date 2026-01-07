import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw, AlertCircle, FileQuestion, Sparkles } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import {
  executeWidget,
  getWidgetMetadata,
  WidgetNotFoundError,
  type WidgetExecutionResult,
} from '../../../services/widgetdataservice';
import { DataTable } from '../../datatable';
import { DateRangeSelector } from '../DateRangeSelector';
import { ExportMenu } from '../../ui/ExportMenu';
import { SaveAsReportButton } from '../../reports/saveasreportbutton';
import { LoadingSpinner } from '../../ui/loadingspinner';
import { InvestigatorUnified } from '../../ai/InvestigatorUnified';
import { Button } from '../../ui/Button';
import type { ReportExecutionParams, DateRange } from '../../../types/report';
import type { ColumnConfig } from '../../../services/exportService';

type ViewState =
  | { status: 'loading' }
  | { status: 'success'; result: WidgetExecutionResult }
  | { status: 'error'; message: string }
  | { status: 'not-found'; widgetId: string };

function getDefaultDateRange(): DateRange {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 1);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

function dateRangeKeyToRange(key: string): DateRange {
  const today = new Date();
  const end = today.toISOString().split('T')[0];
  let start = new Date();

  switch (key) {
    case 'last7':
      start.setDate(today.getDate() - 7);
      break;
    case 'last30':
      start.setDate(today.getDate() - 30);
      break;
    case 'last90':
      start.setDate(today.getDate() - 90);
      break;
    case 'last6months':
      start.setMonth(today.getMonth() - 6);
      break;
    case 'thisMonth':
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      break;
    case 'thisQuarter': {
      const quarter = Math.floor(today.getMonth() / 3);
      start = new Date(today.getFullYear(), quarter * 3, 1);
      break;
    }
    case 'thisYear':
      start = new Date(today.getFullYear(), 0, 1);
      break;
    case 'lastyear':
      start = new Date(today.getFullYear() - 1, 0, 1);
      return {
        start: start.toISOString().split('T')[0],
        end: new Date(today.getFullYear() - 1, 11, 31).toISOString().split('T')[0],
      };
    default:
      start.setDate(today.getDate() - 30);
  }

  return {
    start: start.toISOString().split('T')[0],
    end,
  };
}

export default function WidgetRawDataView() {
  const { widgetId } = useParams<{ widgetId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { effectiveCustomerId, user, isAdmin, customers } = useAuth();

  const currentCustomer = customers.find(c => c.customer_id === effectiveCustomerId);

  const [viewState, setViewState] = useState<ViewState>({ status: 'loading' });
  const [dateRangeKey, setDateRangeKey] = useState(
    searchParams.get('range') || 'last30'
  );
  const [showAI, setShowAI] = useState(false);

  const dateRange = dateRangeKeyToRange(dateRangeKey);

  const carrierFilter = searchParams.get('carrier');
  const carrierNameFilter = searchParams.get('carrier_name');
  const filters: Record<string, string | number> = {};
  if (carrierFilter) {
    filters.carrier = carrierFilter;
  }
  if (carrierNameFilter) {
    filters.carrier_name = carrierNameFilter;
  }

  const executionParams: ReportExecutionParams = {
    dateRange,
    filters,
  };

  const widgetMeta = widgetId ? getWidgetMetadata(widgetId) : null;

  const loadData = useCallback(async () => {
    if (!widgetId) {
      setViewState({ status: 'not-found', widgetId: 'unknown' });
      return;
    }

    if (!effectiveCustomerId) {
      setViewState({ status: 'error', message: 'No customer context available' });
      return;
    }

    setViewState({ status: 'loading' });

    try {
      const result = await executeWidget(
        widgetId,
        executionParams,
        String(effectiveCustomerId)
      );
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
  }, [widgetId, effectiveCustomerId, dateRangeKey]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDateRangeChange = (newRangeKey: string) => {
    setDateRangeKey(newRangeKey);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('range', newRangeKey);
    setSearchParams(newParams, { replace: true });
  };

  if (viewState.status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-charcoal-600">Loading widget data...</p>
        </div>
      </div>
    );
  }

  if (viewState.status === 'not-found') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <FileQuestion className="w-16 h-16 text-charcoal-300 mb-4" />
        <h2 className="text-xl font-semibold text-charcoal-900 mb-2">Widget Not Found</h2>
        <p className="text-charcoal-600 mb-6">
          The widget "{viewState.widgetId}" does not exist or has been removed.
        </p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  if (viewState.status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
        <h2 className="text-xl font-semibold text-charcoal-900 mb-2">Error Loading Data</h2>
        <p className="text-charcoal-600 mb-6">{viewState.message}</p>
        <div className="flex items-center gap-3">
          <Button variant="primary" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const { result } = viewState;
  const columns: ColumnConfig[] = result.tableData.columns.map((col) => ({
    key: col.key,
    label: col.label,
    type: col.type === 'currency' ? 'currency' : col.type === 'number' ? 'number' : 'string',
  }));

  const carrierName = searchParams.get('carrier_name');
  const displayTitle = carrierName
    ? `${result.widgetName}: ${decodeURIComponent(carrierName)}`
    : result.widgetName;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="text-charcoal-500 hover:text-charcoal-700 text-sm mb-2 flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-2xl font-bold text-charcoal-900">{displayTitle}</h1>
          <p className="text-charcoal-500 text-sm mt-1">
            {result.tableData.metadata.rowCount.toLocaleString()} rows
            {result.tableData.metadata.generatedAt && (
              <span className="mx-2">|</span>
            )}
            {result.tableData.metadata.generatedAt && (
              <span>
                Generated {new Date(result.tableData.metadata.generatedAt).toLocaleString()}
              </span>
            )}
          </p>
        </div>

        <DateRangeSelector value={dateRangeKey} onChange={handleDateRangeChange} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-charcoal-200 overflow-hidden">
        <DataTable
          columns={result.tableData.columns}
          rows={result.tableData.rows}
          maxHeight="600px"
          emptyMessage="No data found for the selected date range"
        />
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-charcoal-200">
        <div className="flex items-center gap-3">
          <ExportMenu
            data={result.tableData.rows}
            columns={columns}
            filename={`${result.widgetName.replace(/\s+/g, '-').toLowerCase()}`}
            title={result.widgetName}
          />
          <Button
            variant="outline"
            onClick={() => setShowAI(!showAI)}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {showAI ? 'Hide AI Analysis' : 'Analyze with AI'}
          </Button>
        </div>

        <SaveAsReportButton
          widgetId={result.widgetId}
          widgetName={result.widgetName}
          executionParams={executionParams}
        />
      </div>

      {showAI && effectiveCustomerId && (
        <div className="mt-6 p-6 bg-charcoal-50 rounded-xl border border-charcoal-200">
          <InvestigatorUnified
            customerId={String(effectiveCustomerId)}
            isAdmin={isAdmin()}
            customerName={currentCustomer?.customer_name}
            userId={user?.id}
            userEmail={user?.email}
            initialQuery={`Tell me about the ${result.widgetName} data`}
            embedded
          />
        </div>
      )}
    </div>
  );
}
