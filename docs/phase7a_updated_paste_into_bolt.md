# PHASE 7A: AI Data Exploration Engine

This phase adds data exploration capabilities so the AI verifies data exists BEFORE building reports. Leverages patterns from your existing `columnSampleService.ts`.

## The Problem This Solves

**Before:** User asks "cost per item by product" → AI guesses field names → Report shows $0

**After:** User asks "cost per item by product" → AI explores data → Shows what fields exist and their coverage → Confirms approach → Builds verified report

---

## File 1: Data Exploration Service

### Create: src/services/dataExplorationService.ts

```typescript
import { supabase } from '../lib/supabase';

/**
 * Field exploration result for AI context
 */
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

// Cache for exploration results (5 minute TTL)
const explorationCache = new Map<string, { result: ExplorationResult; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Explore specific fields for a customer to verify data exists
 */
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

/**
 * Preview categorization results before building report
 */
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

/**
 * Get exploration based on user's intent
 */
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

  // Always include basics if nothing specific
  if (fieldsToExplore.length === 0) {
    fieldsToExplore.push('retail', 'description', 'carrier_name', 'destination_state');
  }

  return exploreFieldsForAI(customerId, fieldsToExplore, dateRangeType);
}

/**
 * Format exploration results for AI prompt inclusion
 */
export function formatExplorationForPrompt(result: ExplorationResult): string {
  if (!result.success) {
    return `Data exploration failed: ${result.error}`;
  }

  let output = `\n## DATA EXPLORATION RESULTS\n\n`;
  output += `Found ${result.totalRows.toLocaleString()} shipments in the selected date range.\n\n`;

  output += `### Field Coverage Analysis\n\n`;

  // Group by coverage quality
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

  // Add specific recommendations
  output += `### Recommendations\n\n`;

  // Check for items fields
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

  // Check for product categorization
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

/**
 * Parse user intent from prompt
 */
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

  // Determine if exploration is needed
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

/**
 * Clear exploration cache (useful after data changes)
 */
export function clearExplorationCache(): void {
  explorationCache.clear();
}
```

---

## File 2: Database Functions for Exploration

### Create: supabase/migrations/[timestamp]_ai_data_exploration.sql

```sql
-- ============================================
-- AI Data Exploration Functions
-- ============================================

-- Helper function to get date range
CREATE OR REPLACE FUNCTION get_date_range_bounds(p_date_range_type TEXT)
RETURNS TABLE(start_date DATE, end_date DATE)
LANGUAGE plpgsql
AS $$
BEGIN
  end_date := CURRENT_DATE;
  
  CASE p_date_range_type
    WHEN 'last30' THEN start_date := CURRENT_DATE - INTERVAL '30 days';
    WHEN 'last90' THEN start_date := CURRENT_DATE - INTERVAL '90 days';
    WHEN 'last6months' THEN start_date := CURRENT_DATE - INTERVAL '6 months';
    WHEN 'lastyear' THEN start_date := CURRENT_DATE - INTERVAL '1 year';
    ELSE start_date := CURRENT_DATE - INTERVAL '90 days';
  END CASE;
  
  RETURN NEXT;
END;
$$;

