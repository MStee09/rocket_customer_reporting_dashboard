# PHASE 4: AI INTELLIGENCE LAYER - Bolt Prompt

Copy everything below into Bolt:

---

I want to add an AI intelligence layer that can analyze data and recommend the best visualizations. This will power my AI Report Studio with smart suggestions. Create these services:

1. **Query Parser** - Parse natural language queries into structured requests
2. **Data Profiler** - Analyze data characteristics (cardinality, distributions, outliers)  
3. **Visualization Scorer** - Score and recommend the best chart type
4. **Narrative Generator** - Generate insights and follow-up suggestions

---

## FILE: src/types/aiVisualization.ts

```typescript
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
```

---

## FILE: src/services/ai/queryParser.ts

```typescript
import { ParsedQuery } from '../../types/aiVisualization';

const INTENT_KEYWORDS = {
  analyze: ['show', 'display', 'what', 'how much', 'analyze', 'give me'],
  compare: ['compare', 'versus', 'vs', 'difference', 'between', 'against'],
  trend: ['trend', 'over time', 'change', 'growth', 'decline', 'history', 'monthly', 'weekly'],
  breakdown: ['breakdown', 'by', 'per', 'split', 'segment', 'composition', 'distribution'],
  find: ['find', 'where', 'which', 'top', 'bottom', 'highest', 'lowest', 'best', 'worst'],
  summarize: ['summary', 'summarize', 'overview', 'total', 'aggregate'],
};

const METRIC_SYNONYMS: Record<string, string[]> = {
  cost: ['cost', 'spend', 'expense', 'price', 'rate', 'charge', 'fee'],
  shipments: ['shipments', 'shipment', 'loads', 'orders', 'volume', 'count'],
  transit: ['transit', 'delivery', 'days', 'time', 'duration', 'lead time'],
  claims: ['claims', 'damage', 'loss', 'issues', 'problems'],
  margin: ['margin', 'profit', 'markup'],
  weight: ['weight', 'pounds', 'lbs', 'tonnage'],
};

const DIMENSION_SYNONYMS: Record<string, string[]> = {
  state: ['state', 'states', 'destination', 'origin', 'region', 'location', 'geography'],
  carrier: ['carrier', 'carriers', 'vendor', 'provider'],
  mode: ['mode', 'service', 'type', 'method'],
  customer: ['customer', 'client', 'account', 'shipper'],
  lane: ['lane', 'route', 'corridor'],
  month: ['month', 'monthly'],
  week: ['week', 'weekly'],
  day: ['day', 'daily', 'date'],
};

const TIME_KEYWORDS: Record<string, () => { start: string; end: string }> = {
  'today': () => {
    const d = new Date();
    const dateStr = d.toISOString().split('T')[0];
    return { start: dateStr, end: dateStr };
  },
  'this week': () => {
    const d = new Date();
    const start = new Date(d.setDate(d.getDate() - d.getDay()));
    return { start: start.toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] };
  },
  'this month': () => {
    const d = new Date();
    return {
      start: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`,
      end: d.toISOString().split('T')[0],
    };
  },
  'last month': () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
  },
  'last 30 days': () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
  },
  'last 90 days': () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 90);
    return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
  },
  'ytd': () => {
    const d = new Date();
    return { start: `${d.getFullYear()}-01-01`, end: d.toISOString().split('T')[0] };
  },
};

