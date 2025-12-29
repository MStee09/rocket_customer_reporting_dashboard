import { useState, useEffect } from 'react';
import { Play, AlertTriangle, CheckCircle, Code, Database } from 'lucide-react';
import { isSystemWidget, customerWidgets, adminWidgets } from '../../../config/widgets';
import { useSupabase } from '../../../hooks/useSupabase';

interface WidgetQueryTabProps {
  widget: any;
}

export const WidgetQueryTab = ({ widget }: WidgetQueryTabProps) => {
  const supabase = useSupabase();
  const isSystem = isSystemWidget(widget.id);

  const [testCustomerId, setTestCustomerId] = useState<string>('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const loadCustomers = async () => {
      const { data } = await supabase
        .from('customer')
        .select('customer_id, company_name')
        .order('company_name');
      setCustomers(data || []);
    };
    loadCustomers();
  }, [supabase]);

  const queryInfo = getQueryInfo(widget, isSystem);

  const handleTestQuery = async () => {
    setTesting(true);
    setTestResult(null);

    const startTime = performance.now();

    try {
      const widgetDef = isSystem
        ? (customerWidgets[widget.id] || adminWidgets[widget.id])
        : widget;

      if (widgetDef?.calculate) {
        const dateRange = {
          start: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end: new Date().toISOString().split('T')[0],
        };

        const result = await widgetDef.calculate({
          supabase,
          customerId: testCustomerId ? Number(testCustomerId) : undefined,
          dateRange,
        });

        const queryTime = Math.round(performance.now() - startTime);

        setTestResult({
          success: true,
          data: result,
          queryTime,
          rowCount: result.data?.length || (result.value !== undefined ? 1 : 0),
        });
      } else {
        throw new Error('Widget does not have a calculate function');
      }
    } catch (err) {
      setTestResult({
        success: false,
        error: String(err),
        queryTime: Math.round(performance.now() - startTime),
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <Database className="w-4 h-4 text-slate-500" />
          Query Configuration
        </h4>
        <div className="bg-slate-50 rounded-xl p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wide">Base Table</span>
              <p className="mt-1 font-mono text-sm text-slate-900">{queryInfo.baseTable}</p>
            </div>
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wide">Query Type</span>
              <p className="mt-1 text-sm text-slate-900">{queryInfo.queryType}</p>
            </div>
          </div>

          {queryInfo.columns.length > 0 && (
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wide">Columns</span>
              <ul className="mt-2 space-y-1">
                {queryInfo.columns.map((col, i) => (
                  <li key={i} className="text-sm font-mono text-slate-700 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-rocket-500 rounded-full flex-shrink-0" />
                    {col}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {queryInfo.filters.length > 0 && (
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wide">Filters</span>
              <ul className="mt-2 space-y-1">
                {queryInfo.filters.map((filter, i) => (
                  <li key={i} className="text-sm font-mono text-slate-700 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full flex-shrink-0" />
                    {filter}
                    {filter.includes('{') && (
                      <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-sans">
                        dynamic
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {queryInfo.aggregations.length > 0 && (
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wide">Aggregations</span>
              <p className="mt-1 font-mono text-sm text-slate-700">{queryInfo.aggregations.join(', ')}</p>
            </div>
          )}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <Code className="w-4 h-4 text-slate-500" />
          SQL Preview
        </h4>
        <pre className="bg-slate-900 text-slate-100 rounded-xl p-4 text-sm overflow-x-auto">
          {queryInfo.sqlPreview}
        </pre>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-slate-900 mb-3">Test Query</h4>
        <div className="flex items-end gap-3 mb-4">
          <div className="flex-1">
            <label className="block text-xs text-slate-500 mb-1.5">Customer Context</label>
            <select
              value={testCustomerId}
              onChange={(e) => setTestCustomerId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
            >
              <option value="">All Customers (Admin View)</option>
              {customers.map(c => (
                <option key={c.customer_id} value={c.customer_id}>{c.company_name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleTestQuery}
            disabled={testing}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2 text-sm"
          >
            <Play className={`w-4 h-4 ${testing ? 'animate-pulse' : ''}`} />
            {testing ? 'Running...' : 'Run Test'}
          </button>
        </div>

        {testResult && (
          <div className={`p-4 rounded-xl ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              {testResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600" />
              )}
              <span className={`font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                {testResult.success ? 'Query Successful' : 'Query Failed'}
              </span>
              <span className="text-sm text-slate-500">({testResult.queryTime}ms)</span>
            </div>

            {testResult.success ? (
              <div className="text-sm text-green-700">
                Returned {testResult.rowCount} {testResult.rowCount === 1 ? 'result' : 'results'}
              </div>
            ) : (
              <div className="text-sm text-red-700">{testResult.error}</div>
            )}

            {testResult.success && testResult.data && (
              <details className="mt-3">
                <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">
                  View raw result
                </summary>
                <pre className="mt-2 p-3 bg-white rounded-lg text-xs overflow-auto max-h-48 border">
                  {JSON.stringify(testResult.data, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const getQueryInfo = (widget: any, isSystem: boolean) => {
  const info = {
    baseTable: 'shipment',
    queryType: 'SELECT',
    columns: [] as string[],
    filters: [] as string[],
    aggregations: [] as string[],
    sqlPreview: '',
  };

  if (isSystem) {
    if (widget.type === 'kpi' || widget.type === 'featured_kpi') {
      info.aggregations = ['COUNT(*) or SUM(field)'];
      info.columns = ['Aggregated value'];
    } else if (widget.type === 'table') {
      info.columns = ['Multiple columns based on widget definition'];
    } else if (widget.type === 'pie_chart' || widget.type === 'bar_chart') {
      info.columns = ['Category field', 'Value field'];
      info.aggregations = ['GROUP BY category'];
    }

    info.filters = [
      'customer_id = {customerId}',
      'pickup_date >= {dateRange.start}',
      'pickup_date <= {dateRange.end}',
    ];

    info.sqlPreview = `-- System widget: ${widget.name}
-- Query is defined in code

SELECT ${info.aggregations.length ? info.aggregations[0] : '*'}
FROM ${info.baseTable}
WHERE customer_id = {customerId}
  AND pickup_date >= {dateRange.start}
  AND pickup_date <= {dateRange.end}
${info.aggregations.length ? 'GROUP BY ...' : ''}`;
  } else {
    const query = widget.dataSource?.query;

    if (query) {
      info.baseTable = query.baseTable || 'shipment';
      info.columns = query.columns?.map((c: any) =>
        c.aggregate ? `${c.aggregate}(${c.field})` : c.field
      ) || [];
      info.filters = query.filters?.map((f: any) =>
        `${f.field} ${f.operator} ${f.isDynamic ? `{${f.value}}` : `'${f.value}'`}`
      ) || [];
      info.aggregations = query.groupBy || [];

      info.sqlPreview = generateSQLPreview(query);
    } else {
      info.sqlPreview = '-- Query configuration not available';
    }
  }

  return info;
};

const generateSQLPreview = (query: any) => {
  if (!query) return '-- No query configuration';

  const columns = query.columns?.map((c: any) =>
    c.aggregate ? `${c.aggregate.toUpperCase()}(${c.field})` : c.field
  ).join(',\n       ') || '*';

  let sql = `SELECT ${columns}\nFROM ${query.baseTable || 'shipment'}`;

  if (query.filters?.length) {
    const conditions = query.filters.map((f: any) =>
      `${f.field} ${f.operator} ${f.isDynamic ? `{${f.value}}` : `'${f.value}'`}`
    );
    sql += `\nWHERE ${conditions.join('\n  AND ')}`;
  }

  if (query.groupBy?.length) {
    sql += `\nGROUP BY ${query.groupBy.join(', ')}`;
  }

  if (query.orderBy?.length) {
    sql += `\nORDER BY ${query.orderBy.map((o: any) => `${o.field} ${o.direction}`).join(', ')}`;
  }

  if (query.limit) {
    sql += `\nLIMIT ${query.limit}`;
  }

  return sql;
};

export default WidgetQueryTab;
