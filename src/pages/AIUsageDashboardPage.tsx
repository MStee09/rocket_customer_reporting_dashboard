import { useState } from 'react';
import {
  Cpu, DollarSign, Users, Zap, TrendingUp,
  RefreshCw, Calendar, BarChart2, Building2, ChevronDown, ChevronRight, User
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useAIUsageDashboard, UserUsageRow } from '../hooks/useAIUsageDashboard';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

type ViewMode = 'customers' | 'users';

export function AIUsageDashboardPage() {
  const [daysBack, setDaysBack] = useState(30);
  const [viewMode, setViewMode] = useState<ViewMode>('customers');
  const [expandedCustomerId, setExpandedCustomerId] = useState<number | null | 'none'>('none');
  const [customerUsers, setCustomerUsers] = useState<Record<string, UserUsageRow[]>>({});
  const [loadingUsers, setLoadingUsers] = useState<string | null>(null);

  const {
    summary,
    userUsage,
    customerUsage,
    dailyUsage,
    costSummary,
    loading,
    error,
    refresh,
    fetchUsersForCustomer
  } = useAIUsageDashboard(daysBack);

  const formatCurrency = (value: number) => {
    if (value < 0.01) return `$${value.toFixed(4)}`;
    if (value < 1) return `$${value.toFixed(3)}`;
    return `$${value.toFixed(2)}`;
  };

  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toLocaleString();
  };

  const handleExpandCustomer = async (customerId: number | null) => {
    const key = customerId === null ? 'null' : customerId.toString();

    if (expandedCustomerId === customerId) {
      setExpandedCustomerId('none');
      return;
    }

    setExpandedCustomerId(customerId);

    if (!customerUsers[key]) {
      setLoadingUsers(key);
      const users = await fetchUsersForCustomer(customerId);
      setCustomerUsers(prev => ({ ...prev, [key]: users }));
      setLoadingUsers(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-64" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-200 rounded-xl" />
            ))}
          </div>
          <div className="h-64 bg-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 font-medium">Failed to load AI usage data</p>
          <p className="text-red-500 text-sm mt-1">{error}</p>
          <button
            onClick={refresh}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const chartData = [...(dailyUsage || [])].reverse().map(d => ({
    date: format(parseISO(d.date), 'MMM d'),
    cost: d.costUsd,
    requests: d.requests,
    tokens: d.inputTokens + d.outputTokens
  }));

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AI Usage Dashboard</h1>
          <p className="text-slate-500 mt-1">
            Monitor AI API usage, costs, and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={daysBack}
            onChange={(e) => setDaysBack(Number(e.target.value))}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            onClick={refresh}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={DollarSign}
          label="Total Cost"
          value={formatCurrency(summary?.totalCostUsd || 0)}
          subValue={`${formatCurrency(summary?.costToday || 0)} today`}
          color="emerald"
        />
        <StatCard
          icon={Zap}
          label="Total Requests"
          value={formatNumber(summary?.totalRequests || 0)}
          subValue={`${summary?.requestsToday || 0} today`}
          color="blue"
        />
        <StatCard
          icon={Cpu}
          label="Tokens Used"
          value={formatNumber((summary?.totalInputTokens || 0) + (summary?.totalOutputTokens || 0))}
          subValue={`${formatNumber(summary?.totalInputTokens || 0)} in / ${formatNumber(summary?.totalOutputTokens || 0)} out`}
          color="amber"
        />
        <StatCard
          icon={Users}
          label="Active Users"
          value={summary?.uniqueUsers || 0}
          subValue={`${(summary?.successRate || 0).toFixed(1)}% success rate`}
          color="rose"
        />
      </div>

      {costSummary && (
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Cost Projection</h3>
              <p className="text-slate-400 text-sm">Based on {costSummary.daysInPeriod} days of data</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{formatCurrency(costSummary.projectedMonthlyCost)}</div>
              <div className="text-slate-400 text-sm">projected monthly cost</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-slate-400 text-xs">Average Daily</div>
              <div className="text-xl font-semibold">{formatCurrency(costSummary.avgDailyCost)}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-slate-400 text-xs">Period Total</div>
              <div className="text-xl font-semibold">{formatCurrency(costSummary.totalCost)}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-slate-400 text-xs">Avg Latency</div>
              <div className="text-xl font-semibold">{((summary?.avgLatencyMs || 0) / 1000).toFixed(1)}s</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-slate-400" />
            Daily Cost Trend
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="#94a3b8"
                  tickFormatter={(v) => `$${v.toFixed(2)}`}
                />
                <Tooltip
                  formatter={(value: number) => [`$${value.toFixed(4)}`, 'Cost']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Area
                  type="monotone"
                  dataKey="cost"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#costGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-slate-400" />
            Daily Requests
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip
                  formatter={(value: number) => [value, 'Requests']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="requests" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setViewMode('customers')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'customers'
                  ? 'bg-rocket-50 text-rocket-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Building2 className="w-4 h-4" />
              By Customer
            </button>
            <button
              onClick={() => setViewMode('users')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'users'
                  ? 'bg-rocket-50 text-rocket-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4" />
              All Users
            </button>
          </div>
          <div className="text-sm text-slate-500">
            {viewMode === 'customers'
              ? `${customerUsage?.length || 0} customers`
              : `${userUsage?.length || 0} users`
            }
          </div>
        </div>

        {viewMode === 'customers' ? (
          <div className="divide-y divide-slate-100">
            {!customerUsage || customerUsage.length === 0 ? (
              <div className="px-6 py-8 text-center text-slate-500">
                No customer usage data available
              </div>
            ) : (
              customerUsage.map((customer) => {
                const key = customer.customerId === null ? 'null' : customer.customerId.toString();
                const isExpanded = expandedCustomerId === customer.customerId;
                const users = customerUsers[key] || [];
                const isLoading = loadingUsers === key;

                return (
                  <div key={key}>
                    <button
                      onClick={() => handleExpandCustomer(customer.customerId)}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        )}
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-slate-500" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-slate-900">
                            {customer.customerName}
                          </div>
                          <div className="text-xs text-slate-500">
                            {customer.uniqueUsers} user{customer.uniqueUsers !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-8 text-sm">
                        <div className="text-right">
                          <div className="text-slate-500 text-xs">Requests</div>
                          <div className="font-medium text-slate-900">{customer.totalRequests}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-slate-500 text-xs">Tokens</div>
                          <div className="font-medium text-slate-900">{formatNumber(customer.totalTokens)}</div>
                        </div>
                        <div className="text-right min-w-[80px]">
                          <div className="text-slate-500 text-xs">Cost</div>
                          <div className="font-medium text-emerald-600">{formatCurrency(customer.totalCostUsd)}</div>
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="bg-slate-50 border-t border-slate-100">
                        {isLoading ? (
                          <div className="px-6 py-4 text-center text-slate-500">
                            Loading users...
                          </div>
                        ) : users.length === 0 ? (
                          <div className="px-6 py-4 text-center text-slate-500">
                            No user data available for this customer
                          </div>
                        ) : (
                          <table className="w-full">
                            <thead className="bg-slate-100">
                              <tr>
                                <th className="px-6 py-2 text-left text-xs font-medium text-slate-500 uppercase">User</th>
                                <th className="px-6 py-2 text-right text-xs font-medium text-slate-500 uppercase">Requests</th>
                                <th className="px-6 py-2 text-right text-xs font-medium text-slate-500 uppercase">Input Tokens</th>
                                <th className="px-6 py-2 text-right text-xs font-medium text-slate-500 uppercase">Output Tokens</th>
                                <th className="px-6 py-2 text-right text-xs font-medium text-slate-500 uppercase">Cost</th>
                                <th className="px-6 py-2 text-right text-xs font-medium text-slate-500 uppercase">Last Used</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {users.map((user, idx) => (
                                <tr key={user.userId || idx} className="bg-white">
                                  <td className="px-6 py-3">
                                    <div className="flex items-center gap-2">
                                      <User className="w-4 h-4 text-slate-400" />
                                      <div>
                                        <div className="font-medium text-slate-900 text-sm">{user.userEmail || 'Unknown'}</div>
                                        <div className="text-xs text-slate-400">{user.userId?.slice(0, 8)}...</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-3 text-right text-sm text-slate-900">{user.totalRequests}</td>
                                  <td className="px-6 py-3 text-right text-sm text-slate-600">{formatNumber(user.totalInputTokens)}</td>
                                  <td className="px-6 py-3 text-right text-sm text-slate-600">{formatNumber(user.totalOutputTokens)}</td>
                                  <td className="px-6 py-3 text-right text-sm font-medium text-emerald-600">{formatCurrency(user.totalCostUsd)}</td>
                                  <td className="px-6 py-3 text-right text-sm text-slate-500">
                                    {user.lastUsed ? format(parseISO(user.lastUsed), 'MMM d, h:mm a') : '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Requests</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Input Tokens</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Output Tokens</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Total Cost</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Last Used</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!userUsage || userUsage.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                      No usage data available
                    </td>
                  </tr>
                ) : (
                  userUsage.map((user, idx) => (
                    <tr key={user.userId || idx} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{user.userEmail || 'Unknown'}</div>
                        <div className="text-xs text-slate-500">{user.userId}</div>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-slate-900">
                        {user.totalRequests.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-600">
                        {formatNumber(user.totalInputTokens)}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-600">
                        {formatNumber(user.totalOutputTokens)}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-emerald-600">
                        {formatCurrency(user.totalCostUsd)}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-500 text-sm">
                        {user.lastUsed ? format(parseISO(user.lastUsed), 'MMM d, h:mm a') : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-slate-400" />
          Pricing Reference
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <div className="text-slate-500 mb-1">Claude Sonnet 4 - Input</div>
            <div className="text-xl font-semibold text-slate-900">$3.00 / MTok</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <div className="text-slate-500 mb-1">Claude Sonnet 4 - Output</div>
            <div className="text-xl font-semibold text-slate-900">$15.00 / MTok</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <div className="text-slate-500 mb-1">Avg Cost Per Request</div>
            <div className="text-xl font-semibold text-slate-900">
              {summary && summary.totalRequests > 0
                ? formatCurrency(summary.totalCostUsd / summary.totalRequests)
                : '$0.00'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  color
}: {
  icon: typeof Cpu;
  label: string;
  value: string | number;
  subValue?: string;
  color: 'emerald' | 'blue' | 'amber' | 'rose';
}) {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600'
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-sm text-slate-500">{label}</span>
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      {subValue && (
        <div className="text-sm text-slate-500 mt-1">
          {subValue}
        </div>
      )}
    </div>
  );
}
