# PHASE 8D: Learning System Enhancements

This phase fixes:
1. **Duplicate learning entries** - Edge function was too aggressive
2. **Customer ID display** - Show customer name instead of ID
3. **Promote to Global workflow** - Allow promoting customer terms to global

---

## Part 1: Fix Edge Function Learning Deduplication

### Update: `supabase/functions/generate-report/index.ts`

Find the `extractLearnings` function and **replace it entirely** with this fixed version:

```typescript
// =============================================================================
// LEARNING EXTRACTION (FIXED - NO DUPLICATES)
// =============================================================================

function extractLearnings(
  prompt: string,
  response: string,
  conversationHistory: ConversationMessage[]
): LearningExtraction[] {
  const learnings: LearningExtraction[] = [];
  const seenKeys = new Set<string>();

  // PRIORITY 1: Check for learning flags in AI response (most accurate)
  const flagMatch = response.match(/<learning_flag>([\s\S]*?)<\/learning_flag>/);
  if (flagMatch) {
    const flagContent = flagMatch[1];
    const lines: Record<string, string> = {};
    
    for (const line of flagContent.trim().split("\n")) {
      const colonIndex = line.indexOf(":");
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim().toLowerCase();
        const value = line.substring(colonIndex + 1).trim();
        if (key && value) lines[key] = value;
      }
    }

    if (lines.term) {
      const normalizedKey = lines.term.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
      
      if (normalizedKey && normalizedKey.length >= 2) {
        seenKeys.add(normalizedKey);
        learnings.push({
          type: lines.suggested_category === "product" ? "product" : "terminology",
          key: normalizedKey,
          value: lines.ai_understood || lines.user_said || lines.term,
          confidence: lines.confidence === "high" ? 0.9 : lines.confidence === "low" ? 0.5 : 0.7,
          source: "inferred",
        });
      }
    }
  }

  // PRIORITY 2: Only check explicit patterns if we got NOTHING from learning flags
  // This prevents duplicates when AI already captured the learning
  if (learnings.length === 0) {
    const allUserMessages = [
      ...conversationHistory.filter((m) => m.role === "user").map((m) => m.content),
      prompt,
    ].join("\n");

    // Only match very explicit patterns
    const explicitPatterns = [
      /when I say ['"]([^'"]+)['"],?\s*I mean (.+)/gi,
      /by ['"]([^'"]+)['"],?\s*I mean (.+)/gi,
    ];

    for (const pattern of explicitPatterns) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(allUserMessages)) !== null) {
        const term = match[1]?.trim();
        const meaning = match[2]?.trim();
        
        if (!term || !meaning) continue;
        
        const normalizedKey = term.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
        
        // Skip if already seen or too short/long
        if (seenKeys.has(normalizedKey)) continue;
        if (normalizedKey.length < 2 || normalizedKey.length > 50) continue;
        
        seenKeys.add(normalizedKey);
        learnings.push({
          type: "terminology",
          key: normalizedKey,
          value: meaning,
          confidence: 1.0,
          source: "explicit",
        });
        
        // Only capture one explicit learning per message to avoid noise
        break;
      }
    }
  }

  return learnings;
}
```

**Key Changes:**
1. Learning flags take priority - if AI generates a flag, we use ONLY that
2. Explicit pattern matching only runs if no learning flag was found
3. Better key normalization (removes special chars)
4. Only captures ONE explicit learning per message
5. Minimum key length of 2 characters

---

## Part 2: Show Customer Name Instead of ID

### Update: `src/components/knowledge/AIIntelligence.tsx`

**Step 1:** Update the `KnowledgeItem` interface to include customer info:

```typescript
interface KnowledgeItem {
  id: string;
  knowledge_type: string;
  key: string;
  label: string;
  definition: string;
  ai_instructions: string;
  metadata: Record<string, unknown> | null;
  scope: string;
  customer_id: string;
  source: string;
  confidence: number;
  times_used: number;
  times_corrected: number;
  is_visible_to_customers: boolean;
  is_active: boolean;
  needs_review: boolean;
  created_at: string;
  // Add customer info
  customer_name?: string;
}
```

