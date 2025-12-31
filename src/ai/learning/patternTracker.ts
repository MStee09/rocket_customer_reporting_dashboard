import { supabase } from '../../lib/supabase';

export interface UsagePattern {
  patternType: 'time_of_day' | 'day_of_week' | 'report_type' | 'field_combination' | 'question_type';
  key: string;
  frequency: number;
  lastOccurrence: Date;
}

export interface ProactiveInsight {
  type: 'anomaly' | 'trend' | 'suggestion' | 'reminder';
  title: string;
  description: string;
  priority: number;
  relatedReport?: string;
  data?: unknown;
}

export class PatternTracker {
  private customerId: string;

  constructor(customerId: string) {
    this.customerId = customerId;
  }

  async recordUsage(event: {
    eventType: 'report_generated' | 'question_asked' | 'section_added';
    details: Record<string, unknown>;
  }): Promise<void> {
    const now = new Date();

    await supabase.from('ai_usage_events').insert({
      customer_id: parseInt(this.customerId),
      event_type: event.eventType,
      event_details: event.details,
      hour_of_day: now.getHours(),
      day_of_week: now.getDay(),
      created_at: now.toISOString()
    });
  }

  async analyzePatterns(): Promise<UsagePattern[]> {
    const patterns: UsagePattern[] = [];

    const { data: events } = await supabase
      .from('ai_usage_events')
      .select('*')
      .eq('customer_id', this.customerId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (!events || events.length === 0) return patterns;

    const hourCounts: Record<number, number> = {};
    const dayCounts: Record<number, number> = {};
    const reportTypes: Record<string, number> = {};

    for (const event of events) {
      hourCounts[event.hour_of_day] = (hourCounts[event.hour_of_day] || 0) + 1;
      dayCounts[event.day_of_week] = (dayCounts[event.day_of_week] || 0) + 1;

      if ((event.event_details as Record<string, unknown>)?.reportType) {
        const reportType = (event.event_details as Record<string, unknown>).reportType as string;
        reportTypes[reportType] = (reportTypes[reportType] || 0) + 1;
      }
    }

    const peakHour = Object.entries(hourCounts)
      .sort((a, b) => b[1] - a[1])[0];
    if (peakHour && peakHour[1] >= 5) {
      patterns.push({
        patternType: 'time_of_day',
        key: `peak_hour_${peakHour[0]}`,
        frequency: peakHour[1],
        lastOccurrence: new Date()
      });
    }

    const peakDay = Object.entries(dayCounts)
      .sort((a, b) => b[1] - a[1])[0];
    if (peakDay && peakDay[1] >= 3) {
      patterns.push({
        patternType: 'day_of_week',
        key: `peak_day_${peakDay[0]}`,
        frequency: peakDay[1],
        lastOccurrence: new Date()
      });
    }

    for (const [type, count] of Object.entries(reportTypes)) {
      if (count >= 3) {
        patterns.push({
          patternType: 'report_type',
          key: type,
          frequency: count,
          lastOccurrence: new Date()
        });
      }
    }

    return patterns;
  }

  async generateInsights(): Promise<ProactiveInsight[]> {
    const insights: ProactiveInsight[] = [];
    const patterns = await this.analyzePatterns();

    for (const pattern of patterns) {
      if (pattern.patternType === 'day_of_week' && pattern.frequency >= 5) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayIndex = parseInt(pattern.key.split('_')[2]);
        insights.push({
          type: 'reminder',
          title: `It's ${dayNames[dayIndex]}!`,
          description: `You often run reports on ${dayNames[dayIndex]}s. Ready for your weekly analysis?`,
          priority: 5
        });
      }
    }

    const anomalies = await this.checkForAnomalies();
    insights.push(...anomalies);

    return insights.sort((a, b) => b.priority - a.priority);
  }

  private async checkForAnomalies(): Promise<ProactiveInsight[]> {
    const insights: ProactiveInsight[] = [];
    return insights;
  }
}
