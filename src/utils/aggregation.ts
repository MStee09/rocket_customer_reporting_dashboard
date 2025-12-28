export type AggregationType = 'sum' | 'avg' | 'count' | 'min' | 'max' | 'countDistinct';

export function aggregateValues(values: number[], type: AggregationType): number {
  if (!values || values.length === 0) return 0;

  const cleanValues = values.filter(v => v !== null && v !== undefined && !isNaN(v));
  if (cleanValues.length === 0) return 0;

  const sum = cleanValues.reduce((a, b) => a + b, 0);

  switch (type) {
    case 'sum':
      return sum;
    case 'avg':
      return sum / cleanValues.length;
    case 'count':
      return cleanValues.length;
    case 'min':
      return Math.min(...cleanValues);
    case 'max':
      return Math.max(...cleanValues);
    case 'countDistinct':
      return new Set(cleanValues).size;
    default:
      console.warn(`Unknown aggregation type: ${type}, defaulting to sum`);
      return sum;
  }
}

export function aggregateStringValues(values: string[], type: AggregationType): number {
  if (type === 'count') {
    return values.filter(v => v !== null && v !== undefined && v !== '').length;
  }
  if (type === 'countDistinct') {
    return new Set(values.filter(v => v !== null && v !== undefined && v !== '')).size;
  }
  return 0;
}
