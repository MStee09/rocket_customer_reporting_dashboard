import { ParsedQuery, DataProfile, VisualizationRecommendation } from '../../types/aiVisualization';

interface VizTypeConfig {
  requires: {
    geographic?: boolean;
    temporal?: boolean;
    multiMetric?: boolean;
  };
  prefers: {
    cardinality?: [number, number];
    intent?: string[];
    hasTrend?: boolean;
    hasHierarchy?: boolean;
    granularity?: string;
    entityCount?: [number, number];
  };
}

const VIZ_TYPES: Record<string, VizTypeConfig> = {
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

    if (vizKey === 'choropleth' && profile.geographicCoverage) {
      score += 30;
      reasoning.push(`Geographic coverage: ${profile.geographicCoverage.stateCount} states`);
      if (profile.geographicCoverage.stateCount >= 15) {
        score += 10;
        reasoning.push('Good state coverage');
      }
    }

    if ((vizKey === 'line' || vizKey === 'calendar') && profile.columns.some(c => c.type === 'temporal')) {
      score += 25;
      reasoning.push('Temporal data present');
      if (profile.patterns.hasTrend) {
        score += 10;
        reasoning.push(`Trend detected: ${profile.patterns.trendDirection}`);
      }
    }

    if (viz.prefers.intent && viz.prefers.intent.includes(query.intent)) {
      score += 15;
      reasoning.push(`Matches intent: ${query.intent}`);
    }

    const primaryDimension = profile.columns.find(c => c.type === 'categorical' || c.type === 'geographic');
    if (primaryDimension && viz.prefers.cardinality) {
      const [min, max] = viz.prefers.cardinality;
      if (primaryDimension.cardinality >= min && primaryDimension.cardinality <= max) {
        score += 10;
        reasoning.push(`Cardinality (${primaryDimension.cardinality}) fits well`);
      }
    }

    if (vizKey === 'pie' && primaryDimension && primaryDimension.cardinality > 6) {
      score -= 30;
      reasoning.push('Too many categories for pie chart');
    }

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
