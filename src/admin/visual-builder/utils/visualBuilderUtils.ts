import { logger } from '../../../utils/logger';
import type {
  ChartType,
  Aggregation,
  Column,
  AIConfig,
} from '../types/visualBuilderTypes';

interface AIVisualization {
  title?: string;
  type?: string;
  config?: {
    groupBy?: string;
    metric?: string;
  };
  data?: {
    data?: Array<{ label: string; value: number }>;
  };
}

export interface MultiDimensionConfig {
  primaryGroupBy: string;
  secondaryGroupBy: string;
  metric: string;
  aggregation: string;
  isMultiDimension: true;
}

export function extractProductTerms(prompt: string): string[] {
  const promptLower = prompt.toLowerCase();
  const found: string[] = [];

  if (/drawer\s*system/i.test(promptLower)) {
    found.push('Drawer System');
  } else if (/drawer/i.test(promptLower)) {
    found.push('Drawer');
  }

  if (/cargoglide|cargo\s*glide/i.test(promptLower)) {
    found.push('CargoGlide');
  }

  if (/toolbox|tool\s*box/i.test(promptLower)) {
    found.push('Tool Box');
  }

  return found;
}

export function detectMultiDimensionQuery(prompt: string): MultiDimensionConfig | null {
  const lowerPrompt = prompt.toLowerCase();

  const columnMap: Record<string, string> = {
    'product': 'description',
    'products': 'description',
    'item': 'description',
    'items': 'description',
    'description': 'description',
    'category': 'description',
    'categories': 'description',
    'state': 'origin_state',
    'states': 'origin_state',
    'origin': 'origin_state',
    'origins': 'origin_state',
    'destination': 'dest_state',
    'dest': 'dest_state',
    'carrier': 'carrier_name',
    'carriers': 'carrier_name',
    'mode': 'mode_name',
    'modes': 'mode_name',
    'location': 'origin_state',
  };

  const metricMap: Record<string, string> = {
    'cost': 'retail',
    'costs': 'retail',
    'price': 'retail',
    'prices': 'retail',
    'retail': 'retail',
    'revenue': 'retail',
    'charge': 'retail',
    'charges': 'retail',
    'weight': 'weight',
    'weights': 'weight',
    'miles': 'miles',
    'mileage': 'miles',
    'distance': 'miles',
    'shipments': 'load_id',
    'shipment': 'load_id',
    'count': 'load_id',
    'volume': 'load_id',
  };

  const resolveColumn = (dim: string): string => {
    const cleaned = dim.replace(/[^a-z]/g, '');
    return columnMap[cleaned] || cleaned;
  };

  const resolveMetric = (met: string): string => {
    const cleaned = met.replace(/[^a-z]/g, '');
    return metricMap[cleaned] || 'retail';
  };

  const determineAggregation = (p: string): string => {
    if (p.includes('total') || p.includes('sum')) return 'sum';
    if (p.includes('count') || p.includes('how many') || p.includes('number of')) return 'count';
    if (p.includes('min') || p.includes('minimum') || p.includes('lowest')) return 'min';
    if (p.includes('max') || p.includes('maximum') || p.includes('highest')) return 'max';
    return 'avg';
  };

  const patterns = [
    /(?:average|avg|total|sum|count|show|get)\s+(\w+)\s+(?:by|per|for)\s+(\w+)\s+(?:by|and|per|grouped by|for each|&)\s+(\w+)/i,
    /(\w+)\s+(?:per|by|for)\s+(\w+)\s+(?:by|and|per|grouped by|&)\s+(\w+)/i,
    /breakdown\s+of\s+(\w+)\s+by\s+(\w+)\s+(?:and|&|by)\s+(\w+)/i,
    /(\w+)\s+by\s+(\w+)\s+grouped\s+by\s+(\w+)/i,
  ];

  for (const pattern of patterns) {
    const match = lowerPrompt.match(pattern);
    if (match) {
      const [, metric, primaryDim, secondaryDim] = match;

      const resolvedPrimary = resolveColumn(primaryDim);
      const resolvedSecondary = resolveColumn(secondaryDim);
      const resolvedMetric = resolveMetric(metric);

      if (!columnMap[primaryDim.toLowerCase()] && !['cost', 'price', 'retail', 'weight', 'miles'].includes(primaryDim.toLowerCase())) {
        continue;
      }

      logger.log('[VisualBuilder] Detected multi-dimension query (regex):', {
        pattern: pattern.toString(),
        metric: resolvedMetric,
        primaryGroupBy: resolvedPrimary,
        secondaryGroupBy: resolvedSecondary,
      });

      return {
        primaryGroupBy: resolvedPrimary,
        secondaryGroupBy: resolvedSecondary,
        metric: resolvedMetric,
        aggregation: determineAggregation(lowerPrompt),
        isMultiDimension: true
      };
    }
  }

  const secondaryDimKeywords = [
    { pattern: /(?:by|per|split\s*(?:up|out)?\s*by|broken?\s*(?:down|out)\s*by|grouped\s*by|also\s*by|and\s*(?:by|per)|as\s*well\s*(?:as|by)?)\s*(origin|state|destination|carrier|mode)/i, dim: 1 },
    { pattern: /(origin|state|destination|carrier|mode)\s*(?:as\s*well|too|also)/i, dim: 1 },
    { pattern: /for\s*each\s*(origin|state|destination|carrier|mode)/i, dim: 1 },
  ];

  const productTerms = ['drawer', 'cargoglide', 'cargo glide', 'toolbox', 'tool box', 'product', 'item', 'category'];
  const hasProductTerms = productTerms.some(term => lowerPrompt.includes(term));

  const hasMetricKeyword = ['cost', 'price', 'retail', 'average', 'avg', 'total', 'sum', 'count', 'charge'].some(
    term => lowerPrompt.includes(term)
  );

  if (hasProductTerms && hasMetricKeyword) {
    for (const { pattern, dim } of secondaryDimKeywords) {
      const match = lowerPrompt.match(pattern);
      if (match && match[dim]) {
        const secondaryDim = match[dim].toLowerCase();
        const resolvedSecondary = resolveColumn(secondaryDim);

        let metric = 'retail';
        if (lowerPrompt.includes('weight')) metric = 'weight';
        if (lowerPrompt.includes('miles') || lowerPrompt.includes('mileage')) metric = 'miles';
        if (lowerPrompt.includes('count') || lowerPrompt.includes('how many')) metric = 'load_id';

        logger.log('[VisualBuilder] Detected multi-dimension query (keyword):', {
          secondaryMatch: match[0],
          metric,
          primaryGroupBy: 'description',
          secondaryGroupBy: resolvedSecondary,
        });

        return {
          primaryGroupBy: 'description',
          secondaryGroupBy: resolvedSecondary,
          metric,
          aggregation: determineAggregation(lowerPrompt),
          isMultiDimension: true
        };
      }
    }
  }

  const andPattern = /by\s+(\w+)\s+(?:and|&)\s+(\w+)/i;
  const andMatch = lowerPrompt.match(andPattern);
  if (andMatch) {
    const [, dim1, dim2] = andMatch;
    const resolved1 = resolveColumn(dim1);
    const resolved2 = resolveColumn(dim2);

    if (columnMap[dim1.toLowerCase()] || columnMap[dim2.toLowerCase()]) {
      let metric = 'retail';
      if (lowerPrompt.includes('weight')) metric = 'weight';
      if (lowerPrompt.includes('miles')) metric = 'miles';
      if (lowerPrompt.includes('count')) metric = 'load_id';

      logger.log('[VisualBuilder] Detected multi-dimension query (and-pattern):', {
        metric,
        primaryGroupBy: resolved1,
        secondaryGroupBy: resolved2,
      });

      return {
        primaryGroupBy: resolved1,
        secondaryGroupBy: resolved2,
        metric,
        aggregation: determineAggregation(lowerPrompt),
        isMultiDimension: true
      };
    }
  }

  return null;
}