export function parseQuery(query: string): ParsedQuery {
  const normalizedQuery = query.toLowerCase().trim();
  
  // Detect intent
  let intent: ParsedQuery['intent'] = 'analyze';
  for (const [intentType, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (keywords.some(kw => normalizedQuery.includes(kw))) {
      intent = intentType as ParsedQuery['intent'];
      break;
    }
  }
  
  // Extract metrics
  const metrics: string[] = [];
  for (const [metric, synonyms] of Object.entries(METRIC_SYNONYMS)) {
    if (synonyms.some(syn => normalizedQuery.includes(syn))) {
      metrics.push(metric);
    }
  }
  if (metrics.length === 0) metrics.push('cost');
  
  // Extract dimensions
  const dimensions: string[] = [];
  for (const [dimension, synonyms] of Object.entries(DIMENSION_SYNONYMS)) {
    if (synonyms.some(syn => normalizedQuery.includes(syn))) {
      dimensions.push(dimension);
    }
  }
  
  // Extract time range
  let timeRange: ParsedQuery['timeRange'] | undefined;
  for (const [keyword, generator] of Object.entries(TIME_KEYWORDS)) {
    if (normalizedQuery.includes(keyword)) {
      const range = generator();
      timeRange = {
        ...range,
        granularity: keyword.includes('day') ? 'day' : keyword.includes('week') ? 'week' : 'month',
      };
      break;
    }
  }
  
  // Extract filters
  const filters: ParsedQuery['filters'] = [];
  
  const stateMatch = normalizedQuery.match(/\b(in|for|from)\s+([A-Z]{2})\b/i);
  if (stateMatch) {
    filters.push({ field: 'state', operator: 'eq', value: stateMatch[2].toUpperCase() });
  }
  
  const topMatch = normalizedQuery.match(/top\s+(\d+)/i);
  const bottomMatch = normalizedQuery.match(/bottom\s+(\d+)/i);
  if (topMatch) {
    filters.push({ field: '_limit', operator: 'eq', value: parseInt(topMatch[1]) });
    filters.push({ field: '_sort', operator: 'eq', value: 'desc' });
  } else if (bottomMatch) {
    filters.push({ field: '_limit', operator: 'eq', value: parseInt(bottomMatch[1]) });
    filters.push({ field: '_sort', operator: 'eq', value: 'asc' });
  }
  
  // Detect geographic focus
  let geographic: ParsedQuery['geographic'] | undefined;
  if (dimensions.includes('state') || normalizedQuery.includes('map') || normalizedQuery.includes('geographic')) {
    geographic = { level: 'state' };
  }
  
  // Detect comparison
  let comparison: ParsedQuery['comparison'] | undefined;
  if (intent === 'compare') {
    const vsMatch = normalizedQuery.match(/(\w+)\s+(?:vs|versus|compared to)\s+(\w+)/i);
    if (vsMatch) {
      comparison = { type: 'entities', targets: [vsMatch[1], vsMatch[2]] };
    }
  }
  
  return { intent, metrics, dimensions, filters, timeRange, geographic, comparison };
}

export default parseQuery;
```

---

## FILE: src/services/ai/dataProfiler.ts

```typescript
import { DataProfile } from '../../types/aiVisualization';

export function profileData(data: Record<string, any>[], columns?: string[]): DataProfile {
  if (!data.length) {
    return {
      rowCount: 0,
      columns: [],
      patterns: { hasTrend: false, hasSeasonality: false, hasOutliers: false, outlierPercent: 0, hasClustering: false },
    };
  }
  
  const cols = columns || Object.keys(data[0]);
  
  const columnProfiles = cols.map(colName => {
    const values = data.map(row => row[colName]).filter(v => v !== null && v !== undefined);
    const nullPercent = ((data.length - values.length) / data.length) * 100;
    
    const sampleValue = values[0];
    let type: 'numeric' | 'categorical' | 'temporal' | 'geographic';
    
    if (typeof sampleValue === 'number') {
      type = 'numeric';
    } else if (sampleValue instanceof Date || /^\d{4}-\d{2}-\d{2}/.test(String(sampleValue))) {
      type = 'temporal';
    } else if (/^[A-Z]{2}$/.test(String(sampleValue)) || ['state', 'region', 'zip'].some(g => colName.toLowerCase().includes(g))) {
      type = 'geographic';
    } else {
      type = 'categorical';
    }
    
    const uniqueValues = [...new Set(values.map(v => String(v)))];
    const cardinality = uniqueValues.length;
    
    const profile: DataProfile['columns'][0] = { name: colName, type, cardinality, nullPercent };
    
    if (type === 'categorical' && cardinality <= 20) {
      profile.uniqueValues = uniqueValues.slice(0, 20);
    }
    
    if (type === 'numeric') {
      const numericValues = values.map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b);
      if (numericValues.length > 0) {
        const sum = numericValues.reduce((a, b) => a + b, 0);
        const mean = sum / numericValues.length;
        const median = numericValues[Math.floor(numericValues.length / 2)];
        const squaredDiffs = numericValues.map(v => Math.pow(v - mean, 2));
        const stdDev = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / numericValues.length);
        const outlierThreshold = 2 * stdDev;
        const outlierCount = numericValues.filter(v => Math.abs(v - mean) > outlierThreshold).length;
        
        profile.stats = {
          min: numericValues[0],
          max: numericValues[numericValues.length - 1],
          mean,
          median,
          stdDev,
          outlierCount,
        };
      }
    }
    
    return profile;
  });
  
  const numericColumns = columnProfiles.filter(c => c.type === 'numeric');
  const hasOutliers = numericColumns.some(c => c.stats && c.stats.outlierCount > 0);
  const outlierPercent = numericColumns.length > 0
    ? numericColumns.reduce((sum, c) => sum + (c.stats?.outlierCount || 0), 0) / (data.length * numericColumns.length) * 100
    : 0;
  
  const temporalCol = columnProfiles.find(c => c.type === 'temporal');
  const primaryNumeric = numericColumns[0];
  let hasTrend = false;
  let trendDirection: 'up' | 'down' | 'flat' | undefined;
  
  if (temporalCol && primaryNumeric) {
    const sortedByTime = [...data].sort((a, b) => 
      new Date(a[temporalCol.name]).getTime() - new Date(b[temporalCol.name]).getTime()
    );
    const third = Math.floor(sortedByTime.length / 3);
    if (third > 0) {
      const firstThirdAvg = sortedByTime.slice(0, third).reduce((sum, row) => sum + Number(row[primaryNumeric.name]), 0) / third;
      const lastThirdAvg = sortedByTime.slice(-third).reduce((sum, row) => sum + Number(row[primaryNumeric.name]), 0) / third;
      const changePct = ((lastThirdAvg - firstThirdAvg) / firstThirdAvg) * 100;
      if (Math.abs(changePct) > 10) {
        hasTrend = true;
        trendDirection = changePct > 0 ? 'up' : 'down';
      } else {
        trendDirection = 'flat';
      }
    }
  }
  
  const geoCol = columnProfiles.find(c => c.type === 'geographic');
  let geographicCoverage: DataProfile['geographicCoverage'] | undefined;
  
  if (geoCol) {
    const stateCounts = data.reduce((acc, row) => {
      const state = row[geoCol.name];
      if (state) acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    geographicCoverage = {
      stateCount: Object.keys(stateCounts).length,
      regionConcentration: stateCounts,
    };
  }
  
  return {
    rowCount: data.length,
    columns: columnProfiles,
    patterns: { hasTrend, trendDirection, hasSeasonality: false, hasOutliers, outlierPercent, hasClustering: !!geographicCoverage },
    geographicCoverage,
  };
}

export default profileData;
```

---

## FILE: src/services/ai/visualizationScorer.ts

```typescript
import { ParsedQuery, DataProfile, VisualizationRecommendation } from '../../types/aiVisualization';

const VIZ_TYPES = {
  choropleth: { requires: { geographic: true }, prefers: { cardinality: [10, 60] } },
  bar: { requires: {}, prefers: { cardinality: [2, 15], intent: ['compare', 'breakdown'] } },
  line: { requires: { temporal: true }, prefers: { hasTrend: true } },
  radar: { requires: { multiMetric: true }, prefers: { entityCount: [2, 5] } },
  treemap: { requires: {}, prefers: { hasHierarchy: true, intent: ['breakdown'] } },
  waterfall: { requires: {}, prefers: { intent: ['breakdown'] } },
  calendar: { requires: { temporal: true }, prefers: { granularity: 'day' } },
  pie: { requires: {}, prefers: { cardinality: [2, 6], intent: ['breakdown'] } },
  table: { requires: {}, prefers: { cardinality: [20, Infinity] } },
};

export function recommendVisualization(query: ParsedQuery, profile: DataProfile): VisualizationRecommendation {
  const scores: Array<{ type: string; score: number; reasoning: string[] }> = [];
  
  for (const [vizKey, viz] of Object.entries(VIZ_TYPES)) {
    let score = 50;
    const reasoning: string[] = [];
    
    // Check requirements
    if (viz.requires.geographic && !profile.geographicCoverage) {
      scores.push({ type: vizKey, score: 0, reasoning: ['Requires geographic data'] });
      continue;
    }
    if (viz.requires.temporal && !profile.columns.some(c => c.type === 'temporal')) {
      scores.push({ type: vizKey, score: 0, reasoning: ['Requires temporal data'] });
      continue;
    }
    if (viz.requires.multiMetric && query.metrics.length < 2) {
      scores.push({ type: vizKey, score: 0, reasoning: ['Requires multiple metrics'] });
      continue;
    }
    
    // Geographic boost for choropleth
    if (vizKey === 'choropleth' && profile.geographicCoverage) {
      score += 30;
      reasoning.push(`Geographic coverage: ${profile.geographicCoverage.stateCount} states`);
      if (profile.geographicCoverage.stateCount >= 15) {
        score += 10;
        reasoning.push('Good state coverage');
      }
    }
    
    // Temporal boost for line/calendar
    if ((vizKey === 'line' || vizKey === 'calendar') && profile.columns.some(c => c.type === 'temporal')) {
      score += 25;
      reasoning.push('Temporal data present');
      if (profile.patterns.hasTrend) {
        score += 10;
        reasoning.push(`Trend detected: ${profile.patterns.trendDirection}`);
      }
    }
    
    // Intent boost
    if (viz.prefers.intent && viz.prefers.intent.includes(query.intent)) {
      score += 15;
      reasoning.push(`Matches intent: ${query.intent}`);
    }
    
    // Cardinality check
    const primaryDimension = profile.columns.find(c => c.type === 'categorical' || c.type === 'geographic');
    if (primaryDimension && viz.prefers.cardinality) {
      const [min, max] = viz.prefers.cardinality;
      if (primaryDimension.cardinality >= min && primaryDimension.cardinality <= max) {
        score += 10;
        reasoning.push(`Cardinality (${primaryDimension.cardinality}) fits well`);
      }
    }
    
    // Penalize pie for too many categories
    if (vizKey === 'pie' && primaryDimension && primaryDimension.cardinality > 6) {
      score -= 30;
      reasoning.push('Too many categories for pie chart');
    }
    
    // Boost radar for comparisons
    if (vizKey === 'radar' && query.intent === 'compare' && query.metrics.length >= 3) {
      score += 20;
      reasoning.push('Multi-metric comparison ideal for radar');
    }
    
    scores.push({ type: vizKey, score: Math.max(0, Math.min(100, score)), reasoning });
  }
  
  scores.sort((a, b) => b.score - a.score);
  
  const primary = scores[0];
  const alternatives = scores.slice(1, 4).filter(s => s.score >= 40);
  
  return {
    primary: {
      type: primary.type,
      config: buildVizConfig(primary.type, query, profile),
      score: primary.score,
      reasoning: primary.reasoning.join('. '),
    },
    alternatives: alternatives.map(alt => ({
      type: alt.type,
      config: buildVizConfig(alt.type, query, profile),
      score: alt.score,
      reasoning: alt.reasoning.join('. '),
    })),
  };
}

function buildVizConfig(vizType: string, query: ParsedQuery, profile: DataProfile): Record<string, any> {
  const config: Record<string, any> = { metrics: query.metrics, dimensions: query.dimensions };
  
  switch (vizType) {
    case 'choropleth':
      config.scenario = query.metrics[0] === 'cost' ? 'cost-to-serve' :
                        query.metrics[0] === 'shipments' ? 'demand-density' :
                        query.metrics[0] === 'transit' ? 'transit-time' : 'cost-to-serve';
      config.showAIInsights = true;
      break;
    case 'line':
      config.xAxis = profile.columns.find(c => c.type === 'temporal')?.name || 'date';
      config.showTrendLine = profile.patterns.hasTrend;
      break;
    case 'radar':
      config.entityKey = query.dimensions[0] || 'carrier';
      break;
  }
  
  return config;
}

export default recommendVisualization;
```

---

## FILE: src/services/ai/narrativeGenerator.ts

```typescript
import { DataProfile, AIInsight, FollowUpSuggestion, ParsedQuery } from '../../types/aiVisualization';

export function generateInsights(
  data: Record<string, any>[],
  profile: DataProfile,
  query: ParsedQuery
): AIInsight[] {
  const insights: AIInsight[] = [];
  
  // Outlier detection
  const numericCols = profile.columns.filter(c => c.type === 'numeric' && c.stats);
  for (const col of numericCols) {
    if (col.stats && col.stats.outlierCount > 0) {
      const outlierPercent = (col.stats.outlierCount / profile.rowCount * 100).toFixed(1);
      insights.push({
        type: 'anomaly',
        severity: col.stats.outlierCount > profile.rowCount * 0.1 ? 'warning' : 'info',
        title: `${col.stats.outlierCount} outliers in ${col.name}`,
        description: `${outlierPercent}% of values are more than 2 std devs from mean`,
        evidence: [
          { metric: 'Mean', value: col.stats.mean.toFixed(2) },
          { metric: 'Outlier Count', value: col.stats.outlierCount },
        ],
        action: { label: 'View outliers', query: `Show ${col.name} outliers` },
      });
    }
  }
  
  // Trend detection
  if (profile.patterns.hasTrend && profile.patterns.trendDirection) {
    const metric = numericCols[0]?.name || 'value';
    insights.push({
      type: 'trend',
      severity: 'info',
      title: `${profile.patterns.trendDirection === 'up' ? 'Upward' : 'Downward'} trend detected`,
      description: `${metric} is trending ${profile.patterns.trendDirection}`,
      evidence: [{ metric: 'Trend', value: profile.patterns.trendDirection }],
      action: { label: 'Analyze trend', vizType: 'line' },
    });
  }
  
  // Geographic concentration
  if (profile.geographicCoverage) {
    const { stateCount, regionConcentration } = profile.geographicCoverage;
    const sortedStates = Object.entries(regionConcentration).sort(([, a], [, b]) => b - a);
    
    if (sortedStates.length > 0) {
      const [topState, topCount] = sortedStates[0];
      const topPercent = (topCount / profile.rowCount * 100).toFixed(1);
      
      if (parseFloat(topPercent) > 25) {
        insights.push({
          type: 'pattern',
          severity: 'info',
          title: `High concentration in ${topState}`,
          description: `${topPercent}% of activity in ${topState}`,
          evidence: [
            { metric: topState, value: `${topPercent}%` },
            { metric: 'States with data', value: stateCount },
          ],
          action: { label: 'Drill into state', query: `Show breakdown for ${topState}` },
        });
      }
    }
  }
  
  return insights;
}

export function generateFollowUps(
  query: ParsedQuery,
  profile: DataProfile,
  insights: AIInsight[]
): FollowUpSuggestion[] {
  const suggestions: FollowUpSuggestion[] = [];
  
  // Drill-down suggestions
  const highCardinalityCol = profile.columns.find(c => c.cardinality > 5 && c.type === 'categorical');
  if (highCardinalityCol) {
    suggestions.push({
      question: `What are the top 10 ${highCardinalityCol.name}s by ${query.metrics[0] || 'volume'}?`,
      intent: 'find',
      relevance: 0.9,
      category: 'drill_down',
    });
  }
  
  // Comparison suggestions
  if (!query.comparison) {
    suggestions.push({
      question: 'How does this compare to last month?',
      intent: 'compare',
      relevance: 0.85,
      category: 'compare',
    });
  }
  
  // Trend suggestions
  if (!query.timeRange) {
    suggestions.push({
      question: `Show ${query.metrics[0] || 'this'} trend over the last 90 days`,
      intent: 'trend',
      relevance: 0.8,
      category: 'trend',
    });
  }
  
  // Root cause from insights
  const anomalyInsight = insights.find(i => i.type === 'anomaly');
  if (anomalyInsight) {
    suggestions.push({
      question: `What's causing the ${anomalyInsight.title.toLowerCase()}?`,
      intent: 'analyze',
      relevance: 0.95,
      category: 'root_cause',
    });
  }
  
  // Geographic drill-down
  if (profile.geographicCoverage) {
    const topState = Object.entries(profile.geographicCoverage.regionConcentration)
      .sort(([, a], [, b]) => b - a)[0];
    if (topState) {
      suggestions.push({
        question: `Break down ${topState[0]} by carrier`,
        intent: 'breakdown',
        relevance: 0.75,
        category: 'drill_down',
      });
    }
  }
  
  return suggestions.sort((a, b) => b.relevance - a.relevance).slice(0, 4);
}

export default { generateInsights, generateFollowUps };
```

---

## FILE: src/services/ai/index.ts

```typescript
export { parseQuery } from './queryParser';
export { profileData } from './dataProfiler';
export { recommendVisualization } from './visualizationScorer';
export { generateInsights, generateFollowUps } from './narrativeGenerator';

export type {
  ParsedQuery,
  DataProfile,
  VisualizationRecommendation,
  AIInsight,
  FollowUpSuggestion,
} from '../../types/aiVisualization';
```

---

That's Phase 4! This AI layer powers intelligent visualization recommendations.

Example usage in your AI Report Studio:

```tsx
import { parseQuery, profileData, recommendVisualization, generateInsights, generateFollowUps } from './services/ai';

async function handleUserQuery(userMessage: string, data: any[]) {
  // 1. Parse natural language
  const parsed = parseQuery(userMessage);
  // { intent: 'analyze', metrics: ['cost'], dimensions: ['state'] }
  
  // 2. Profile the data
  const profile = profileData(data);
  // { rowCount: 1234, patterns: { hasTrend: true }, geographicCoverage: { stateCount: 35 } }
  
  // 3. Get visualization recommendation
  const recommendation = recommendVisualization(parsed, profile);
  // { primary: { type: 'choropleth', score: 92, reasoning: 'Geographic coverage: 35 states' } }
  
  // 4. Generate insights
  const insights = generateInsights(data, profile, parsed);
  // [{ type: 'anomaly', title: '3 outliers detected', severity: 'warning' }]
  
  // 5. Get follow-up suggestions
  const followUps = generateFollowUps(parsed, profile, insights);
  // [{ question: 'What are the top 10 carriers by cost?', category: 'drill_down' }]
  
  return { recommendation, insights, followUps };
}
```
