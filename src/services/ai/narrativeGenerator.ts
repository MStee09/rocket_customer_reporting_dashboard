import { DataProfile, AIInsight, FollowUpSuggestion, ParsedQuery } from '../../types/aiVisualization';

export function generateInsights(
  data: Record<string, any>[],
  profile: DataProfile,
  _query: ParsedQuery
): AIInsight[] {
  const insights: AIInsight[] = [];

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

  const _ = data;

  return insights;
}

export function generateFollowUps(
  query: ParsedQuery,
  profile: DataProfile,
  insights: AIInsight[]
): FollowUpSuggestion[] {
  const suggestions: FollowUpSuggestion[] = [];

  const highCardinalityCol = profile.columns.find(c => c.cardinality > 5 && c.type === 'categorical');
  if (highCardinalityCol) {
    suggestions.push({
      question: `What are the top 10 ${highCardinalityCol.name}s by ${query.metrics[0] || 'volume'}?`,
      intent: 'find',
      relevance: 0.9,
      category: 'drill_down',
    });
  }

  if (!query.comparison) {
    suggestions.push({
      question: 'How does this compare to last month?',
      intent: 'compare',
      relevance: 0.85,
      category: 'compare',
    });
  }

  if (!query.timeRange) {
    suggestions.push({
      question: `Show ${query.metrics[0] || 'this'} trend over the last 90 days`,
      intent: 'trend',
      relevance: 0.8,
      category: 'trend',
    });
  }

  const anomalyInsight = insights.find(i => i.type === 'anomaly');
  if (anomalyInsight) {
    suggestions.push({
      question: `What's causing the ${anomalyInsight.title.toLowerCase()}?`,
      intent: 'analyze',
      relevance: 0.95,
      category: 'root_cause',
    });
  }

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