export function generateDescription(
  prompt: string,
  aiConfig: AIConfig,
  data: Array<{ label: string; value: number }>
): string {
  const filterTerms = aiConfig.searchTerms.length > 0
    ? aiConfig.searchTerms.join(', ')
    : 'all items';

  const aggregation = aiConfig.aggregation || 'Average';
  const metric = aiConfig.yAxis || 'cost';
  const dataPointCount = data.length;

  const parts: string[] = [];

  parts.push(`Shows ${aggregation.toLowerCase()} ${formatFieldName(metric).toLowerCase()}`);

  if (aiConfig.searchTerms.length > 0) {
    parts.push(`for products matching: ${filterTerms}`);
  }

  parts.push(`(${dataPointCount} ${dataPointCount === 1 ? 'category' : 'categories'})`);

  return parts.join(' ');
}

export function buildAIPrompt(userPrompt: string, isAdminUser: boolean): string {
  const promptLower = userPrompt.toLowerCase();

  const hasMetric = ['cost', 'retail', 'price', 'charge', 'average', 'total', 'sum', 'count', 'margin', 'weight'].some(
    term => promptLower.includes(term)
  );

  const productTerms = ['drawer', 'cargoglide', 'toolbox', 'cargo glide', 'drawer system', 'tool box'];
  const mentionedProducts = productTerms.filter(term => promptLower.includes(term));
  const isProductComparison = mentionedProducts.length > 0;

  let metricHint = '';
  if (!hasMetric) {
    const defaultMetric = isAdminUser ? 'average cost per shipment' : 'average retail (your charge) per shipment';
    metricHint = `\n\nNOTE: The user didn't specify a metric. Default to ${defaultMetric}.`;
  }

  let productHint = '';
  if (isProductComparison && mentionedProducts.length >= 2) {
    productHint = `\n\nIMPORTANT - PRODUCT COMPARISON DETECTED:
The user wants to compare these ${mentionedProducts.length} product categories: ${mentionedProducts.join(', ')}
You MUST return ${mentionedProducts.length} SEPARATE data points, one for each category.
DO NOT combine them into a single value.

For each product term, run a separate query:
${mentionedProducts.map((p, i) => `${i + 1}. Filter: item_description ILIKE '%${p}%' → Return as "${p}" category`).join('\n')}`;
  }

  const restrictedFields = isAdminUser ? '' : `
SECURITY: This user is a CUSTOMER. Never include: cost, margin, margin_percent, carrier_total, linehaul, target_rate, cost_without_tax. Use 'retail' for financial data.`;

  return `Create a dashboard widget visualization.

User request: "${userPrompt}"
${metricHint}${productHint}

Instructions:
1. If specific products are mentioned, return SEPARATE data points for EACH product category
2. Use the appropriate aggregation:
   - "average" or "avg" = use AVG aggregation
   - "total" or "sum" = use SUM aggregation
   - "how many" or "count" = use COUNT aggregation
3. Search the item_description field for product terms
4. Limit results to top 15 groups maximum
${restrictedFields}

Return a clear visualization with properly grouped data.`;
}

