# PHASE 5B: AI VISUALIZATION SUGGESTIONS

This phase adds intelligent visualization suggestions so the AI can:
1. Proactively recommend the best visualization for the user's data
2. Suggest alternative views they might not have thought of
3. Offer "You might also like..." follow-ups after creating a report

---

## Overview

Currently, users must know what visualization they want. With this phase:

- User says: "Show me my shipment data"
- AI responds: "I see you have shipments to 27 states. Would you like:
  - A **heat map** showing geographic distribution
  - A **bar chart** of your top destinations
  - A **trend line** showing volume over time
  
  What interests you most?"

---

## STEP 1: Update Edge Function System Prompt

### FILE: supabase/functions/generate-report/index.ts

Add a new section to the system prompt after REPORT_SCHEMA:

```typescript
const VISUALIZATION_SUGGESTIONS = `
## PROACTIVE VISUALIZATION SUGGESTIONS

You are a data visualization expert. When a user asks a vague or open-ended question, DON'T just pick a visualization - SUGGEST options based on their data characteristics.

### When to Suggest (not just build):

1. **Vague requests**: "Show me my data", "What does my shipping look like?", "Help me understand my freight"
2. **Exploratory questions**: "What should I look at?", "What's interesting?", "Any insights?"
3. **First-time users**: When there's no conversation history, offer guidance
4. **After building a report**: Suggest related visualizations as follow-ups

### How to Suggest:

Analyze what you know about their data and offer 2-3 options:

**Example 1 - Geographic data available:**
User: "Show me my shipments"
AI: "I can visualize your shipments several ways:

📍 **Heat Map** - See which states receive the most shipments (you ship to 27 states)
📊 **Bar Chart** - Compare your top 10 destinations by volume
📈 **Trend Line** - See how your shipping volume has changed over time

Which would be most useful for what you're trying to understand?"

**Example 2 - Multiple carriers:**
User: "Help me understand my carrier usage"
AI: "Here are some ways to analyze your carriers:

🎯 **Radar Chart** - Compare your top carriers across cost, speed, and volume
🥧 **Pie Chart** - See what percentage of shipments each carrier handles
📊 **Bar Chart** - Rank carriers by total spend or shipment count
📈 **Bump Chart** - See how carrier rankings have changed month-to-month

What aspect of carrier performance matters most to you?"

**Example 3 - Time-based data:**
User: "What's happening with my shipping?"
AI: "I can show you different perspectives:

📅 **Calendar Heatmap** - See your busiest shipping days
📈 **Trend Line** - Track volume or spend over time
📊 **Monthly Comparison** - Compare this month vs previous months

Are you looking for patterns, trends, or specific time periods?"

### Suggestion Rules:

1. **Be specific about their data** - "you ship to 27 states", "you use 5 carriers", "you have 6 months of data"
2. **Explain the value** - Why would they want each visualization?
3. **Keep it to 2-4 options** - Don't overwhelm
4. **Use emojis sparingly** - One per option for visual scanning
5. **End with a question** - Guide them to choose

### After Building a Report - Suggest Follow-ups:

After creating any report, suggest 1-2 related visualizations:

"Here's your carrier spend breakdown. 

**You might also find useful:**
- 🗺️ A heat map showing where each carrier delivers
- 📈 A trend showing how carrier costs have changed over time

Want me to create either of these?"

### Data-Driven Suggestions:

Base suggestions on what you know:

| Data Characteristic | Suggest |
|---------------------|---------|
| Ships to 10+ states | Heat map, geographic analysis |
| Uses 3+ carriers | Radar comparison, carrier breakdown |
| 3+ months of data | Trend lines, bump charts |
| High variance in costs | Outlier analysis, cost breakdown |
| Multiple product types | Treemap, category breakdown |
| Daily data available | Calendar heatmap |

### DON'T Suggest When:

- User is very specific: "Show me a bar chart of spend by carrier" → Just build it
- User is refining: "Make it a pie chart instead" → Just change it
- User asks a direct question: "What's my total spend?" → Just answer

### Suggestion Format:

Use this structure:
\`\`\`
I can show you this several ways:

📊 **[Viz Type]** - [What it shows] ([specific data point about their data])
📈 **[Viz Type]** - [What it shows] ([why it's relevant])
🗺️ **[Viz Type]** - [What it shows] ([what they'd learn])

[Question to guide their choice]
\`\`\`
`;
```

---

## STEP 2: Add Data Profiling to Edge Function

Before generating suggestions, the AI needs to know what data the user has. Add this to the edge function:

### FILE: supabase/functions/generate-report/index.ts

Add a function to fetch data profile:

```typescript
interface DataProfile {
  totalShipments: number;
  stateCount: number;
  carrierCount: number;
  monthsOfData: number;
  hasCanadaData: boolean;
  topStates: string[];
  topCarriers: string[];
  avgShipmentsPerDay: number;
}

async function fetchDataProfile(supabase: any, customerId: string): Promise<DataProfile | null> {
  try {
    // Get basic counts
    const { data: profileData, error } = await supabase.rpc('get_customer_data_profile', {
      p_customer_id: customerId
    });
    
    if (error || !profileData) {
      console.error('Failed to fetch data profile:', error);
      return null;
    }
    
    return profileData;
  } catch (e) {
    console.error('Error fetching data profile:', e);
    return null;
  }
}
```

Then add the profile to the system prompt context:

```typescript
// In the main handler, after fetching knowledge:
const dataProfile = await fetchDataProfile(supabase, customerId);

let dataProfileContext = '';
if (dataProfile) {
  dataProfileContext = `
CUSTOMER DATA PROFILE:
- Total Shipments: ${dataProfile.totalShipments.toLocaleString()}
- Ships to ${dataProfile.stateCount} states${dataProfile.hasCanadaData ? ' (including Canada)' : ''}
- Uses ${dataProfile.carrierCount} carriers
- Has ${dataProfile.monthsOfData} months of data
- Top destinations: ${dataProfile.topStates.slice(0, 5).join(', ')}
- Top carriers: ${dataProfile.topCarriers.slice(0, 3).join(', ')}
- Average ${dataProfile.avgShipmentsPerDay.toFixed(1)} shipments per day

Use this information to make specific, relevant visualization suggestions.
`;
}

// Add to system prompt
const systemPrompt = `${EXPERT_SYSTEM_PROMPT}
${dataProfileContext}
${VISUALIZATION_SUGGESTIONS}
// ... rest of prompt
`;
```

---

## STEP 3: Create Database Function for Data Profile

### FILE: supabase/migrations/[timestamp]_add_data_profile_function.sql

```sql
-- Function to get customer data profile for AI suggestions
CREATE OR REPLACE FUNCTION get_customer_data_profile(p_customer_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'totalShipments', COALESCE(COUNT(*), 0),
    'stateCount', COALESCE(COUNT(DISTINCT destination_state), 0),
    'carrierCount', COALESCE(COUNT(DISTINCT carrier_id), 0),
    'monthsOfData', COALESCE(
      EXTRACT(MONTH FROM AGE(MAX(pickup_date), MIN(pickup_date))) + 
      EXTRACT(YEAR FROM AGE(MAX(pickup_date), MIN(pickup_date))) * 12,
      0
    )::INTEGER,
    'hasCanadaData', EXISTS(
      SELECT 1 FROM shipment_report_view 
      WHERE customer_id = p_customer_id::INTEGER 
      AND destination_state IN ('AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT')
    ),
    'topStates', COALESCE(
      (SELECT json_agg(destination_state ORDER BY cnt DESC)
       FROM (
         SELECT destination_state, COUNT(*) as cnt
         FROM shipment_report_view
         WHERE customer_id = p_customer_id::INTEGER
         GROUP BY destination_state
         ORDER BY cnt DESC
         LIMIT 5
       ) t),
      '[]'::json
    ),
    'topCarriers', COALESCE(
      (SELECT json_agg(carrier_name ORDER BY cnt DESC)
       FROM (
         SELECT carrier_name, COUNT(*) as cnt
         FROM shipment_report_view
         WHERE customer_id = p_customer_id::INTEGER
         AND carrier_name IS NOT NULL
         GROUP BY carrier_name
         ORDER BY cnt DESC
         LIMIT 3
       ) t),
      '[]'::json
    ),
    'avgShipmentsPerDay', COALESCE(
      (SELECT COUNT(*)::FLOAT / NULLIF(
        EXTRACT(DAY FROM (MAX(pickup_date) - MIN(pickup_date))), 0
      )
       FROM shipment_report_view
       WHERE customer_id = p_customer_id::INTEGER),
      0
    )
  ) INTO result
  FROM shipment_report_view
  WHERE customer_id = p_customer_id::INTEGER;
  
  RETURN result;
