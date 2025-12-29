import { useState, useEffect } from 'react';
import { BarChart3, Users, CheckCircle, AlertTriangle, Brain, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AIStats {
  total_reports: number;
  total_conversations: number;
  success_rate: number;
  validation_errors: number;
  access_violations: number;
  learnings_captured: number;
  top_customers: { customer_name: string; report_count: number }[];
  daily_usage: { date: string; count: number }[];
}

export function AIAnalyticsDashboard() {
  const [stats, setStats] = useState<AIStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30);

  useEffect(() => {
    loadStats();
  }, [timeRange]);

  async function loadStats() {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_ai_admin_stats', { p_days: timeRange });
      if (!error && data && data.length > 0) {
        setStats(data[0]);
      }
    } catch (e) {
      console.error('Failed to load AI stats:', e);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!stats) {
    return <div className="text-center p-12 text-gray-500">No analytics data available</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">AI Platform Analytics</h2>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(parseInt(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard icon={<BarChart3 className="w-5 h-5 text-blue-600" />} label="Reports" value={stats.total_reports.toLocaleString()} />
        <MetricCard icon={<Users className="w-5 h-5 text-green-600" />} label="Conversations" value={stats.total_conversations.toLocaleString()} />
        <MetricCard icon={<CheckCircle className="w-5 h-5 text-emerald-600" />} label="Success Rate" value={`${stats.success_rate || 0}%`} />
        <MetricCard icon={<AlertTriangle className="w-5 h-5 text-amber-600" />} label="Validation Errors" value={stats.validation_errors.toString()} alert={stats.validation_errors > 0} />
        <MetricCard icon={<AlertTriangle className="w-5 h-5 text-red-600" />} label="Access Violations" value={stats.access_violations.toString()} alert={stats.access_violations > 0} />
        <MetricCard icon={<Brain className="w-5 h-5 text-purple-600" />} label="Learnings" value={stats.learnings_captured.toString()} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-medium text-gray-900 mb-4">Most Active Customers</h3>
          {stats.top_customers?.length > 0 ? (
            <div className="space-y-3">
              {stats.top_customers.map((c, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-gray-700">{c.customer_name}</span>
                  <span className="text-gray-500 text-sm">{c.report_count} reports</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No data yet</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-medium text-gray-900 mb-4">Daily Usage</h3>
          {stats.daily_usage?.length > 0 ? (
            <div className="space-y-2">
              {stats.daily_usage.slice(0, 7).map((d, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-gray-500 text-sm w-20">
                    {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${Math.min(100, (d.count / Math.max(...stats.daily_usage.map(x => x.count))) * 100)}%` }}
                    />
                  </div>
                  <span className="text-gray-700 text-sm w-8">{d.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No data yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, alert }: { icon: React.ReactNode; label: string; value: string; alert?: boolean }) {
  return (
    <div className={`bg-white rounded-xl border p-4 ${alert ? 'border-amber-300 bg-amber-50' : 'border-gray-200'}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-gray-600">{label}</span>
      </div>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

export default AIAnalyticsDashboard;