export function filterAdminData(data: Array<{ label: string; value: number }>): Array<{ label: string; value: number }> {
  const adminTerms = ['cost', 'margin', 'carrier pay', 'linehaul', 'profit'];
  return data.filter(item => {
    const labelLower = item.label.toLowerCase();
    return !adminTerms.some(term => labelLower.includes(term));
  });
}

export function parseAIConfig(
  reasoning: Array<{ type: string; content: string; toolName?: string }>,
  viz: AIVisualization,
  originalPrompt: string
): AIConfig {
  const config: AIConfig = {
    title: viz.title || '',
    xAxis: viz.config?.groupBy || '',
    yAxis: viz.config?.metric || '',
    aggregation: '',
    filters: [],
    searchTerms: [],
    groupingLogic: '',
  };

  const quotedTerms = originalPrompt.match(/"([^"]+)"/g);
  if (quotedTerms) {
    config.searchTerms = quotedTerms.map(t => t.replace(/"/g, ''));
  }

  const productTerms = ['drawer', 'cargoglide', 'toolbox', 'cargo glide', 'drawer system'];
  productTerms.forEach(term => {
    if (originalPrompt.toLowerCase().includes(term) && !config.searchTerms.includes(term)) {
      config.searchTerms.push(term);
    }
  });

  for (const step of reasoning) {
    if (step.content) {
      const content = step.content.toLowerCase();
      if (content.includes('avg(') || content.includes('average')) config.aggregation = 'AVG';
      else if (content.includes('sum(')) config.aggregation = 'SUM';
      else if (content.includes('count(')) config.aggregation = 'COUNT';

      const ilikeMatches = step.content.match(/ILIKE\s+'%([^%]+)%'/gi);
      if (ilikeMatches) {
        ilikeMatches.forEach(match => {
          const term = match.match(/'%([^%]+)%'/)?.[1];
          if (term && !config.searchTerms.includes(term)) {
            config.searchTerms.push(term);
          }
        });
      }
    }
  }

  if (config.searchTerms.length > 0) {
    config.groupingLogic = `Grouped by products matching: ${config.searchTerms.join(', ')}`;
  }

  return config;
}

export function mapAIChartType(aiType: string): ChartType {
  const map: Record<string, ChartType> = {
    bar: 'bar', line: 'line', pie: 'pie', stat: 'kpi', table: 'table', area: 'area',
  };
  return map[aiType] || 'bar';
}

export function mapAIFieldToColumn(aiField: string, columns: Column[]): string | null {
  if (!aiField) return null;

  const normalized = aiField.toLowerCase().replace(/[^a-z0-9]/g, '');

  const direct = columns.find(c => c.id.toLowerCase() === aiField.toLowerCase());
  if (direct) return direct.id;

  const fieldMappings: Record<string, string[]> = {
    'item_description': ['product', 'description', 'productdescription', 'itemdescription', 'item'],
    'cost': ['cost', 'carrierpay', 'carriercost'],
    'retail': ['retail', 'revenue', 'charge', 'price'],
    'carrier_name': ['carrier', 'carriername'],
    'origin_state': ['origin', 'originstate', 'fromstate'],
    'dest_state': ['destination', 'deststate', 'tostate'],
    'mode_name': ['mode', 'modename', 'shipmentmode'],
    'pickup_date': ['date', 'pickupdate', 'shipdate'],
    'weight': ['weight', 'totalweight'],
  };

  for (const [columnId, aliases] of Object.entries(fieldMappings)) {
    if (aliases.some(alias => normalized.includes(alias) || alias.includes(normalized))) {
      const col = columns.find(c => c.id === columnId);
      if (col) return col.id;
    }
  }

  const fuzzy = columns.find(c =>
    c.label.toLowerCase().includes(aiField.toLowerCase()) ||
    aiField.toLowerCase().includes(c.label.toLowerCase())
  );
  if (fuzzy) return fuzzy.id;

  return null;
}

export function mapAIAggregation(aiAgg: string): Aggregation {
  const normalized = (aiAgg || '').toLowerCase();
  if (normalized.includes('avg') || normalized.includes('average')) return 'avg';
  if (normalized.includes('sum') || normalized.includes('total')) return 'sum';
  if (normalized.includes('count')) return 'count';
  if (normalized.includes('min')) return 'min';
  if (normalized.includes('max')) return 'max';
  return 'avg';
}

export function formatFieldName(name: string): string {
  if (!name) return '';
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
