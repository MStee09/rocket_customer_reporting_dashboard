# PHASE 5: Wire Learning System Into Edge Function

This phase connects the learning extraction to the actual generate-report edge function so learnings are captured from every conversation.

## Update: supabase/functions/generate-report/index.ts

### 1. Add these helper functions BEFORE the `Deno.serve` handler:

```typescript
// ============================================================================
// LEARNING EXTRACTION - Add this section before Deno.serve
// ============================================================================

interface LearningExtraction {
  type: 'terminology' | 'product' | 'preference' | 'correction';
  key: string;
  value: string;
  confidence: number;
  source: 'explicit' | 'inferred';
}

/**
 * Extract learnings from conversation
 */
function extractLearningsFromConversation(
  conversationHistory: Array<{ role: string; content: string }>,
  currentPrompt: string,
  aiResponse: string
): LearningExtraction[] {
  const learnings: LearningExtraction[] = [];
  
  // Combine all user messages
  const userMessages = [
    ...conversationHistory.filter(m => m.role === 'user').map(m => m.content),
    currentPrompt,
  ].join('\n');

  // 1. Extract explicit terminology teachings
  const termPatterns = [
    /when I say ['"]?([^'"]+)['"]?,?\s*I mean (.+)/gi,
    /by ['"]?([^'"]+)['"]?,?\s*I mean (.+)/gi,
    /['"]?([^'"]+)['"]?\s*(?:means|refers to|is)\s+(.+)/gi,
    /we call (?:it|them|this)\s+['"]?([^'"]+)['"]?/gi,
  ];

  for (const pattern of termPatterns) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(userMessages)) !== null) {
      const term = match[1]?.trim();
      const meaning = match[2]?.trim() || term;
      
      if (term && term.length > 1 && term.length < 50) {
        learnings.push({
          type: 'terminology',
          key: term.toLowerCase().replace(/\s+/g, '_'),
          value: meaning,
          confidence: 1.0,
          source: 'explicit',
        });
      }
    }
  }

  // 2. Extract product definitions
  const productPatterns = [
    /(?:we (?:sell|ship|have|make)|our products? (?:are|include))\s+(.+)/gi,
    /product (?:types?|lines?|categories?):\s*(.+)/gi,
  ];

  for (const pattern of productPatterns) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(userMessages)) !== null) {
      const productList = match[1];
      const products = productList
        .split(/,\s*|\s+and\s+/)
        .map(p => p.trim())
        .filter(p => p.length > 1 && p.length < 50);
      
      for (const product of products) {
        learnings.push({
          type: 'product',
          key: product.toLowerCase().replace(/\s+/g, '_'),
          value: product,
          confidence: 0.9,
          source: 'explicit',
        });
      }
    }
  }

  // 3. Infer chart preferences from modifications
  const chartPreferences = [
    { pattern: /make it a (\w+) chart/i, confidence: 0.8 },
    { pattern: /change (?:it )?to (?:a )?(\w+) chart/i, confidence: 0.8 },
    { pattern: /(?:prefer|like|want) (?:a )?(\w+) chart/i, confidence: 0.7 },
    { pattern: /(\w+) chart (?:would be|is) better/i, confidence: 0.6 },
  ];

  for (const { pattern, confidence } of chartPreferences) {
    const match = userMessages.match(pattern);
    if (match) {
      learnings.push({
        type: 'preference',
        key: 'chart_type',
        value: match[1].toLowerCase(),
        confidence,
        source: 'inferred',
      });
    }
  }

  // 4. Detect focus areas from questions
  const focusPatterns = [
    { pattern: /cost|spend|expense|margin|profit/gi, area: 'cost' },
    { pattern: /on.time|late|delivery|transit/gi, area: 'service' },
    { pattern: /volume|shipment|count|quantity/gi, area: 'volume' },
    { pattern: /carrier|vendor|provider/gi, area: 'carrier' },
    { pattern: /lane|route|destination|origin/gi, area: 'geography' },
  ];

  for (const { pattern, area } of focusPatterns) {
    const matches = userMessages.match(pattern);
    if (matches && matches.length >= 2) {
      learnings.push({
        type: 'preference',
        key: 'focus_area',
        value: area,
        confidence: 0.5 + (matches.length * 0.1),
        source: 'inferred',
      });
    }
  }

  // 5. Detect corrections (flag for review)
  const correctionPatterns = [
    /no,?\s*(?:that's not right|that's wrong|I meant)/i,
    /actually,?\s*I (?:want|meant|need)/i,
    /that's incorrect/i,
    /wrong (?:data|numbers|results|field)/i,
    /not what I (?:asked|wanted|meant)/i,
  ];

  for (const pattern of correctionPatterns) {
    if (pattern.test(userMessages)) {
      learnings.push({
        type: 'correction',
        key: 'needs_review',
        value: currentPrompt,
        confidence: 0.5,
        source: 'inferred',
      });
      break;
    }
  }

  // 6. Parse learning flags from AI response
  const flagMatch = aiResponse.match(/<learning_flag>([\s\S]*?)<\/learning_flag>/);
  if (flagMatch) {
    const result: Record<string, string> = {};
    for (const line of flagMatch[1].trim().split('\n')) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        if (key && value) result[key] = value;
      }
    }

    if (result.term) {
      learnings.push({
        type: 'terminology',
        key: result.term.toLowerCase().replace(/\s+/g, '_'),
        value: result.user_said || result.ai_understood || result.term,
        confidence: result.confidence === 'high' ? 0.9 : result.confidence === 'low' ? 0.5 : 0.7,
        source: 'inferred',
      });
    }
  }

  // Deduplicate by type+key
  const seen = new Set<string>();
  return learnings.filter(l => {
    const key = `${l.type}:${l.key}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Save learnings to database
 */
