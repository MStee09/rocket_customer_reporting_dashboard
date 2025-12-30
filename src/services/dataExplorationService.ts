import { supabase } from '../lib/supabase';

export interface FieldExploration {
  fieldName: string;
  displayName: string;
  dataType: 'text' | 'number' | 'date' | 'lookup';
  populatedCount: number;
  totalCount: number;
  populatedPercent: number;
  sampleValues?: string[];
  numericStats?: {
    sum: number;
    avg: number;
    min: number;
    max: number;
  };
  uniqueCount?: number;
}

export interface ExplorationResult {
  success: boolean;
  totalRows: number;
  exploredFields: FieldExploration[];
  timestamp: string;
  error?: string;
}

export interface CategorizationPreview {
  category: string;
  count: number;
  totalSpend?: number;
  sampleValues: string[];
}

const explorationCache = new Map<string, { result: ExplorationResult; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export async function exploreFieldsForAI(
  customerId: string,
  fieldNames: string[],
  dateRangeType: string = 'last90'
): Promise<ExplorationResult> {
  const cacheKey = `${customerId}:${fieldNames.sort().join(',')}:${dateRangeType}`;
  const cached = explorationCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }

  try {
    const { data, error } = await supabase.rpc('explore_fields_for_ai', {
      p_customer_id: customerId,
      p_field_names: fieldNames,
      p_date_range_type: dateRangeType
    });

    if (error) {
      console.error('Field exploration error:', error);
      return {
        success: false,
        totalRows: 0,
        exploredFields: [],
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }

    const result: ExplorationResult = {
      success: true,
      totalRows: data.total_rows || 0,
      exploredFields: data.fields || [],
      timestamp: new Date().toISOString()
    };

    explorationCache.set(cacheKey, { result, timestamp: Date.now() });
    return result;
  } catch (e) {
    console.error('Field exploration failed:', e);
    return {
      success: false,
      totalRows: 0,
      exploredFields: [],
      timestamp: new Date().toISOString(),
      error: String(e)
    };
  }
}

export async function previewCategorization(
  customerId: string,
  field: string,
  rules: Array<{ contains: string | string[]; category: string }>,
  defaultCategory: string = 'OTHER',
  dateRangeType: string = 'last90'
): Promise<{
  success: boolean;
  categories: CategorizationPreview[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('preview_categorization_for_ai', {
      p_customer_id: customerId,
      p_field: field,
      p_rules: rules,
      p_default_category: defaultCategory,
      p_date_range_type: dateRangeType
    });

    if (error) {
      console.error('Categorization preview error:', error);
      return { success: false, categories: [], error: error.message };
    }

    return { success: true, categories: data || [] };
  } catch (e) {
    console.error('Categorization preview failed:', e);
    return { success: false, categories: [], error: String(e) };
  }
}

export async function exploreForIntent(
  customerId: string,
  intent: {
    wantsCost?: boolean;
    wantsVolume?: boolean;
    wantsItems?: boolean;
    wantsProducts?: boolean;
    wantsCarriers?: boolean;
    wantsGeography?: boolean;
  },
  dateRangeType: string = 'last90'
): Promise<ExplorationResult> {
  const fieldsToExplore: string[] = [];

  if (intent.wantsCost) {
    fieldsToExplore.push('retail', 'customer_charge');
  }
  if (intent.wantsVolume) {
    fieldsToExplore.push('weight', 'miles');
  }
  if (intent.wantsItems) {
    fieldsToExplore.push('quantity', 'piece_count', 'number_of_pallets');
  }
  if (intent.wantsProducts) {
    fieldsToExplore.push('description', 'commodity', 'commodity_description');
  }
  if (intent.wantsCarriers) {
    fieldsToExplore.push('carrier_name', 'scac');
  }
  if (intent.wantsGeography) {
    fieldsToExplore.push('destination_state', 'origin_state', 'lane');
  }

  if (fieldsToExplore.length === 0) {
    fieldsToExplore.push('retail', 'description', 'carrier_name', 'destination_state');
  }

  return exploreFieldsForAI(customerId, fieldsToExplore, dateRangeType);
}

export function formatExplorationForPrompt(result: ExplorationResult): string {
  if (!result.success) {
    return `Data exploration failed: ${result.error}`;
  }

  let output = `\n## DATA EXPLORATION RESULTS\n\n`;
  output += `Found ${result.totalRows.toLocaleString()} shipments in the selected date range.\n\n`;

  output += `### Field Coverage Analysis\n\n`;

  const excellent = result.exploredFields.filter(f => f.populatedPercent >= 90);
  const good = result.exploredFields.filter(f => f.populatedPercent >= 50 && f.populatedPercent < 90);
  const poor = result.exploredFields.filter(f => f.populatedPercent < 50);

  if (excellent.length > 0) {
    output += `**✓ Excellent Coverage (90%+):**\n`;
    excellent.forEach(f => {
      output += formatFieldLine(f);
    });
    output += '\n';
  }

  if (good.length > 0) {
    output += `**⚠️ Good Coverage (50-89%):**\n`;
    good.forEach(f => {
      output += formatFieldLine(f);
    });
    output += '\n';
  }

  if (poor.length > 0) {
    output += `**❌ Low Coverage (<50%):**\n`;
    poor.forEach(f => {
      output += formatFieldLine(f);
    });
    output += '\n';
  }

  output += `### Recommendations\n\n`;

  const itemFields = result.exploredFields.filter(f =>
    ['quantity', 'piece_count', 'number_of_pallets'].includes(f.fieldName)
  );
  if (itemFields.length > 0) {
    const bestItemField = itemFields.reduce((best, curr) =>
      (curr.populatedPercent > (best?.populatedPercent || 0)) ? curr : best
    );
    if (bestItemField.populatedPercent > 0) {
      output += `**For "items/units":** Use \`${bestItemField.fieldName}\` (${bestItemField.populatedPercent}% coverage)`;
      if (bestItemField.numericStats) {
        output += ` - Total: ${formatNumber(bestItemField.numericStats.sum)}`;
      }
      output += '\n';
    }
  }

  const descFields = result.exploredFields.filter(f =>
    ['description', 'commodity', 'commodity_description'].includes(f.fieldName)
  );
  if (descFields.length > 0) {
    const bestDescField = descFields.reduce((best, curr) =>
      (curr.populatedPercent > (best?.populatedPercent || 0)) ? curr : best
    );
    if (bestDescField.uniqueCount && bestDescField.uniqueCount > 10) {
      output += `**For "products":** Categorize \`${bestDescField.fieldName}\` (${bestDescField.uniqueCount} unique values)\n`;
      if (bestDescField.sampleValues && bestDescField.sampleValues.length > 0) {
        output += `  Samples: ${bestDescField.sampleValues.slice(0, 5).map(v => `"${v}"`).join(', ')}\n`;
      }
    }
  }

  output += `\n**IMPORTANT:** Always confirm the approach with the user before building the report.\n`;

  return output;
}

function formatFieldLine(field: FieldExploration): string {
  let line = `- **${field.displayName}** (\`${field.fieldName}\`): ${field.populatedPercent}% populated`;

  if (field.numericStats) {
    line += ` | Sum: ${formatNumber(field.numericStats.sum)}, Avg: ${formatNumber(field.numericStats.avg)}`;
  } else if (field.sampleValues && field.sampleValues.length > 0) {
    line += `\n  Samples: ${field.sampleValues.slice(0, 3).map(v => `"${v}"`).join(', ')}`;
    if (field.uniqueCount) {
      line += ` (${field.uniqueCount} unique)`;
    }
  }

  return line + '\n';
}

function formatNumber(n: number): string {
  if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function parseUserIntent(prompt: string): {
  wantsCost: boolean;
  wantsVolume: boolean;
  wantsItems: boolean;
  wantsProducts: boolean;
  wantsCarriers: boolean;
  wantsGeography: boolean;
  needsExploration: boolean;
} {
  const lower = prompt.toLowerCase();

  const intent = {
    wantsCost: /cost|spend|charge|price|revenue|retail|dollar/.test(lower),
    wantsVolume: /volume|weight|miles|distance|pounds|lbs/.test(lower),
    wantsItems: /item|unit|piece|pallet|quantity|count per/.test(lower),
    wantsProducts: /product|item type|description|commodity|by product/.test(lower),
    wantsCarriers: /carrier|vendor|provider|scac/.test(lower),
    wantsGeography: /state|region|lane|destination|origin|geography|where/.test(lower),
    needsExploration: false
  };

  const explorationTriggers = [
    'cost per',
    'per item',
    'per unit',
    'per piece',
    'by product',
    'by item type',
    'break down',
    'breakdown',
    'categorize',
    'category',
    'group by description'
  ];

  intent.needsExploration = explorationTriggers.some(trigger => lower.includes(trigger));

  return intent;
}

export function clearExplorationCache(): void {
  explorationCache.clear();
}
