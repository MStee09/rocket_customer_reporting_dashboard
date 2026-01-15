import { TrendingUp, BarChart3 } from 'lucide-react';

interface CustomerUsage {
  name: string;
  onDashboard: boolean;
  loads: number;
  lastLoad: string;
}

interface WidgetUsageTabProps {
  widget: { id: string; name: string };
}

export const WidgetUsageTab = ({ widget }: WidgetUsageTabProps) => {
  const usageData = {
    totalLoads: 0,
    avgLoadTime: 0,
    errorCount: 0,
    lastLoaded: null,
    customerBreakdown: [],
  };

  const hasUsageData = usageData.totalLoads > 0;

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-semibold text-slate-900 mb-3">Usage Overview</h4>

        {hasUsageData ? (
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-slate-900">{usageData.totalLoads}</div>
              <div className="text-xs text-slate-500 mt-1">Total Loads</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-slate-900">{usageData.avgLoadTime}ms</div>
              <div className="text-xs text-slate-500 mt-1">Avg Load Time</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <div className={`text-2xl font-bold ${usageData.errorCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {usageData.errorCount}
              </div>
              <div className="text-xs text-slate-500 mt-1">Errors</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <div className="text-lg font-bold text-slate-900">{usageData.customerBreakdown.length}</div>
              <div className="text-xs text-slate-500 mt-1">Customers Using</div>
            </div>
          </div>
        ) : (
          <div className="p-8 bg-slate-50 rounded-xl text-center">
            <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No usage data available yet</p>
            <p className="text-xs text-slate-400 mt-1">Usage statistics will appear once the widget is used</p>
          </div>
        )}
      </div>

      {hasUsageData && usageData.customerBreakdown.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-slate-900 mb-3">Customer Breakdown</h4>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Customer</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">On Dashboard</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Loads</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Last Load</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usageData.customerBreakdown.map((customer: CustomerUsage, i: number) => (
                  <tr key={i}>
                    <td className="px-4 py-3 font-medium text-slate-900">{customer.name}</td>
                    <td className="px-4 py-3">
                      {customer.onDashboard ? (
                        <span className="text-green-600">✓ Yes</span>
                      ) : (
                        <span className="text-slate-400">✗ No</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{customer.loads}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{customer.lastLoad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="p-4 bg-rocket-50 border border-rocket-200 rounded-xl">
        <div className="flex items-start gap-3">
          <TrendingUp className="w-5 h-5 text-rocket-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-rocket-800">Usage Analytics</p>
            <p className="text-sm text-rocket-700 mt-1">
              This tab shows how the widget is being used across customers.
              Data includes load counts, performance metrics, and which customers have added this widget to their dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WidgetUsageTab;
