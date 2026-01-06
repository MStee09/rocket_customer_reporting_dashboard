import { useState, useEffect } from 'react';
import {
  Cpu, DollarSign, Users, Zap, TrendingUp,
  RefreshCw, Calendar, BarChart2, Building2, ChevronDown, ChevronRight, User,
  Power, PowerOff, Settings, AlertTriangle, Check, X, Edit2
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useAIUsageDashboard, UserUsageRow } from '../hooks/useAIUsageDashboard';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

type ViewMode = 'customers' | 'users' | 'settings';

interface CustomerAISettings {
  customerId: number;
  customerName: string;
  aiEnabled: boolean;
  dailyCostCap: number;
  monthlyCostCap: number | null;
  costToday: number;
  costThisMonth: number;
  requestsToday: number;
  lastAiUsage: string | null;
}

export function AIUsageDashboardPage() {
  const { user } = useAuth();
  const [daysBack, setDaysBack] = useState(30);
  const [viewMode, setViewMode] = useState<ViewMode>('customers');
  const [expandedCustomerId, setExpandedCustomerId] = useState<number | null | 'none'>('none');
  const [customerUsers, setCustomerUsers] = useState<Record<string, UserUsageRow[]>>({});
  const [loadingUsers, setLoadingUsers] = useState<string | null>(null);
  const [customerSettings, setCustomerSettings] = useState<CustomerAISettings[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [editingCap, setEditingCap] = useState<number | null>(null);
  const [newCapValue, setNewCapValue] = useState<string>('');

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

  const fetchCustomerSettings = async () => {
    setLoadingSettings(true);
    try {
      const { data, error } = await supabase.rpc('get_all_customer_ai_settings');
      if (!error && data) {
        setCustomerSettings(data.map((s: Record<string, unknown>) => ({
          customerId: s.customer_id as number,
          customerName: s.customer_name as string,
          aiEnabled: s.ai_enabled as boolean,
          dailyCostCap: s.daily_cost_cap as number,
          monthlyCostCap: s.monthly_cost_cap as number | null,
          costToday: s.cost_today as number,
          costThisMonth: s.cost_this_month as number,
          requestsToday: s.requests_today as number,
          lastAiUsage: s.last_ai_usage as string | null
        })));
      }
    } catch (err) {
      console.error('Failed to fetch customer settings:', err);
    }
    setLoadingSettings(false);
  };

  const toggleCustomerAI = async (customerId: number, enabled: boolean) => {
    try {
      await supabase.rpc('toggle_customer_ai', {
        p_customer_id: customerId,
        p_enabled: enabled,
        p_admin_id: user?.id
      });
      setCustomerSettings(prev => prev.map(s =>
        s.customerId === customerId ? { ...s, aiEnabled: enabled } : s
      ));
    } catch (err) {
      console.error('Failed to toggle AI:', err);
    }
  };

  const updateDailyCap = async (customerId: number) => {
    const cap = parseFloat(newCapValue);
    if (isNaN(cap) || cap < 0) return;

    try {
      await supabase.rpc('set_customer_daily_cap', {
        p_customer_id: customerId,
        p_cap: cap,
        p_admin_id: user?.id
      });
      setCustomerSettings(prev => prev.map(s =>
        s.customerId === customerId ? { ...s, dailyCostCap: cap } : s
      ));
      setEditingCap(null);
      setNewCapValue('');
    } catch (err) {
      console.error('Failed to update cap:', err);
    }
  };

  useEffect(() => {
    if (viewMode === 'settings') {
      fetchCustomerSettings();
    }
  }, [viewMode]);

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
            Monitor AI API usage, costs, and manage customer access
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

      {userUsage && userUsage.filter(u => u.costToday > 0).length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-500" />
                Today's Usage by User
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Daily budget progress (resets at midnight UTC)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userUsage
              .filter(user => user.costToday > 0)
              .sort((a, b) => b.costToday - a.costToday)
              .slice(0, 9)
              .map((user, idx) => {
                const dailyCap = 5.00;
                const percentUsed = (user.costToday / dailyCap) * 100;
                const remaining = Math.max(0, dailyCap - user.costToday);
                const isNearLimit = percentUsed >= 80;
                const isOverLimit = percentUsed >= 100;

                return (
                  <div
                    key={user.userId || idx}
                    className={`rounded-lg border p-4 ${
                      isOverLimit ? 'border-red-300 bg-red-50' :
                      isNearLimit ? 'border-amber-300 bg-amber-50' :
                      'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-slate-900 truncate text-sm">
                        {user.userEmail || 'Unknown'}
                      </span>
                      <span className={`text-sm font-semibold ${
                        isOverLimit ? 'text-red-600' :
                        isNearLimit ? 'text-amber-600' :
                        'text-emerald-600'
                      }`}>
                        {formatCurrency(user.costToday)} / {formatCurrency(dailyCap)}
                      </span>
                    </div>

                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isOverLimit ? 'bg-red-500' :
                          isNearLimit ? 'bg-amber-500' :
                          'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, percentUsed)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{user.requestsToday} requests</span>
                      <span>
                        {isOverLimit ? (
                          <span className="text-red-600 font-medium">Exceeded</span>
                        ) : (
                          `${formatCurrency(remaining)} left`
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-3 flex gap-4">
          <button
            onClick={() => setViewMode('customers')}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
              viewMode === 'customers' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-4 h-4" />
            By Customer
          </button>
          <button
            onClick={() => setViewMode('users')}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
              viewMode === 'users' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            By User
          </button>
          <button
            onClick={() => setViewMode('settings')}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
              viewMode === 'settings' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Settings className="w-4 h-4" />
            Customer AI Settings
          </button>
        </div>

        {viewMode === 'settings' && (
          <div className="p-6">
            <div className="mb-4">
              <p className="text-sm text-slate-600">
                Control AI access and daily cost limits for each customer. Changes take effect immediately.
              </p>
            </div>

            {loadingSettings ? (
              <div className="text-center py-8 text-slate-500">Loading customer settings...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Customer</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">AI Enabled</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Daily Cap</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Today's Usage</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Month's Usage</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Last Activity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customerSettings.map((customer) => {
                      const percentUsed = (customer.costToday / customer.dailyCostCap) * 100;
                      const isNearLimit = percentUsed >= 80;
                      const isOverLimit = percentUsed >= 100;

                      return (
                        <tr key={customer.customerId} className="hover:bg-slate-50">
                          <td className="px-4 py-4">
                            <div className="font-medium text-slate-900">{customer.customerName}</div>
                            <div className="text-xs text-slate-500">ID: {customer.customerId}</div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <button
                              onClick={() => toggleCustomerAI(customer.customerId, !customer.aiEnabled)}
                              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                                customer.aiEnabled
                                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                  : 'bg-red-100 text-red-700 hover:bg-red-200'
                              }`}
                            >
                              {customer.aiEnabled ? (
                                <>
                                  <Power className="w-4 h-4" />
                                  Enabled
                                </>
                              ) : (
                                <>
                                  <PowerOff className="w-4 h-4" />
                                  Disabled
                                </>
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-4 text-right">
                            {editingCap === customer.customerId ? (
                              <div className="flex items-center justify-end gap-2">
                                <span className="text-slate-500">$</span>
                                <input
                                  type="number"
                                  value={newCapValue}
                                  onChange={(e) => setNewCapValue(e.target.value)}
                                  className="w-20 px-2 py-1 border border-slate-300 rounded text-right text-sm"
                                  autoFocus
                                  step="0.50"
                                  min="0"
                                />
                                <button
                                  onClick={() => updateDailyCap(customer.customerId)}
                                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => { setEditingCap(null); setNewCapValue(''); }}
                                  className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingCap(customer.customerId);
                                  setNewCapValue(customer.dailyCostCap.toString());
                                }}
                                className="inline-flex items-center gap-1 text-slate-900 hover:text-blue-600"
                              >
                                {formatCurrency(customer.dailyCostCap)}
                                <Edit2 className="w-3 h-3 text-slate-400" />
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className={`font-medium ${
                              isOverLimit ? 'text-red-600' :
                              isNearLimit ? 'text-amber-600' :
                              'text-slate-900'
                            }`}>
                              {formatCurrency(customer.costToday)}
                            </div>
                            <div className="text-xs text-slate-500">
                              {customer.requestsToday} requests
                            </div>
                            {isOverLimit && (
                              <span className="inline-flex items-center gap-1 text-xs text-red-600 mt-1">
                                <AlertTriangle className="w-3 h-3" />
                                Over limit
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="font-medium text-slate-900">
                              {formatCurrency(customer.costThisMonth)}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right text-sm text-slate-500">
                            {customer.lastAiUsage
                              ? format(parseISO(customer.lastAiUsage), 'MMM d, h:mm a')
                              : 'Never'
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {viewMode === 'customers' && (
          <div className="divide-y divide-slate-100">
            {!customerUsage || customerUsage.length === 0 ? (
              <div className="px-6 py-8 text-center text-slate-500">
                No usage data available
              </div>
            ) : (
              customerUsage.map((customer) => {
                const isExpanded = expandedCustomerId === customer.customerId;
                const key = customer.customerId === null ? 'null' : customer.customerId.toString();
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
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        )}
                        <Building2 className="w-5 h-5 text-slate-400" />
                        <div className="text-left">
                          <div className="font-medium text-slate-900">{customer.customerName}</div>
                          <div className="text-xs text-slate-500">{customer.uniqueUsers} users</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
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
        )}

        {viewMode === 'users' && (
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
            Daily Request Volume
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

      <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-slate-400" />
          Pricing Reference
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <div className="text-slate-500 mb-1">AI Model - Input</div>
            <div className="text-xl font-semibold text-slate-900">$3.00 / MTok</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <div className="text-slate-500 mb-1">AI Model - Output</div>
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
