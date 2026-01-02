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
          requestsToday: data.current_month?.requests || 0,
          costToday: data.current_month?.cost_usd || 0
        });

        setUserUsage((data.by_user || []).map((u: Record<string, unknown>) => ({
          userId: u.user_id as string,
          userEmail: u.user_email as string,
          totalRequests: u.request_count as number,
          totalInputTokens: u.input_tokens as number,
          totalOutputTokens: u.output_tokens as number,
          totalCostUsd: u.total_cost as number,
          avgLatencyMs: 0,
          lastUsed: u.last_request as string
        })));

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

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return {
    summary,
    userUsage,
    dailyUsage,
    costSummary,
    loading,
    error,
    refresh: fetchDashboard
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
