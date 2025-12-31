import { supabase } from '../lib/supabase';
import type {
  CustomerHealthScore,
  CustomerHealthAlert,
  CustomerHealthHistory,
  HealthScoreSummary,
  HealthStatus
} from '../types/customerHealth';

export const customerHealthService = {
  async getHealthScores(): Promise<CustomerHealthScore[]> {
    const { data, error } = await supabase
      .from('customer_health_scores')
      .select(`
        *,
        customer:customer_id (company_name)
      `)
      .order('overall_score', { ascending: true });

    if (error) throw error;

    return (data || []).map(score => ({
      ...score,
      customer_name: score.customer?.company_name || `Customer ${score.customer_id}`
    }));
  },

  async getHealthScoresByStatus(status: HealthStatus): Promise<CustomerHealthScore[]> {
    const { data, error } = await supabase
      .from('customer_health_scores')
      .select(`
        *,
        customer:customer_id (company_name)
      `)
      .eq('status', status)
      .order('overall_score', { ascending: true });

    if (error) throw error;

    return (data || []).map(score => ({
      ...score,
      customer_name: score.customer?.company_name || `Customer ${score.customer_id}`
    }));
  },

  async getSummary(): Promise<HealthScoreSummary> {
    const { data, error } = await supabase
      .from('customer_health_scores')
      .select('overall_score, status, revenue_previous_period');

    if (error) throw error;

    const scores = data || [];
    const statusCounts: Record<HealthStatus, number> = {
      thriving: 0,
      healthy: 0,
      watch: 0,
      'at-risk': 0,
      critical: 0
    };

    let totalScore = 0;
    let atRiskRevenue = 0;

    scores.forEach(score => {
      statusCounts[score.status as HealthStatus]++;
      totalScore += score.overall_score;
      if (score.status === 'at-risk' || score.status === 'critical') {
        atRiskRevenue += score.revenue_previous_period || 0;
      }
    });

    return {
      totalCustomers: scores.length,
      avgScore: scores.length > 0 ? Math.round(totalScore / scores.length) : 0,
      atRiskCount: statusCounts['at-risk'] + statusCounts.critical,
      atRiskRevenue,
      statusCounts
    };
  },

  async getActiveAlerts(): Promise<CustomerHealthAlert[]> {
    const { data, error } = await supabase
      .from('customer_health_alerts')
      .select(`
        *,
        customer:customer_id (company_name)
      `)
      .eq('is_acknowledged', false)
      .eq('is_dismissed', false)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(alert => ({
      ...alert,
      customer_name: alert.customer?.company_name || `Customer ${alert.customer_id}`
    }));
  },

  async acknowledgeAlert(alertId: string): Promise<void> {
    const { error } = await supabase
      .from('customer_health_alerts')
      .update({
        is_acknowledged: true,
        acknowledged_at: new Date().toISOString()
      })
      .eq('id', alertId);

    if (error) throw error;
  },

  async dismissAlert(alertId: string): Promise<void> {
    const { error } = await supabase
      .from('customer_health_alerts')
      .update({ is_dismissed: true })
      .eq('id', alertId);

    if (error) throw error;
  },

  async getCustomerHistory(customerId: number, days: number = 30): Promise<CustomerHealthHistory[]> {
    const { data, error } = await supabase
      .from('customer_health_history')
      .select('*')
      .eq('customer_id', customerId)
      .gte('recorded_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('recorded_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async recalculateAllScores(): Promise<number> {
    const { data, error } = await supabase.rpc('recalculate_all_health_scores');
    if (error) throw error;
    return data as number;
  },

  async calculateCustomerScore(customerId: number): Promise<CustomerHealthScore> {
    const { data, error } = await supabase.rpc('calculate_customer_health_score', {
      p_customer_id: customerId
    });
    if (error) throw error;
    return data as CustomerHealthScore;
  }
};