async function saveCustomerLearnings(
  supabaseClient: any,
  customerId: string,
  learnings: LearningExtraction[]
): Promise<void> {
  for (const learning of learnings) {
    try {
      if (learning.type === 'terminology' || learning.type === 'product') {
        // Save to ai_knowledge table
        await supabaseClient.from('ai_knowledge').upsert({
          knowledge_type: learning.type === 'terminology' ? 'term' : 'product',
          key: learning.key,
          label: learning.value,
          definition: learning.value,
          scope: 'customer',
          customer_id: customerId,
          source: learning.source === 'explicit' ? 'learned' : 'inferred',
          confidence: learning.confidence,
          needs_review: learning.confidence < 0.8,
          is_active: learning.confidence >= 0.8,
          is_visible_to_customers: true,
        }, {
          onConflict: 'knowledge_type,key,scope,customer_id',
        });
      }

      if (learning.type === 'preference') {
        // Update customer profile preferences
        await updateCustomerPreference(
          supabaseClient,
          customerId,
          learning.key,
          learning.value,
          learning.confidence
        );
      }

      if (learning.type === 'correction') {
        // Flag for admin review
        await supabaseClient.from('ai_learning_feedback').insert({
          customer_id: customerId,
          trigger_type: 'correction',
          user_message: learning.value,
          status: 'pending_review',
        });
      }
    } catch (e) {
      console.error('Failed to save learning:', learning, e);
    }
  }
}

/**
 * Update preference scores in customer profile
 */
async function updateCustomerPreference(
  supabaseClient: any,
  customerId: string,
  preferenceKey: string,
  preferenceValue: string,
  confidence: number
): Promise<void> {
  try {
    // Get current profile
    const { data: profile } = await supabaseClient
      .from('customer_intelligence_profiles')
      .select('preferences')
      .eq('customer_id', parseInt(customerId))
      .single();

    if (!profile) {
      // Create profile if doesn't exist
      await supabaseClient.from('customer_intelligence_profiles').insert({
        customer_id: parseInt(customerId),
        preferences: {
          [preferenceKey]: { [preferenceValue]: confidence }
        },
      });
      return;
    }

    // Update preference scores
    const preferences = (profile.preferences as Record<string, Record<string, number>>) || {};
    
    if (!preferences[preferenceKey]) {
      preferences[preferenceKey] = {};
    }
    
    // Accumulate score (max 1.0)
    const currentScore = preferences[preferenceKey][preferenceValue] || 0;
    preferences[preferenceKey][preferenceValue] = Math.min(1.0, currentScore + (confidence * 0.1));

    await supabaseClient
      .from('customer_intelligence_profiles')
      .update({ 
        preferences,
        updated_at: new Date().toISOString(),
      })
      .eq('customer_id', parseInt(customerId));
  } catch (e) {
    console.error('Failed to update preference:', e);
  }
}