**Step 2:** Update the `loadKnowledge` function to fetch customer names:

```typescript
const loadKnowledge = async () => {
  // First get knowledge items
  const { data: knowledgeData, error } = await supabase
    .from('ai_knowledge')
    .select('*')
    .eq('is_active', true)
    .order('knowledge_type')
    .order('key');

  if (error) {
    setLoading(false);
    return;
  }

  // Get unique customer IDs that need names
  const customerIds = [...new Set(
    (knowledgeData || [])
      .filter(k => k.scope === 'customer' && k.customer_id)
      .map(k => parseInt(k.customer_id))
  )];

  // Fetch customer names if there are any
  let customerMap: Record<string, string> = {};
  if (customerIds.length > 0) {
    const { data: customers } = await supabase
      .from('customer')
      .select('customer_id, company_name')
      .in('customer_id', customerIds);
    
    if (customers) {
      customerMap = customers.reduce((acc, c) => {
        acc[c.customer_id.toString()] = c.company_name;
        return acc;
      }, {} as Record<string, string>);
    }
  }

  // Merge customer names into knowledge items
  const enrichedKnowledge = (knowledgeData || []).map(k => ({
    ...k,
    customer_name: k.customer_id ? customerMap[k.customer_id] : undefined
  }));

  setKnowledge(enrichedKnowledge);
  setLoading(false);
};
```

**Step 3:** Update where customer_id is displayed. Find the badge that shows the customer_id and replace it:

Find this (around line 238-245):
```typescript
{item.scope === 'customer' && (
  <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">
    {item.customer_id}
  </span>
)}
```

Replace with:
```typescript
{item.scope === 'customer' && (
  <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">
    {item.customer_name || `Customer #${item.customer_id}`}
  </span>
)}
```

There are likely multiple places this appears. Search for `item.customer_id` and update each occurrence to use `item.customer_name || item.customer_id`.

---

## Part 3: Add "Promote to Global" Feature

### Update: `src/components/knowledge/AIIntelligence.tsx`

**Step 1:** Import the Globe icon at the top:

```typescript
import {
  Brain,
  AlertTriangle,
  CheckCircle,
  Search,
  Plus,
  Database,
  BookOpen,
  Calculator,
  Package,
  Sparkles,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  X,
  Loader2,
  Globe, // Add this
} from 'lucide-react';
```

**Step 2:** Add the `promoteToGlobal` function after `toggleVisibility`:

```typescript
const promoteToGlobal = async (item: KnowledgeItem) => {
  const confirmMessage = `Promote "${item.label || item.key}" to global knowledge?\n\n` +
    `This will:\n` +
    `• Make it available to ALL customers\n` +
    `• Remove the customer-specific version\n\n` +
    `Current customer: ${item.customer_name || item.customer_id}`;
  
  if (!confirm(confirmMessage)) return;

  try {
    // Create global version
    const { error: insertError } = await supabase
      .from('ai_knowledge')
      .insert({
        knowledge_type: item.knowledge_type,
        key: item.key,
        label: item.label,
        definition: item.definition,
        ai_instructions: item.ai_instructions,
        metadata: item.metadata,
        scope: 'global',
        customer_id: null,
        source: 'promoted',
        confidence: 1.0,
        is_active: true,
        needs_review: false,
        is_visible_to_customers: item.is_visible_to_customers,
      });

    if (insertError) {
      console.error('Failed to create global version:', insertError);
      alert('Failed to promote: ' + insertError.message);
      return;
    }

    // Delete customer-specific version
    const { error: deleteError } = await supabase
      .from('ai_knowledge')
      .delete()
      .eq('id', item.id);

    if (deleteError) {
      console.error('Failed to delete customer version:', deleteError);
      // Don't alert - the global version was created successfully
    }

    // Refresh the list
    loadKnowledge();
    loadStats();
  } catch (error) {
    console.error('Promote to global failed:', error);
    alert('Failed to promote to global');
  }
};
```

**Step 3:** Add the promote button in the knowledge item row actions.

Find the row actions section (where Edit and Delete buttons are). It should look something like:

```typescript
<button
  onClick={() => toggleVisibility(item)}
  className="..."
  title={item.is_visible_to_customers ? 'Hide from customers' : 'Show to customers'}