-- Main exploration function
CREATE OR REPLACE FUNCTION explore_fields_for_ai(
  p_customer_id TEXT,
  p_field_names TEXT[],
  p_date_range_type TEXT DEFAULT 'last90'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_total_rows INTEGER;
  v_fields JSONB := '[]'::JSONB;
  v_field TEXT;
  v_field_data JSONB;
  v_populated INTEGER;
  v_sample_values TEXT[];
  v_unique_count INTEGER;
  v_sum NUMERIC;
  v_avg NUMERIC;
  v_min NUMERIC;
  v_max NUMERIC;
  v_data_type TEXT;
  v_display_name TEXT;
BEGIN
  -- Get date range
  SELECT dr.start_date, dr.end_date INTO v_start_date, v_end_date
  FROM get_date_range_bounds(p_date_range_type) dr;

  -- Get total row count for this customer in date range
  SELECT COUNT(*)::INTEGER INTO v_total_rows
  FROM shipment_report_view
  WHERE customer_id = p_customer_id::INTEGER
    AND pickup_date >= v_start_date
    AND pickup_date <= v_end_date;

  -- If no rows, return early
  IF v_total_rows = 0 THEN
    RETURN jsonb_build_object(
      'total_rows', 0,
      'fields', '[]'::JSONB
    );
  END IF;

  -- Explore each requested field
  FOREACH v_field IN ARRAY p_field_names
  LOOP
    -- Get data type from schema_columns (if exists)
    SELECT data_type INTO v_data_type
    FROM schema_columns
    WHERE view_name = 'shipment_report_view'
      AND column_name = v_field;

    -- Skip if field doesn't exist in schema
    IF v_data_type IS NULL THEN
      -- Try to detect type from information_schema as fallback
      SELECT data_type INTO v_data_type
      FROM information_schema.columns
      WHERE table_name = 'shipment_report_view'
        AND column_name = v_field;
        
      IF v_data_type IS NULL THEN
        CONTINUE;
      END IF;
    END IF;

    -- Create display name
    v_display_name := INITCAP(REPLACE(v_field, '_', ' '));

    -- Count populated (non-null, non-empty) values
    EXECUTE format(
      'SELECT COUNT(*)::INTEGER FROM shipment_report_view 
       WHERE customer_id = $1 
         AND pickup_date >= $2 AND pickup_date <= $3
         AND %I IS NOT NULL 
         AND COALESCE(%I::TEXT, '''') != ''''',
      v_field, v_field
    ) INTO v_populated USING p_customer_id::INTEGER, v_start_date, v_end_date;

    -- Handle based on data type
    IF v_data_type IN ('integer', 'numeric', 'double precision', 'real', 'bigint', 'smallint') THEN
      -- Numeric field: get stats
      EXECUTE format(
        'SELECT 
           COALESCE(SUM(%I), 0)::NUMERIC,
           COALESCE(AVG(%I), 0)::NUMERIC,
           COALESCE(MIN(%I), 0)::NUMERIC,
           COALESCE(MAX(%I), 0)::NUMERIC
         FROM shipment_report_view 
         WHERE customer_id = $1 
           AND pickup_date >= $2 AND pickup_date <= $3
           AND %I IS NOT NULL',
        v_field, v_field, v_field, v_field, v_field
      ) INTO v_sum, v_avg, v_min, v_max 
      USING p_customer_id::INTEGER, v_start_date, v_end_date;

      v_field_data := jsonb_build_object(
        'fieldName', v_field,
        'displayName', v_display_name,
        'dataType', 'number',
        'populatedCount', v_populated,
        'totalCount', v_total_rows,
        'populatedPercent', CASE WHEN v_total_rows > 0 
          THEN ROUND((v_populated::NUMERIC / v_total_rows) * 100)::INTEGER 
          ELSE 0 END,
        'numericStats', jsonb_build_object(
          'sum', ROUND(v_sum::NUMERIC, 2),
          'avg', ROUND(v_avg::NUMERIC, 2),
          'min', ROUND(v_min::NUMERIC, 2),
          'max', ROUND(v_max::NUMERIC, 2)
        )
      );
    ELSE
      -- Text/other field: get sample values and unique count
      EXECUTE format(
        'SELECT COUNT(DISTINCT %I)::INTEGER 
         FROM shipment_report_view 
         WHERE customer_id = $1 
           AND pickup_date >= $2 AND pickup_date <= $3
           AND %I IS NOT NULL
           AND COALESCE(%I::TEXT, '''') != ''''',
        v_field, v_field, v_field
      ) INTO v_unique_count 
      USING p_customer_id::INTEGER, v_start_date, v_end_date;

      -- Get top sample values (most frequent first)
      EXECUTE format(
        'SELECT ARRAY_AGG(val ORDER BY cnt DESC) FROM (
           SELECT %I::TEXT as val, COUNT(*) as cnt
           FROM shipment_report_view 
           WHERE customer_id = $1 
             AND pickup_date >= $2 AND pickup_date <= $3
             AND %I IS NOT NULL
             AND COALESCE(%I::TEXT, '''') != ''''
           GROUP BY %I::TEXT
           ORDER BY cnt DESC
           LIMIT 10
         ) sub',
        v_field, v_field, v_field, v_field
      ) INTO v_sample_values 
      USING p_customer_id::INTEGER, v_start_date, v_end_date;

      v_field_data := jsonb_build_object(
        'fieldName', v_field,
        'displayName', v_display_name,
        'dataType', 'text',
        'populatedCount', v_populated,
        'totalCount', v_total_rows,
        'populatedPercent', CASE WHEN v_total_rows > 0 
          THEN ROUND((v_populated::NUMERIC / v_total_rows) * 100)::INTEGER 
          ELSE 0 END,
        'uniqueCount', v_unique_count,
        'sampleValues', COALESCE(to_jsonb(v_sample_values), '[]'::JSONB)
      );
    END IF;

    v_fields := v_fields || v_field_data;
  END LOOP;

  RETURN jsonb_build_object(
    'total_rows', v_total_rows,
    'fields', v_fields
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION explore_fields_for_ai(TEXT, TEXT[], TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_date_range_bounds(TEXT) TO authenticated;


-- Categorization preview function
CREATE OR REPLACE FUNCTION preview_categorization_for_ai(
  p_customer_id TEXT,
  p_field TEXT,
  p_rules JSONB,
  p_default_category TEXT DEFAULT 'OTHER',
  p_date_range_type TEXT DEFAULT 'last90'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_result JSONB := '[]'::JSONB;
  v_rule JSONB;
  v_contains TEXT[];
  v_category TEXT;
  v_like_conditions TEXT[];
  v_like_condition TEXT;
  v_count INTEGER;
  v_spend NUMERIC;
  v_samples TEXT[];
  v_matched_ids INTEGER[] := ARRAY[]::INTEGER[];
  v_rule_ids INTEGER[];
BEGIN
  -- Get date range
  SELECT dr.start_date, dr.end_date INTO v_start_date, v_end_date
  FROM get_date_range_bounds(p_date_range_type) dr;

  -- Process each rule
  FOR v_rule IN SELECT * FROM jsonb_array_elements(p_rules)
  LOOP
    v_category := v_rule->>'category';

    -- Get contains array (handle both string and array)
    IF jsonb_typeof(v_rule->'contains') = 'array' THEN
      SELECT ARRAY_AGG(elem::TEXT) INTO v_contains
      FROM jsonb_array_elements_text(v_rule->'contains') elem;
    ELSE
      v_contains := ARRAY[v_rule->>'contains'];
    END IF;

    -- Build LIKE conditions for each keyword
    v_like_conditions := ARRAY[]::TEXT[];
    FOREACH v_like_condition IN ARRAY v_contains
    LOOP
      v_like_conditions := v_like_conditions || format(
        'LOWER(%I) LIKE ''%%%s%%''', 
        p_field, 
        LOWER(TRIM(v_like_condition))
      );
    END LOOP;

    -- Count matches and get spend (excluding already matched)
    EXECUTE format(
      'SELECT 
         COUNT(*)::INTEGER,
         COALESCE(SUM(retail), 0)::NUMERIC,
         ARRAY_AGG(load_id)
       FROM shipment_report_view 
       WHERE customer_id = $1 
         AND pickup_date >= $2 AND pickup_date <= $3
         AND (%s)
         AND load_id != ALL($4)',
      array_to_string(v_like_conditions, ' OR ')
    ) INTO v_count, v_spend, v_rule_ids 
    USING p_customer_id::INTEGER, v_start_date, v_end_date, v_matched_ids;

    -- Get sample values for this category
    EXECUTE format(
      'SELECT ARRAY_AGG(DISTINCT %I::TEXT) FROM (
         SELECT %I FROM shipment_report_view 
         WHERE customer_id = $1 
           AND pickup_date >= $2 AND pickup_date <= $3
           AND (%s)
         LIMIT 5
       ) sub',
      p_field, p_field, array_to_string(v_like_conditions, ' OR ')
    ) INTO v_samples 
    USING p_customer_id::INTEGER, v_start_date, v_end_date;

    -- Track matched IDs to avoid double-counting
    v_matched_ids := v_matched_ids || COALESCE(v_rule_ids, ARRAY[]::INTEGER[]);

    -- Add to result
    v_result := v_result || jsonb_build_object(
      'category', v_category,
      'count', v_count,
      'totalSpend', ROUND(v_spend, 2),
      'sampleValues', COALESCE(to_jsonb(v_samples), '[]'::JSONB)
    );
  END LOOP;

  -- Count default category (everything not matched)
  EXECUTE format(
    'SELECT 
       COUNT(*)::INTEGER,
       COALESCE(SUM(retail), 0)::NUMERIC
     FROM shipment_report_view 
     WHERE customer_id = $1 
       AND pickup_date >= $2 AND pickup_date <= $3
       AND load_id != ALL($4)'
  ) INTO v_count, v_spend 
  USING p_customer_id::INTEGER, v_start_date, v_end_date, v_matched_ids;

  -- Add default category
  v_result := v_result || jsonb_build_object(
    'category', p_default_category,
    'count', v_count,
    'totalSpend', ROUND(v_spend, 2),
    'sampleValues', '[]'::JSONB
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION preview_categorization_for_ai(TEXT, TEXT, JSONB, TEXT, TEXT) TO authenticated;
```

---

## File 3: Update AI Report Service

### Update: src/services/aiReportService.ts

Add these imports at the top:

```typescript
import { 
  exploreForIntent, 
  formatExplorationForPrompt, 
  parseUserIntent,
  ExplorationResult 
} from './dataExplorationService';
```

Update the `generateReport` function to include exploration:

```typescript
export async function generateReport(
  prompt: string,
  conversationHistory: ChatMessage[],
  customerId: string,
  isAdmin: boolean,
  knowledgeContext?: string,
  currentReport?: AIReportDefinition | null,
  customerName?: string
): Promise<GenerateReportResponse> {
  // Parse user intent
  const intent = parseUserIntent(prompt);
  
  // Explore data if needed (only on first message or when intent suggests it)
  let explorationContext = '';
  if (intent.needsExploration && conversationHistory.length === 0) {
    console.log('[AI] Exploring data for intent:', intent);
    const exploration = await exploreForIntent(customerId, intent);
    if (exploration.success) {
      explorationContext = formatExplorationForPrompt(exploration);
      console.log('[AI] Exploration complete:', exploration.exploredFields.length, 'fields');
    }
  }
  
  // Combine knowledge context with exploration
  const combinedContext = [
    knowledgeContext || '',
    explorationContext
  ].filter(Boolean).join('\n\n');

  const history = conversationHistory
    .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
    .map((msg) => ({
      role: msg.role,
      content: msg.report ? JSON.stringify(msg.report) : msg.content,
    }));

  const { data, error } = await supabase.functions.invoke('generate-report', {
    body: {
      prompt,
      conversationHistory: history,
      customerId,
      isAdmin,
      knowledgeContext: combinedContext,
      currentReport: currentReport || undefined,
      customerName: customerName || undefined,
    },
  });

  if (error) {
    console.error('Generate report error:', error);
    return {
      report: null,
      message: 'Sorry, I encountered an error. Please try again.',
    };
  }

  const { data: sessionData } = await supabase.auth.getSession();

  if (data.report) {
    data.report.customerId = customerId;
    data.report.createdBy = sessionData?.session?.user?.id || 'unknown';
  }

  return {
    report: data.report || null,
    message: data.message || '',
    rawResponse: data.rawResponse,
    learningData: data.learningData,
  };
}
```

---

## File 4: Update Edge Function System Prompt

### Update: supabase/functions/generate-report/index.ts

Add this new constant after `VISUALIZATION_SUGGESTIONS` (around line 1200):

```typescript
const DATA_EXPLORATION_BEHAVIOR = `
## DATA EXPLORATION BEHAVIOR

When your context includes "DATA EXPLORATION RESULTS", you have verified field data. USE IT.

### How to Use Exploration Results:

1. **Check field coverage before recommending a field:**
   - ✓ (90%+): Excellent - use confidently
   - ⚠️ (50-89%): Good - mention coverage to user
   - ❌ (<50%): Poor - warn user, suggest alternatives

2. **For "items" or "units" requests:**
   - Look at quantity, piece_count, number_of_pallets in exploration results
   - ALWAYS recommend the one with highest coverage
   - TELL THE USER: "I'll use piece_count (94% coverage) instead of quantity (12%)"

3. **For "product" or categorization requests:**
   - Look at description sample values in exploration results
   - If many unique values, ask user for categorization keywords
   - SHOW THE USER the sample values: "I see values like 'DRAWER SYSTEM', 'CG-1000'..."

4. **Always confirm before building:**
   - State what field you'll use and why
   - Show the user what categories/groupings you'll create
   - Get their approval before generating the report

### Example Response with Exploration:

User: "Show me cost per item by product"

AI (with exploration showing quantity at 12%, piece_count at 94%, description samples):

"I've analyzed your data:

**For 'items':** 
- \`quantity\` field: Only 12% populated ❌
- \`piece_count\` field: 94% populated ✓

I'll use \`piece_count\` for accuracy.

**For 'products':** Your \`description\` field has 847 unique values including:
- 'DRAWER SYSTEM 24IN'
- 'CG-1000 CARGOGLIDE'
- 'TOOLBOX ALUMINUM'

**What product categories should I create?** 
For example: 'drawer' → DRAWER SYSTEMS, 'cargoglide' → CARGOGLIDE, etc."

### CRITICAL RULES:

1. **Never assume field names** - Use exploration results to verify
2. **Never build with low-coverage fields** without warning
3. **Always show sample values** when asking about categorization
4. **Confirm approach** before generating report JSON
`;
```

Add `DATA_EXPLORATION_BEHAVIOR` to the system prompt assembly. Find where other prompt parts are combined (around line 2080) and add it:

```typescript
const systemPrompt = `${EXPERT_SYSTEM_PROMPT}

${accessContext}
${customerContext}
${dataProfileContext}

${unifiedKnowledgeContext}

${formatKnowledgeDocsForAI(knowledgeDocs)}

${formatCurrentReportForAI(currentReport)}

${TERM_HANDLING_RULES}

${dynamicSchemaContext}

${DATA_EXPLORATION_BEHAVIOR}

${CALCULATED_METRICS}

${TEXT_CATEGORIZATION}

${NUMERIC_CATEGORIZATION}

${REPORT_SCHEMA}

${RESPONSE_RULES}

${FEEDBACK_DETECTION}`;
```

---

## File 5: Export Updates

### Update: src/services/index.ts (create if doesn't exist)

```typescript
export * from './aiReportService';
export * from './dataExplorationService';
export * from './columnSampleService';
// ... other exports
```

---

## Testing Checklist

After implementing:

### Exploration Triggers:
1. ✅ "cost per item" triggers exploration
2. ✅ "break down by product" triggers exploration  
3. ✅ Simple requests like "shipments by carrier" don't trigger exploration
4. ✅ Second message in conversation doesn't re-explore

### Exploration Results:
1. ✅ AI shows field coverage percentages
2. ✅ AI shows sample values for text fields
3. ✅ AI recommends best field for "items" (highest coverage)
4. ✅ AI asks about categories for high-cardinality fields

### Report Generation:
1. ✅ AI uses field with best coverage
2. ✅ AI confirms approach before building
3. ✅ Generated report uses correct field names
4. ✅ No more $0 reports from wrong field selection

### Integration with Column Preview:
1. ✅ Exploration service uses similar caching pattern
2. ✅ Same data formatting utilities can be shared
3. ✅ Database functions are efficient (uses indexes)

---

## How It Works Together

```
User: "Show me cost per item by product"
         │
         ▼
┌─────────────────────────────────────┐
│  parseUserIntent()                  │
│  → wantsCost: true                  │
│  → wantsItems: true                 │
│  → wantsProducts: true              │
│  → needsExploration: true           │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  exploreForIntent()                 │
│  → Query: retail, quantity,         │
│    piece_count, description         │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  formatExplorationForPrompt()       │
│  → "piece_count: 94% populated"     │
│  → "quantity: 12% populated"        │
│  → "description: 847 unique values" │
│  → "Samples: DRAWER, CG-1000..."    │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  Claude API (with exploration)      │
│  → AI KNOWS what data exists        │
│  → AI recommends piece_count        │
│  → AI asks for product categories   │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  User confirms: "drawer, cargoglide,│
│  toolbox categories"                │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  AI generates verified report       │
│  → Uses piece_count (not quantity)  │
│  → Categories match user input      │
│  → No $0 surprises!                 │
└─────────────────────────────────────┘
```

---

# END OF PHASE 7A

This phase ensures the AI verifies data exists before building reports. The exploration results are injected into the AI's context, so it knows exactly what fields have data and what values exist.

Combined with your existing Column Sample Service (hover previews), users now have:
- **Build time**: Hover to see sample values in Custom Report Builder
- **AI time**: AI explores and confirms before generating

No more guessing. No more $0 reports.