/**
 * Log AI metric
 */
async function logAIMetric(
  supabaseClient: any,
  customerId: string,
  metricType: string,
  details?: Record<string, any>
): Promise<void> {
  try {
    await supabaseClient.from('ai_metrics').insert({
      customer_id: customerId,
      metric_type: metricType,
      metric_value: 1,
      details: details || null,
    });
  } catch (e) {
    console.error('Failed to log metric:', e);
  }
}
```

### 2. Find the section where the AI response is processed and audit is logged

Look for where `ai_report_audit` insert happens (around line 1800+). Add the learning extraction RIGHT AFTER the audit insert:

```typescript
// EXISTING: Audit log insert
await supabaseClient.from('ai_report_audit').insert({
  customer_id: customerId,
  customer_name: customerName,
  user_request: prompt,
  ai_interpretation: assistantMessage,
  report_definition: reportDefinition,
  status: 'ok',
});

// NEW: Extract and save learnings from this conversation
try {
  const learnings = extractLearningsFromConversation(
    conversationHistory || [],
    prompt,
    assistantMessage
  );

  if (learnings.length > 0) {
    await saveCustomerLearnings(supabaseClient, customerId, learnings);
    
    // Log metric for each learning type
    const learningSummary = learnings.reduce((acc, l) => {
      acc[l.type] = (acc[l.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    await logAIMetric(supabaseClient, customerId, 'learnings_captured', {
      count: learnings.length,
      types: learningSummary,
    });
    
    console.log(`[LEARNING] Captured ${learnings.length} learnings for customer ${customerId}:`, 
      learnings.map(l => `${l.type}:${l.key}`).join(', '));
  }
} catch (learningError) {
  console.error('[LEARNING] Failed to process learnings:', learningError);
  // Don't fail the main request if learning extraction fails
}
```

### 3. Add metric logging for validation errors (optional but recommended)

Find where validation errors are handled and add:

```typescript
// When validation fails, log it
await logAIMetric(supabaseClient, customerId, 'validation_error', {
  errors: validation.errors,
});
```

### 4. Add metric logging for access violations

Find where access control violations are logged and add:

```typescript
// When access violation occurs, log metric
await logAIMetric(supabaseClient, customerId, 'access_violation', {
  violations: accessResult.violations,
});
```

---

## What This Enables

After this update, every AI conversation will:

1. **Extract terminology** - "CG means cargoglide" → saved to `ai_knowledge`
2. **Extract products** - "we sell drawer systems" → saved to `ai_knowledge`  
3. **Track chart preferences** - "make it a pie chart" → saved to `customer_intelligence_profiles.preferences`
4. **Track focus areas** - asks about cost 5x → `preferences.focus_area.cost` increases
5. **Flag corrections** - "no, that's wrong" → saved to `ai_learning_feedback` for review
6. **Log metrics** - all learnings counted in `ai_metrics`

---

## Testing

After deploying, test by:

1. Go to AI Report Studio as a customer
2. Say: "When I say LTL, I mean less than truckload"
3. Generate a report, then ask to "make it a pie chart"
4. Check the AI Analytics dashboard - Learnings count should increase
5. Check `ai_knowledge` table - should have new term for that customer
6. Check `customer_intelligence_profiles` - should have chart_type preference

---

## Verification Query

Run this to see learnings:

```sql
-- See all learned knowledge
SELECT 
  k.customer_id,
  c.company_name,
  k.knowledge_type,
  k.key,
  k.definition,
  k.source,
  k.confidence,
  k.created_at
FROM ai_knowledge k
LEFT JOIN customers c ON c.customer_id = k.customer_id::int
WHERE k.source IN ('learned', 'inferred')
ORDER BY k.created_at DESC
LIMIT 20;

-- See customer preferences
SELECT 
  p.customer_id,
  c.company_name,
  p.preferences,
  p.updated_at
FROM customer_intelligence_profiles p
LEFT JOIN customers c ON c.customer_id = p.customer_id
WHERE p.preferences != '{}'::jsonb;
```

---

# END OF PHASE 5

The learning loop is now complete:
- ✅ Conversations analyzed for learnings
- ✅ Terminology saved to ai_knowledge
- ✅ Preferences accumulated in profiles  
- ✅ Corrections flagged for review
- ✅ Metrics tracked in ai_metrics
- ✅ Dashboard shows real learning count
