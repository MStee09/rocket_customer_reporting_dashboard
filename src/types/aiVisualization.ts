export interface ParsedQuery {
  intent: 'analyze' | 'compare' | 'trend' | 'breakdown' | 'find' | 'summarize';
  metrics: string[];
  dimensions: string[];
  filters: Array<{
    field: string;
    operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'between';
    value: string | number | string[] | [number, number];
  }>;
  timeRange?: {
    start: string;
    end: string;
    granularity: 'day' | 'week' | 'month' | 'quarter' | 'year';
  };
  comparison?: {
    type: 'entities' | 'periods' | 'benchmarks';
    targets: string[];
  };
  geographic?: {
    level: 'state' | 'region' | 'city' | 'zip';
    focus?: string[];
  };
}

export interface DataProfile {
  rowCount: number;
  columns: Array<{
    name: string;
    type: 'numeric' | 'categorical' | 'temporal' | 'geographic';
    cardinality: number;
    nullPercent: number;
    uniqueValues?: string[];
    stats?: {
      min: number;
      max: number;
      mean: number;
      median: number;
      stdDev: number;
      outlierCount: number;
    };
  }>;
  patterns: {
    hasTrend: boolean;
    trendDirection?: 'up' | 'down' | 'flat';
    hasSeasonality: boolean;
    hasOutliers: boolean;
    outlierPercent: number;
    hasClustering: boolean;
  };
  geographicCoverage?: {
    stateCount: number;
    regionConcentration: Record<string, number>;
  };
}

export interface VisualizationRecommendation {
  primary: {
    type: string;
    config: Record<string, any>;
    score: number;
    reasoning: string;
  };
  alternatives: Array<{
    type: string;
    config: Record<string, any>;
    score: number;
    reasoning: string;
  }>;
}

export interface AIInsight {
  type: 'anomaly' | 'trend' | 'pattern' | 'comparison' | 'recommendation';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  evidence: Array<{ metric: string; value: number | string; context?: string }>;
  action?: { label: string; query?: string; vizType?: string };
}

export interface FollowUpSuggestion {
  question: string;
  intent: ParsedQuery['intent'];
  relevance: number;
  category: 'drill_down' | 'compare' | 'trend' | 'root_cause' | 'action';
}