END;
$$;
```

---

## STEP 4: Add Follow-up Suggestions Component

### FILE: src/components/ai-studio/FollowUpSuggestions.tsx

Create a component that shows after a report is generated:

```tsx
import { Sparkles, Map, BarChart3, TrendingUp, PieChart, Calendar, GitCompare } from 'lucide-react';

interface Suggestion {
  icon: typeof Map;
  label: string;
  prompt: string;
}

interface FollowUpSuggestionsProps {
  currentReportType: string;
  groupBy?: string;
  onSuggestionClick: (prompt: string) => void;
}

const suggestionsByContext: Record<string, Suggestion[]> = {
  // After a carrier report
  carrier: [
    { icon: Map, label: 'See where each carrier delivers', prompt: 'Show me a heat map of deliveries by carrier' },
    { icon: TrendingUp, label: 'Carrier cost trends over time', prompt: 'Show me how carrier costs have changed month by month' },
    { icon: GitCompare, label: 'Compare carriers side by side', prompt: 'Create a radar chart comparing my top 3 carriers' },
  ],
  // After a geographic report
  geographic: [
    { icon: BarChart3, label: 'Top destinations breakdown', prompt: 'Show me a bar chart of my top 10 destination states' },
    { icon: TrendingUp, label: 'Regional cost trends', prompt: 'Show me how costs have changed by region over time' },
    { icon: PieChart, label: 'Mode split by region', prompt: 'What modes do I use for each region?' },
  ],
  // After a time-based report
  temporal: [
    { icon: Calendar, label: 'Daily shipping patterns', prompt: 'Show me a calendar heatmap of my shipping activity' },
    { icon: BarChart3, label: 'Compare months side by side', prompt: 'Compare this month vs last month' },
    { icon: Map, label: 'Geographic changes over time', prompt: 'Has my geographic distribution changed over time?' },
  ],
  // Default suggestions
  default: [
    { icon: Map, label: 'Geographic distribution', prompt: 'Show me where my shipments go on a heat map' },
    { icon: GitCompare, label: 'Compare carriers', prompt: 'Compare my carriers on cost, speed, and volume' },
    { icon: Calendar, label: 'Shipping patterns', prompt: 'When are my busiest shipping days?' },
  ],
};