>
  {item.is_visible_to_customers ? <Eye ... /> : <EyeOff ... />}
</button>
<button
  onClick={() => setSelectedItem(item)}
  className="..."
>
  <Edit2 ... />
</button>
<button
  onClick={() => deleteItem(item)}
  className="..."
>
  <Trash2 ... />
</button>
```

Add this BEFORE the Edit button:

```typescript
{item.scope === 'customer' && (
  <button
    onClick={() => promoteToGlobal(item)}
    className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
    title="Promote to Global"
  >
    <Globe className="w-4 h-4" />
  </button>
)}
```

---

## Part 4: Add "Mark as Confidential" Option (Optional Enhancement)

If you want to prevent certain customer terms from ever being promoted to global:

### Database Migration (run in Supabase SQL editor):

```sql
-- Add confidential flag to prevent accidental global promotion
ALTER TABLE ai_knowledge ADD COLUMN IF NOT EXISTS is_confidential BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN ai_knowledge.is_confidential IS 'If true, this knowledge should never be promoted to global scope';
```

### Update the Edit Modal to include confidential checkbox:

In the `KnowledgeEditModal` component, add to the form:

```typescript
<div className="flex items-center gap-2">
  <input
    type="checkbox"
    id="confidential"
    checked={formData.is_confidential || false}
    onChange={(e) =>
      setFormData({ ...formData, is_confidential: e.target.checked })
    }
  />
  <label htmlFor="confidential" className="text-sm">
    Confidential (cannot be promoted to global)
  </label>
</div>
```

### Update the promote button to respect confidentiality:

```typescript
{item.scope === 'customer' && !item.is_confidential && (
  <button
    onClick={() => promoteToGlobal(item)}
    className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
    title="Promote to Global"
  >
    <Globe className="w-4 h-4" />
  </button>
)}
{item.scope === 'customer' && item.is_confidential && (
  <span className="p-1 text-gray-400" title="Confidential - Cannot promote">
    <Globe className="w-4 h-4" />
  </span>
)}
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `supabase/functions/generate-report/index.ts` | Fixed `extractLearnings` to prevent duplicates |
| `src/components/knowledge/AIIntelligence.tsx` | Show customer name instead of ID |
| `src/components/knowledge/AIIntelligence.tsx` | Add "Promote to Global" button and function |
| Database (optional) | Add `is_confidential` column |

---

## Testing Checklist

### Deduplication Fix
1. [ ] Go to AI Studio as a customer
2. [ ] Say: "When I say 'DPM', I mean Deliveries Per Month"
3. [ ] Check `ai_knowledge` table - should have only ONE entry for "dpm"
4. [ ] The entry should have confidence 0.9 (from learning flag)

### Customer Name Display
1. [ ] Go to AI Knowledge Base
2. [ ] Customer-scoped terms should show company name (e.g., "DECKED") not ID

### Promote to Global
1. [ ] Find a customer-scoped term
2. [ ] Click the globe icon
3. [ ] Confirm the promotion
4. [ ] Term should now appear with scope "global" and no customer badge
5. [ ] Old customer-specific entry should be gone

---

## Clean Up Duplicate Entries

Run this SQL to clean up the existing duplicates:

```sql
-- Find and remove duplicate entries, keeping the one with highest confidence
WITH duplicates AS (
  SELECT id, key, customer_id, confidence,
    ROW_NUMBER() OVER (
      PARTITION BY key, customer_id 
      ORDER BY confidence DESC, created_at ASC
    ) as rn
  FROM ai_knowledge
  WHERE scope = 'customer'
)
DELETE FROM ai_knowledge
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);
```

---

# END OF PHASE 8D
