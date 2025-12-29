import { ParsedQuery } from '../../types/aiVisualization';

const INTENT_KEYWORDS: Record<string, string[]> = {
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

  let intent: ParsedQuery['intent'] = 'analyze';
  for (const [intentType, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (keywords.some(kw => normalizedQuery.includes(kw))) {
      intent = intentType as ParsedQuery['intent'];
      break;
    }
  }

  const metrics: string[] = [];
  for (const [metric, synonyms] of Object.entries(METRIC_SYNONYMS)) {
    if (synonyms.some(syn => normalizedQuery.includes(syn))) {
      metrics.push(metric);
    }
  }
  if (metrics.length === 0) metrics.push('cost');

  const dimensions: string[] = [];
  for (const [dimension, synonyms] of Object.entries(DIMENSION_SYNONYMS)) {
    if (synonyms.some(syn => normalizedQuery.includes(syn))) {
      dimensions.push(dimension);
    }
  }

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

  let geographic: ParsedQuery['geographic'] | undefined;
  if (dimensions.includes('state') || normalizedQuery.includes('map') || normalizedQuery.includes('geographic')) {
    geographic = { level: 'state' };
  }

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