export function FollowUpSuggestions({ 
  currentReportType, 
  groupBy,
  onSuggestionClick 
}: FollowUpSuggestionsProps) {
  // Determine which suggestions to show based on current report
  let context = 'default';
  if (groupBy?.includes('carrier')) context = 'carrier';
  else if (groupBy?.includes('state') || currentReportType === 'map') context = 'geographic';
  else if (groupBy?.includes('month') || groupBy?.includes('date')) context = 'temporal';

  const suggestions = suggestionsByContext[context] || suggestionsByContext.default;

  return (
    <div className="mt-6 p-4 bg-gradient-to-r from-rocket-50 to-orange-50 rounded-xl border border-rocket-100">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-rocket-600" />
        <span className="text-sm font-medium text-rocket-800">You might also find useful</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => {
          const Icon = suggestion.icon;
          return (
            <button
              key={index}
              onClick={() => onSuggestionClick(suggestion.prompt)}
              className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-rocket-200 
                         text-sm text-slate-700 hover:border-rocket-400 hover:bg-rocket-50 
                         transition-colors shadow-sm"
            >
              <Icon className="w-4 h-4 text-rocket-500" />
              {suggestion.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

---

## STEP 5: Add Initial Prompt Suggestions

### FILE: src/components/ai-studio/SuggestedPrompts.tsx

Update to show data-aware suggestions:

```tsx
// Add to the existing SuggestedPrompts component or create if not exists

interface DataAwareSuggestion {
  category: string;
  prompts: Array<{
    text: string;
    description: string;
  }>;
}

// These should be populated based on actual customer data
const getDataAwareSuggestions = (dataProfile: DataProfile | null): DataAwareSuggestion[] => {
  if (!dataProfile) {
    return defaultSuggestions;
  }

  const suggestions: DataAwareSuggestion[] = [];

  // Geographic suggestions if they ship to multiple states
  if (dataProfile.stateCount >= 5) {
    suggestions.push({
      category: '📍 Geographic',
      prompts: [
        { 
          text: 'Where do my shipments go?', 
          description: `See distribution across your ${dataProfile.stateCount} destination states` 
        },
        { 
          text: 'Which states cost the most to serve?', 
          description: 'Heat map of average cost by destination' 
        },
      ]
    });
  }

  // Carrier suggestions if they use multiple carriers
  if (dataProfile.carrierCount >= 2) {
    suggestions.push({
      category: '🚚 Carriers',
      prompts: [
        { 
          text: 'Compare my carriers', 
          description: `Analyze your ${dataProfile.carrierCount} carriers on cost, speed & volume` 
        },
        { 
          text: 'Which carrier should I use more?', 
          description: 'Performance comparison with recommendations' 
        },
      ]
    });
  }

  // Time-based suggestions if they have enough history
  if (dataProfile.monthsOfData >= 3) {
    suggestions.push({
      category: '📈 Trends',
      prompts: [
        { 
          text: 'How has my shipping changed?', 
          description: `Trends over your ${dataProfile.monthsOfData} months of data` 
        },
        { 
          text: 'When are my busiest days?', 
          description: 'Calendar view of shipping patterns' 
        },
      ]
    });
  }

  // Cost analysis
  suggestions.push({
    category: '💰 Cost Analysis',
    prompts: [
      { 
        text: 'What drives my freight costs?', 
        description: 'Breakdown by carrier, mode, and destination' 
      },
      { 
        text: "What's my cost per unit?", 
        description: 'Calculate efficiency metrics' 
      },
    ]
  });

  return suggestions;
};
```

---

## STEP 6: Integrate into AI Report Studio Page

### FILE: src/pages/AIReportStudioPage.tsx

Add the follow-up suggestions after report renders:

```tsx
// Import the component
import { FollowUpSuggestions } from '../components/ai-studio/FollowUpSuggestions';

// In the JSX, after ReportRenderer:
{executedData && currentReport && (
  <FollowUpSuggestions
    currentReportType={currentReport.sections[0]?.type || 'default'}
    groupBy={
      currentReport.sections.find(s => s.type === 'chart')?.config?.groupBy ||
      currentReport.sections.find(s => s.type === 'table')?.config?.groupBy
    }
    onSuggestionClick={(prompt) => handleSendMessage(prompt)}
  />
)}
```

---

## Testing

After implementing, test these scenarios:

### Test 1: Vague Request
> User: "Show me my data"
> 
> Expected: AI offers 2-3 visualization options based on their actual data profile

### Test 2: Exploratory Question  
> User: "What should I look at?"
>
> Expected: AI suggests relevant analyses based on data characteristics (geographic if many states, carrier comparison if multiple carriers, etc.)

### Test 3: Follow-up Suggestions
> User: "Show me spend by carrier"
> [Report generates]
>
> Expected: Follow-up suggestions appear like "See where each carrier delivers" and "Carrier cost trends"

### Test 4: Specific Request (No Suggestions)
> User: "Show me a pie chart of shipments by mode"
>
> Expected: AI builds the report directly without offering alternatives first

---

## Summary

This phase makes the AI a proactive visualization advisor:

1. **Data Profile** - AI knows customer's data characteristics (states, carriers, history)
2. **Smart Suggestions** - For vague requests, AI offers options with explanations
3. **Context-Aware** - Suggestions are specific to the user's actual data
4. **Follow-Ups** - After each report, related visualizations are suggested
5. **Initial Prompts** - Starting suggestions are tailored to what data they have

The AI becomes a partner in data exploration, not just a report builder.
