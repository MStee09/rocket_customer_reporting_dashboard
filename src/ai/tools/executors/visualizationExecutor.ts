import { ToolResult, AIToolContext, VisualizationSuggestion } from '../types';

interface VisualizationRule {
  chartType: string;
  conditions: {
    maxGroups?: number;
    minGroups?: number;
    isTimeSeries?: boolean;
    isGeographic?: boolean;
    isComparison?: boolean;
    isPartOfWhole?: boolean;
  };
  confidence: number;
  reasoning: string;
}

const VISUALIZATION_RULES: VisualizationRule[] = [
  {
    chartType: 'line',
    conditions: { isTimeSeries: true },
    confidence: 0.95,
    reasoning: 'Time series data is best shown as a line chart to reveal trends'
  },
  {
    chartType: 'area',
    conditions: { isTimeSeries: true, isPartOfWhole: true },
    confidence: 0.85,
    reasoning: 'Stacked area works well for time series showing composition'
  },
  {
    chartType: 'pie',
    conditions: { maxGroups: 6, isPartOfWhole: true },
    confidence: 0.9,
    reasoning: 'Pie charts work well for showing parts of a whole with few categories'
  },
  {
    chartType: 'bar',
    conditions: { maxGroups: 15 },
    confidence: 0.85,
    reasoning: 'Bar charts are effective for comparing values across categories'
  },
  {
    chartType: 'horizontal_bar',
    conditions: { minGroups: 8, maxGroups: 20 },
    confidence: 0.8,
    reasoning: 'Horizontal bars work better when you have many categories with long names'
  },
  {
    chartType: 'treemap',
    conditions: { minGroups: 10, isPartOfWhole: true },
    confidence: 0.75,
    reasoning: 'Treemaps are good for hierarchical data or many categories with part-of-whole relationships'
  },
  {
    chartType: 'table',
    conditions: { minGroups: 20 },
    confidence: 0.7,
    reasoning: 'With many categories, a table might be more readable than a chart'
  }
];

const GEOGRAPHIC_FIELDS = ['origin_state', 'destination_state', 'origin_country', 'destination_country', 'lane'];
const TIME_FIELDS = ['pickup_date', 'delivery_date', 'ship_date', 'created_date', 'month', 'week', 'year'];

export async function executeSuggestVisualization(
  toolCallId: string,
  args: Record<string, unknown>,
  context: AIToolContext
): Promise<ToolResult> {
  const groupBy = args.groupBy as string;
  const metric = args.metric as string;
  const aggregation = args.aggregation as string || 'sum';
  const uniqueValueCount = args.uniqueValueCount as number | undefined;
  const isTimeSeriesArg = args.isTimeSeries as boolean | undefined;

  const isTimeSeries = isTimeSeriesArg ?? TIME_FIELDS.some(f =>
    groupBy.toLowerCase().includes(f.toLowerCase())
  );
  const isGeographic = GEOGRAPHIC_FIELDS.some(f =>
    groupBy.toLowerCase().includes(f.toLowerCase())
  );
  const isPartOfWhole = ['sum', 'count'].includes(aggregation.toLowerCase());
  const estimatedGroups = uniqueValueCount || 10;

  const scores: Array<{ type: string; score: number; reasoning: string }> = [];

  for (const rule of VISUALIZATION_RULES) {
    let score = rule.confidence;
    let matches = true;

    if (rule.conditions.isTimeSeries !== undefined) {
      if (rule.conditions.isTimeSeries !== isTimeSeries) matches = false;
    }

    if (rule.conditions.maxGroups !== undefined) {
      if (estimatedGroups > rule.conditions.maxGroups) matches = false;
    }

    if (rule.conditions.minGroups !== undefined) {
      if (estimatedGroups < rule.conditions.minGroups) matches = false;
    }

    if (rule.conditions.isPartOfWhole !== undefined) {
      if (rule.conditions.isPartOfWhole !== isPartOfWhole) score *= 0.8;
    }

    if (matches) {
      scores.push({
        type: rule.chartType,
        score,
        reasoning: rule.reasoning
      });
    }
  }

  if (isGeographic) {
    scores.push({
      type: 'choropleth_map',
      score: 0.85,
      reasoning: 'Geographic data can be visualized on a map'
    });
  }

  scores.sort((a, b) => b.score - a.score);

  if (scores.length === 0) {
    scores.push({
      type: 'bar',
      score: 0.6,
      reasoning: 'Bar chart is a safe default for most data'
    });
  }

  const suggestion: VisualizationSuggestion = {
    chartType: scores[0].type,
    confidence: scores[0].score,
    reasoning: scores[0].reasoning,
    alternativeTypes: scores.slice(1, 4).map(s => s.type),
    warnings: []
  };

  if (estimatedGroups > 30) {
    suggestion.warnings?.push('Large number of groups may make the chart hard to read. Consider filtering or using a table.');
  }

  if (isTimeSeries && scores[0].type !== 'line' && scores[0].type !== 'area') {
    suggestion.warnings?.push('This appears to be time-based data. Consider using a line chart to show trends.');
  }

  return {
    toolCallId,
    success: true,
    data: suggestion,
    suggestions: suggestion.warnings?.length ? suggestion.warnings : undefined
  };
}
