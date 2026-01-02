import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface AIUsageSummary {
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  avgLatencyMs: number;
  successRate: number;
  uniqueUsers: number;
  uniqueCustomers: number;
  requestsToday: number;
  costToday: number;
}

export interface UserUsageRow {
  userId: string;
  userEmail: string;
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  avgLatencyMs: number;
  lastUsed: string;
}

export interface CustomerUsageRow {
  customerId: number | null;
  customerName: string;
  totalRequests: number;
  totalTokens: number;
  totalCostUsd: number;
  uniqueUsers: number;
  users: UserUsageRow[];
}

export interface DailyUsageRow {
  date: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  uniqueUsers: number;
}

export interface CostSummary {
  periodStart: string;
  periodEnd: string;
  totalCost: number;
  projectedMonthlyCost: number;
  avgDailyCost: number;
  daysInPeriod: number;
}

export function useAIUsageDashboard(daysBack: number = 30) {
  const [summary, setSummary] = useState<AIUsageSummary | null>(null);
  const [userUsage, setUserUsage] = useState<UserUsageRow[]>([]);
  const [customerUsage, setCustomerUsage] = useState<CustomerUsageRow[]>([]);
  const [dailyUsage, setDailyUsage] = useState<DailyUsageRow[]>([]);
  const [costSummary, setCostSummary] = useState<CostSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('get_ai_usage_dashboard', {
        p_days: daysBack
      });

      if (rpcError) throw rpcError;

      if (data) {
        const summaryData = data.summary || {};

        setSummary({
          totalRequests: summaryData.total_requests || 0,
          totalInputTokens: summaryData.total_input_tokens || 0,
          totalOutputTokens: summaryData.total_output_tokens || 0,
          totalCostUsd: summaryData.total_cost_usd || 0,
          avgLatencyMs: summaryData.avg_latency_ms || 0,
          successRate: summaryData.total_requests > 0
            ? ((summaryData.successful_requests || 0) / summaryData.total_requests * 100)
            : 0,
          uniqueUsers: (data.by_user || []).length,
          uniqueCustomers: (data.by_customer || []).length,
          requestsToday: data.current_month?.requests || 0,
          costToday: data.current_month?.cost_usd || 0
        });

        // Parse user usage
        const users = (data.by_user || [])
          .filter((u: Record<string, unknown>) => u.user_email !== 'test@example.com')
          .map((u: Record<string, unknown>) => ({
            userId: u.user_id as string,
            userEmail: u.user_email as string,
            totalRequests: u.request_count as number,
            totalInputTokens: u.input_tokens as number,
            totalOutputTokens: u.output_tokens as number,
            totalCostUsd: u.total_cost as number,
            avgLatencyMs: 0,
            lastUsed: u.last_request as string
          }));
        setUserUsage(users);

        // Parse customer usage
        const customers = (data.by_customer || []).map((c: Record<string, unknown>) => ({
          customerId: c.customer_id as number | null,
          customerName: c.customer_name as string || 'Admin / No Customer',
          totalRequests: c.request_count as number,
          totalTokens: c.total_tokens as number,
          totalCostUsd: c.total_cost as number,
          uniqueUsers: c.unique_users as number,
          users: [] as UserUsageRow[] // Will be populated on drill-down
        }));
        
        // Add "Admin / No Customer" entry for null customer_ids if not present
        const hasNullCustomer = customers.some(c => c.customerId === null);
        if (!hasNullCustomer && users.length > 0) {
          // Check raw data for null customer entries
          const adminRequests = (data.by_customer || []).find((c: Record<string, unknown>) => c.customer_id === null);
          if (adminRequests) {
            customers.unshift({
              customerId: null,
              customerName: 'Admin / No Customer',
              totalRequests: adminRequests.request_count as number,
              totalTokens: adminRequests.total_tokens as number,
              totalCostUsd: adminRequests.total_cost as number,
              uniqueUsers: adminRequests.unique_users as number,
              users: []
            });
          }
        }
        
        setCustomerUsage(customers);

        setDailyUsage((data.daily_trend || []).map((d: Record<string, unknown>) => ({
          date: d.date as string,
          requests: d.requests as number,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: d.cost as number,
          uniqueUsers: d.unique_users as number
        })));
      }
    } catch (err) {
      console.error('Failed to fetch AI usage dashboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load usage data');
    }

    try {
      const { data: costData, error: costError } = await supabase.rpc('get_ai_cost_summary');

      if (!costError && costData) {
        const today = new Date();
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        const dayOfMonth = today.getDate();
        const thisMonthCost = costData.this_month || 0;
        const avgDailyCost = dayOfMonth > 0 ? thisMonthCost / dayOfMonth : 0;
        const projectedMonthlyCost = avgDailyCost * daysInMonth;

        setCostSummary({
          periodStart: new Date(today.getFullYear(), today.getMonth(), 1).toISOString(),
          periodEnd: today.toISOString(),
          totalCost: thisMonthCost,
          projectedMonthlyCost,
          avgDailyCost,
          daysInPeriod: dayOfMonth
        });
      }
    } catch (err) {
      console.error('Failed to fetch cost summary:', err);
    }

    setLoading(false);
  }, [daysBack]);

  // Fetch users for a specific customer
  const fetchUsersForCustomer = useCallback(async (customerId: number | null) => {
    try {
      const { data, error } = await supabase.rpc('get_ai_usage_by_customer', {
        p_customer_id: customerId,
        p_days: daysBack
      });

      if (error) {
        console.error('Failed to fetch users for customer:', error);
        return [];
      }

      return (data?.users || [])
        .filter((u: Record<string, unknown>) => u.user_email !== 'test@example.com')
        .map((u: Record<string, unknown>) => ({
          userId: u.user_id as string,
          userEmail: u.user_email as string,
          totalRequests: u.request_count as number,
          totalInputTokens: u.input_tokens as number,
          totalOutputTokens: u.output_tokens as number,
          totalCostUsd: u.total_cost as number,
          avgLatencyMs: u.avg_latency_ms as number || 0,
          lastUsed: u.last_request as string
        }));
    } catch (err) {
      console.error('Failed to fetch users for customer:', err);
      return [];
    }
  }, [daysBack]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return {
    summary,
    userUsage,
    customerUsage,
    dailyUsage,
    costSummary,
    loading,
    error,
    refresh: fetchDashboard,
    fetchUsersForCustomer
  };
}

export function useUserAIUsage(userId: string, daysBack: number = 30) {
  const [usage, setUsage] = useState<{
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    recentRequests: Array<{
      createdAt: string;
      inputTokens: number;
      outputTokens: number;
      costUsd: number;
      customerName: string | null;
      status: string;
    }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchUsage = async () => {
      setLoading(true);

      try {
        const { data, error } = await supabase.rpc('get_user_ai_usage', {
          p_user_id: userId,
          p_days: daysBack
        });

        if (!error && data) {
          setUsage({
            totalRequests: data.total_requests || 0,
            totalTokens: data.total_tokens || 0,
            totalCost: data.total_cost || 0,
            recentRequests: (data.recent_requests || []).map((r: Record<string, unknown>) => ({
              createdAt: r.created_at as string,
              inputTokens: r.input_tokens as number,
              outputTokens: r.output_tokens as number,
              costUsd: r.cost_usd as number,
              customerName: r.customer_name as string | null,
              status: r.status as string
            }))
          });
        }
      } catch (err) {
        console.error('Failed to fetch user AI usage:', err);
      }

      setLoading(false);
    };

    fetchUsage();
  }, [userId, daysBack]);

  return { usage, loading };
}
