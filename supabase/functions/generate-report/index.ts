import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "npm:@anthropic-ai/sdk@0.39.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  prompt: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  customerId?: string;
  isAdmin?: boolean;
  customerName?: string;
  knowledgeContext?: string;
  currentReport?: Record<string, unknown>;
}

interface AIKnowledge {
  id: string;
  knowledge_type: string;
  key: string;
  label: string | null;
  definition: string | null;
  ai_instructions: string | null;
  metadata: Record<string, unknown> | null;
  scope: string;
  customer_id: string | null;
  confidence: number;
  times_used: number;
  is_visible_to_customers: boolean;
}

interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
  category?: string;
  aliases: string[];
  related_fields: string[];
  ai_instructions?: string;
  usage_count: number;
}

interface KnowledgeDocument {
  id: string;
  title: string;
  description: string | null;
  category: string;
  scope: 'global' | 'customer';
  customer_id: string | null;
  extracted_text: string;
  keywords: string[];
  priority: number;
}

interface FieldBusinessContext {
  field_name: string;
  display_label: string | null;
  business_description: string | null;
  usage_notes: string | null;
  example_values: string | null;
  common_filters: string | null;
  related_fields: string[] | null;
  admin_only: boolean;
}

interface LearningFlag {
  term: string;
  user_said: string;
  ai_understood: string;
  confidence: string;
  suggested_scope: string;
  suggested_category: string;
  maps_to_field?: string;
}

interface SchemaColumn {
  view_name: string;
  column_name: string;
  data_type: string;
  ordinal_position: number;
  is_groupable: boolean;
  is_aggregatable: boolean;
}

interface FeedbackTrigger {
  type: 'correction' | 'frustration' | 'clarification' | 'data_issue';
  userMessage: string;
  triggerPhrase: string;
}

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

const VALID_SECTION_TYPES = ['hero', 'stat-row', 'category-grid', 'chart', 'table', 'header', 'map'];
const VALID_CHART_TYPES = ['bar', 'line', 'pie', 'treemap', 'radar', 'area', 'scatter', 'bump', 'funnel', 'heatmap', 'calendar', 'waterfall'];
const VALID_MAP_TYPES = ['choropleth', 'flow', 'cluster', 'arc'];
const RESTRICTED_FIELDS = ['cost', 'margin', 'carrier_cost'];

const COMPLAINT_PHRASES = [
  "not right", "not correct", "wrong", "doesn't look right",
  "numbers are off", "that's not what", "incorrect", "not accurate",
  "doesn't make sense", "way off", "not even close", "that's wrong",
  "that's not right", "numbers don't add up", "data isn't correct",
  "not what i asked", "not what i wanted", "that's incorrect"
];

function detectComplaint(userMessage: string): boolean {
  const lowerMessage = userMessage.toLowerCase();
  return COMPLAINT_PHRASES.some(phrase => lowerMessage.includes(phrase));
}

function detectFeedbackTrigger(userMessage: string): FeedbackTrigger | null {
  const lowerMessage = userMessage.toLowerCase();

  const correctionPhrases = [
    "that's not what i",
    "that's not right",
    "that's wrong",
    "not what i asked",
    "no, i wanted",
    "not quite",
    "doesn't look right",
    "numbers are off",
    "data isn't correct",
    "not accurate",
    "that's incorrect",
    "this isn't right",
    "wrong numbers",
    "wrong data",
    "that doesn't match"
  ];

  const frustrationPhrases = [
    "i already told you",
    "like i said",
    "i just want",
    "can you just",
    "why did you",
    "makes no sense",
    "that's not helpful",
    "you're not understanding",
    "you don't understand",
    "still wrong",
    "again, i want"
  ];

  const dataIssuePhrases = [
    "missing data",
    "no data",
    "empty",
    "should be more",
    "where are the",
    "why is it zero",
    "numbers don't add up"
  ];

  for (const phrase of correctionPhrases) {
    if (lowerMessage.includes(phrase)) {
      return {
        type: 'correction',
        userMessage,
        triggerPhrase: phrase
      };
    }
  }

  for (const phrase of frustrationPhrases) {
    if (lowerMessage.includes(phrase)) {
      return {
        type: 'frustration',
        userMessage,
        triggerPhrase: phrase
      };
    }
  }

  for (const phrase of dataIssuePhrases) {
    if (lowerMessage.includes(phrase)) {
      return {
        type: 'data_issue',
        userMessage,
        triggerPhrase: phrase
      };
    }
  }

  return null;
}

const SCHEMA_RULES = `
### Access Control Rules
- **cost**: ADMIN ONLY - carrier cost, never show to customers
- **margin**: ADMIN ONLY - profit margin, never show to customers
- **retail**: Safe to show to customers as "charges" or "spend"
- When admin views as customer (impersonation), treat as customer view

### Common Calculated Metrics
- Total Shipments: COUNT(*)
- Total Spend: SUM(retail) - for customers
- Total Cost: SUM(cost) - ADMIN ONLY
- Total Margin: SUM(margin) - ADMIN ONLY
- Avg Cost per Shipment: AVG(cost) - ADMIN ONLY
- Avg Spend per Shipment: AVG(retail) - for customers
- Total Miles: SUM(miles)
- Avg Miles: AVG(miles)
- Cost per Mile: SUM(cost) / NULLIF(SUM(miles), 0) - ADMIN ONLY
- Spend per Mile: SUM(retail) / NULLIF(SUM(miles), 0)
- Unique Lanes: COUNT(DISTINCT lane)
- Unique Carriers: COUNT(DISTINCT carrier_name)

### IMPORTANT
Only use columns listed in the schema table above. If a user asks about data not in this schema, tell them what IS available and suggest alternatives.
`;

const CALCULATED_METRICS = `
## CALCULATED METRICS

You can create calculated fields by combining existing numeric fields. Always use NULLIF to prevent division by zero.

### Available Calculations for Customers:

| Metric | Formula | Use Case |
|--------|---------|----------|
| Spend per Unit | retail / NULLIF(quantity, 0) | Cost efficiency by item count |
| Spend per Pallet | retail / NULLIF(number_of_pallets, 0) | Cost efficiency by pallet |
| Spend per Mile | retail / NULLIF(miles, 0) | Distance-based cost analysis |
| Spend per Pound | retail / NULLIF(weight, 0) | Weight-based cost analysis |
| Units per Shipment | quantity / COUNT(*) | Average load size |
| Weight per Pallet | weight / NULLIF(number_of_pallets, 0) | Pallet density |

### Additional Calculations for ADMINS ONLY:

| Metric | Formula | Use Case |
|--------|---------|----------|
| Cost per Unit | cost / NULLIF(quantity, 0) | Carrier cost efficiency |
| Cost per Mile | cost / NULLIF(miles, 0) | Carrier cost per distance |
| Margin | retail - cost | Profit per shipment |
| Margin % | (retail - cost) / NULLIF(retail, 0) * 100 | Profit percentage |
| Margin per Unit | (retail - cost) / NULLIF(quantity, 0) | Profit per item |

### Specifying Calculated Fields in Reports:

Add a "calculatedFields" array at the report level:

\`\`\`json
{
  "calculatedFields": [
    {
      "name": "spend_per_unit",
      "formula": "retail / NULLIF(quantity, 0)",
      "label": "Spend Per Unit",
      "format": "currency"
    },
    {
      "name": "spend_per_mile",
      "formula": "retail / NULLIF(miles, 0)",
      "label": "Spend Per Mile",
      "format": "currency"
    }
  ]
}
\`\`\`

Then reference the calculated field in metrics using its name:

\`\`\`json
{
  "metric": {
    "label": "Avg Spend Per Unit",
    "field": "spend_per_unit",
    "aggregation": "avg",
    "format": "currency"
  }
}
\`\`\`

### IMPORTANT: Ratio Aggregation

When averaging ratio metrics like "cost per unit" across groups, the system uses the **correct aggregate formula**:

- **CORRECT**: SUM(retail) / SUM(quantity) = Total cost / Total units
- **WRONG**: AVG(retail/quantity) = Average of individual ratios (misleading)

This ensures accurate averages. For example, if you have:
- Shipment A: $1000 / 10 units = $100/unit
- Shipment B: $200 / 2 units = $100/unit

The correct average is: $1200 / 12 units = $100/unit (not $200/unit which AVG would give)

### When User Asks About Calculated Metrics:

**Always clarify what they want to divide by:**

User: "What's my cost per unit?"
AI: "To calculate cost per unit, should I divide your spend by:
- Number of items (quantity)
- Number of pallets
- Weight in pounds

Which makes the most sense for your analysis?"

User: "Items"
AI: "Got it - I'll calculate spend per item (retail / quantity)."

**Never assume the denominator - always ask if unclear.**
`;

const TEXT_CATEGORIZATION = `
## TEXT-BASED CATEGORIZATION

You can create custom categories by searching text fields for keywords. This is useful when users want to group by product type, customer segment, or other custom classifications.

### Searchable Fields:

| Field | Description |
|-------|-------------|
| description | Product/shipment descriptions |
| destination_company | Receiver/consignee name |
| origin_company | Shipper name |
| reference_number | Customer reference numbers |
| carrier_name | Carrier/trucking company |
| freight_class | Freight classification |

### How to Use:

When a user wants to group by something that isn't a direct database field (like "product type" or "customer segment"):

1. **Ask** what categories they want to create
2. **Get** the keywords that identify each category
3. **Build** the categorization rules

### Example Conversation:

User: "Show me costs by product type"
AI: "What products do you ship? List them and I'll group everything else as 'Other'."

User: "Drawer systems, cargoglide, and toolboxes"
AI: "Got it! I'll search the description field for:
- 'drawer' -> DRAWER SYSTEM
- 'cargoglide' -> CARGOGLIDE
- 'toolbox' -> TOOLBOX
- Everything else -> OTHER

Building your report now!"

### In Report Definition:

Add a "categorization" object at the report level. The "contains" field can be a single keyword OR an array of keywords for spelling variations:

\`\`\`json
{
  "categorization": {
    "field": "description",
    "name": "product_category",
    "rules": [
      { "contains": "drawer", "category": "DRAWER SYSTEM" },
      { "contains": ["cargoglide", "cargo glide"], "category": "CARGOGLIDE" },
      { "contains": ["toolbox", "tool box"], "category": "TOOLBOX" }
    ],
    "default": "OTHER"
  }
}
\`\`\`

Then use the categorization name as the groupBy field:

\`\`\`json
{
  "type": "chart",
  "config": {
    "title": "Spend by Product Type",
    "chartType": "pie",
    "groupBy": "product_category",
    "metric": {
      "label": "Total Spend",
      "field": "retail",
      "aggregation": "sum",
      "format": "currency"
    }
  }
}
\`\`\`

### Rules for Categorization:

1. **Case-insensitive** - "Drawer" matches "drawer", "DRAWER", etc.
2. **Partial match** - "drawer" matches "Drawer System 500", "Heavy Duty Drawer", etc.
3. **First match wins** - If a row matches multiple rules, the first matching rule is used
4. **Default required** - Always specify a default category for non-matching rows
5. **Array for variations** - Use an array to match multiple spellings: ["toolbox", "tool box"]

### Keyword Matching Tips:

When categorizing by text search, **always consider spelling variations**:

- "toolbox" vs "tool box"
- "cargoglide" vs "cargo glide"
- "home depot" vs "homedepot"
- Company names with/without spaces, hyphens, etc.

**Always ask the user**: "Any alternate spellings I should look for? Like 'cargoglide' vs 'cargo glide'?"

Example with variations:
\`\`\`json
{
  "contains": ["toolbox", "tool box", "tool-box"],
  "category": "TOOLBOX"
}
\`\`\`

### When to Use Categorization:

- User asks to group by "product", "product type", "item type"
- User asks to group by "customer segment", "customer type"
- User asks to group by "region" (when not a direct field)
- Any grouping that requires keyword matching in text fields

### Conversation Flow:

User: "Break down spend by customer type"
AI: "I can categorize customers by searching company names. What customer types do you have? For example:
- Retail stores
- Distributors
- Direct-to-consumer

Give me the types and I'll look for keywords in the company names."

User: "Home Depot, Lowe's, and Amazon are our big box retailers. Everyone else is a distributor."
AI: "Perfect! I'll categorize by destination company:
- 'home depot' -> BIG BOX RETAIL
- 'lowes' or 'lowe's' -> BIG BOX RETAIL
- 'amazon' -> BIG BOX RETAIL
- Everything else -> DISTRIBUTOR

Building your report!"
`;

const NUMERIC_CATEGORIZATION = `
## NUMERIC RANGE CATEGORIZATION

You can create categories based on numeric thresholds (small/medium/large, etc).

### Fields for Range Categories:

| Field | Unit | Description |
|-------|------|-------------|
| weight | lbs | Shipment weight |
| quantity | items | Number of items |
| number_of_pallets | pallets | Pallet count |
| miles | miles | Distance traveled |
| retail | $ | Customer charges |
| shipment_value | $ | Declared value |

### How to Use:

When a user wants to categorize by size, value, or other numeric ranges:

1. **Clarify** which field defines the category (weight, pallets, items, etc.)
2. **Get** the range thresholds from the user
3. **Build** the numeric categorization rules

### Example Conversation:

User: "Break down shipments by size"
AI: "How do you define size - by weight, pallets, or items?"

User: "Weight"
AI: "What weight ranges for small, medium, and large?"

User: "Under 500 is small, 500-2000 is medium, over 2000 is large"
AI: "Got it! I'll categorize by weight:
- SMALL: Under 500 lbs
- MEDIUM: 500-2,000 lbs
- LARGE: Over 2,000 lbs

Building your report now!"

### In Report Definition:

Add a "numericCategorization" object at the report level:

\`\`\`json
{
  "numericCategorization": {
    "field": "weight",
    "name": "size_category",
    "ranges": [
      { "max": 500, "category": "SMALL" },
      { "min": 500, "max": 2000, "category": "MEDIUM" },
      { "min": 2000, "category": "LARGE" }
    ]
  }
}
\`\`\`

Then use the categorization name as the groupBy field:

\`\`\`json
{
  "type": "chart",
  "config": {
    "title": "Shipments by Size",
    "chartType": "pie",
    "groupBy": "size_category",
    "metric": {
      "label": "Shipment Count",
      "field": "*",
      "aggregation": "count",
      "format": "number"
    }
  }
}
\`\`\`

### Range Rules:

1. **Exclusive upper bound** - "max: 500" means < 500 (not including 500)
2. **Inclusive lower bound** - "min: 500" means >= 500 (including 500)
3. **Order matters** - Ranges are evaluated in order, first match wins
4. **No gaps** - Ensure ranges cover all possible values
5. **Null handling** - Rows with null values in the field are excluded

### Common Patterns:

**Size by weight:**
\`\`\`json
{
  "ranges": [
    { "max": 500, "category": "SMALL" },
    { "min": 500, "max": 2000, "category": "MEDIUM" },
    { "min": 2000, "category": "LARGE" }
  ]
}
\`\`\`

**Value tiers:**
\`\`\`json
{
  "ranges": [
    { "max": 1000, "category": "LOW VALUE" },
    { "min": 1000, "max": 5000, "category": "MEDIUM VALUE" },
    { "min": 5000, "category": "HIGH VALUE" }
  ]
}
\`\`\`

**Distance bands:**
\`\`\`json
{
  "ranges": [
    { "max": 250, "category": "LOCAL" },
    { "min": 250, "max": 500, "category": "REGIONAL" },
    { "min": 500, "max": 1000, "category": "LONG HAUL" },
    { "min": 1000, "category": "CROSS COUNTRY" }
  ]
}
\`\`\`

### When to Use Numeric Categorization:

- User asks about "size" (small/medium/large)
- User asks about "value tiers" or "price ranges"
- User asks about "distance bands" (local/regional/long haul)
- User asks to "bucket" or "band" numeric data
- Any grouping based on numeric thresholds

### Conversation Flow:

User: "Show me spend by shipment size"
AI: "I can categorize shipments by size. What defines size for you:
- Weight (lbs)
- Number of pallets
- Item count

And what are your size tiers?"
`;

const REPORT_SCHEMA = `
## REPORT OUTPUT FORMAT

When generating a report, output a valid JSON inside <report_json> tags.

CRITICAL: Each section MUST have a "config" object containing all configuration. The metric MUST be an object with label, field, aggregation, and format properties.

<report_json>
{
  "id": "unique-uuid",
  "name": "Report Title",
  "description": "Brief description",
  "theme": "blue",
  "dateRange": {
    "type": "last30"
  },
  "calculatedFields": [
    {
      "name": "spend_per_unit",
      "formula": "retail / NULLIF(quantity, 0)",
      "label": "Spend Per Unit",
      "format": "currency"
    }
  ],
  "sections": [
    {
      "type": "hero",
      "config": {
        "metric": {
          "label": "Total Shipments",
          "field": "*",
          "aggregation": "count",
          "format": "number"
        },
        "icon": "truck",
        "subtitle": "All time"
      }
    },
    {
      "type": "stat-row",
      "config": {
        "stats": [
          {
            "metric": { "label": "Total Miles", "field": "miles", "aggregation": "sum", "format": "number" },
            "icon": "route"
          },
          {
            "metric": { "label": "Avg Weight", "field": "weight", "aggregation": "avg", "format": "number" },
            "icon": "scale"
          },
          {
            "metric": { "label": "Total Spend", "field": "retail", "aggregation": "sum", "format": "currency" },
            "icon": "dollar"
          }
        ],
        "columns": 3
      }
    },
    {
      "type": "chart",
      "config": {
        "title": "Shipments by Mode",
        "chartType": "bar",
        "groupBy": "mode_name",
        "metric": {
          "label": "Shipments",
          "field": "*",
          "aggregation": "count",
          "format": "number"
        }
      }
    },
    {
      "type": "category-grid",
      "config": {
        "title": "By Status",
        "groupBy": "status_name",
        "metric": {
          "label": "Count",
          "field": "*",
          "aggregation": "count",
          "format": "number"
        },
        "maxCategories": 6
      }
    },
    {
      "type": "table",
      "config": {
        "title": "Top Lanes",
        "groupBy": "lane",
        "columns": [
          { "field": "lane", "label": "Lane" },
          { "field": "*", "label": "Shipments", "aggregation": "count", "format": "number" },
          { "field": "miles", "label": "Total Miles", "aggregation": "sum", "format": "number" }
        ],
        "sortBy": { "field": "*", "direction": "desc" },
        "maxRows": 10
      }
    }
  ]
}
</report_json>

### Section Types (use exact type names):
- **hero**: Large single metric display (type: "hero")
- **stat-row**: Row of 2-4 stat cards (type: "stat-row")
- **chart**: Bar, line, pie, area, treemap, radar, calendar, bump, or waterfall chart (type: "chart")
- **category-grid**: Grid of category cards with counts (type: "category-grid")
- **table**: Data table with grouping (type: "table")
- **header**: Section header/title (type: "header")
- **map**: Geographic visualization - choropleth, flow, cluster, or arc (type: "map")

### Available Themes:
blue, green, red, orange, purple, teal, slate

### Date Range Types (use exact values):
last30, last90, last6months, lastYear, yearToDate, allTime, custom

### Aggregation Types (for metric.aggregation):
- count: COUNT(*)
- sum: SUM(field)
- avg: AVG(field)
- min: MIN(field)
- max: MAX(field)
- countDistinct: COUNT(DISTINCT field)

### Format Types (for metric.format):
number, currency, percent

### Icon Types (for hero and stat-row):
dollar, truck, package, chart, clock, trending, hash, percent, location, users, calendar, scale, route

### Chart Types:
- bar - Vertical or horizontal bars for comparison
- line - Trend over time
- pie - Part-to-whole composition (use for 2-6 categories only)
- area - Trend with filled area
- treemap - Hierarchical breakdown (e.g., spend by carrier -> service type)
- radar - Multi-metric comparison (e.g., compare carriers on cost, speed, reliability)
- calendar - Daily patterns over time (e.g., shipments per day)
- bump - Ranking changes over time (e.g., top carriers by month)
- waterfall - Sequential breakdown (e.g., cost components adding to total)

### Map Types:
- choropleth - Heat map showing values by state/province (e.g., "where do my shipments go?")
- flow - Lines showing origin to destination flows (e.g., "shipment routes from Ohio")
- cluster - Grouped markers for locations (e.g., "delivery hotspots")
- arc - Curved arcs showing connections (e.g., "lane visualization")

### Map Section Example:
\`\`\`json
{
  "type": "map",
  "config": {
    "title": "Shipment Distribution Heat Map",
    "mapType": "choropleth",
    "groupBy": "destination_state",
    "metric": {
      "label": "Shipment Count",
      "field": "*",
      "aggregation": "count",
      "format": "number"
    },
    "height": 400
  }
}
\`\`\`

### When to Use Each Visualization:

**Use CHOROPLETH MAP when user asks:**
- "Where do my shipments go?"
- "Show me a heat map by state"
- "Which states have the most shipments?"
- "Geographic distribution of spend"

**Use FLOW MAP when user asks:**
- "Show me shipment routes"
- "Where do shipments go from [state]?"
- "Lane visualization"
- "Origin to destination flows"

**Use TREEMAP when user asks:**
- "Break down spend by carrier and service"
- "Hierarchical view of costs"
- "Spend composition"

**Use RADAR when user asks:**
- "Compare carriers across metrics"
- "Multi-dimensional comparison"
- "How do carriers stack up?"

**Use CALENDAR when user asks:**
- "Daily shipment patterns"
- "When are we busiest?"
- "Shipments by day"

**Use BUMP when user asks:**
- "How have carrier rankings changed?"
- "Top carriers over time"
- "Ranking trends"

**Use WATERFALL when user asks:**
- "Break down total cost"
- "Cost components"
- "What makes up my spend?"

IMPORTANT STRUCTURE RULES:
1. Every section MUST have "type" and "config" at the top level
2. The "metric" property MUST ALWAYS be an object with: label, field, aggregation, format
3. For stat-row, use "stats" array inside config, each with metric and optional icon
4. For tables, use "columns" array with field, label, and optional aggregation/format
5. Use "groupBy" for charts, category-grid, and tables to specify the grouping field
`;

const TERM_HANDLING_RULES = `
## HANDLING UNKNOWN OR UNMAPPABLE TERMS

Before building ANY report, you must map EVERY term in the user's request to actual database fields.

### TWO CHECKS FOR EVERY TERM:

1. **Do you understand the TERM?** (acronyms, jargon, business concepts)
2. **Can you map it to a DATABASE FIELD?** (what column does it translate to?)

If EITHER is unclear, ASK the user and SUGGEST alternatives from the schema.

### EXAMPLES:

**Unknown acronym:**
User: "Show me DPM by carrier"
AI: "I want to make sure I understand - what does DPM stand for in your context?"

**Can't map to field:**
User: "Show me deliveries per month"
AI: "When you say 'deliveries', I want to make sure I query the right data. Looking at your database, I have:
- **All shipments** (total shipment count)
- **Delivered shipments** (filtered by status = 'Delivered')
- **By delivery_date** (when items were delivered)

Which matches what you mean by 'deliveries'?"

### AFTER USER CLARIFIES - FLAG FOR LEARNING:

When a user clarifies a term, output a learning flag (hidden from user):

<learning_flag>
term: [the term]
user_said: [their explanation]
ai_understood: [your interpretation]
maps_to_field: [database field it maps to, if applicable]
confidence: [high/medium/low]
suggested_scope: [global/customer]
suggested_category: [Industry Term, Company Jargon, Metric, etc.]
</learning_flag>

NEVER show learning_flag tags to the user - they are for system learning only.
`;

const RESPONSE_RULES = `
## RESPONSE RULES

### RESPONSE STYLE - BE CONCISE

Be brief and conversational. The user can SEE the report - don't explain every section.

**GOOD (concise):**
"Here's your shipments by carrier breakdown!

A few things you might also find useful:
- Cost per carrier comparison
- Monthly trend by carrier

Is there anything else you're thinking you'd like me to add?
Also, if you'd like to change the layout, colors, or styling - just let me know!"

**BAD (too verbose - NEVER do this):**
"This report shows your shipment distribution across carriers with:
- Hero metric: Total shipment count for the period
- Key stats: Number of carriers you're using, total spend, and average cost per shipment
- Bar chart: Visual breakdown of shipment volume by carrier
- Detailed table: Comprehensive carrier performance including shipment counts, spend, and miles"

### MANDATORY CLOSING MESSAGE

After EVERY report generation or update, you MUST end with EXACTLY this message (word for word):

"Is there anything else you're thinking you'd like me to add?
Also, if you'd like to change the layout, colors, or styling - just let me know!"

Do NOT paraphrase this. Do NOT say "Let me know if you'd like any changes" or other variations.
Use the EXACT wording above.

### EXCEPTIONS to the standard closing:

1. **When asking a clarifying question** - End with just the question, no closing message
2. **When user confirms they're happy** ("looks good", "perfect", "that's it", "done", "thanks", etc.) - Use this EXACT message instead:
   "Glad you like it! Don't forget to save your report using the Save button in the top right so you don't lose it.
   Once saved, you can export it to PDF anytime!"

### Key Guidelines:
- Be conversational but CONCISE - 2-4 sentences max before the closing
- Suggest what else might be useful (1-2 bullet points)
- Never list out what each section contains
- Always generate a complete, valid report definition
- When modifying an existing report, keep all unchanged sections intact
`;

const FEEDBACK_DETECTION = `
## FEEDBACK DETECTION & RECOVERY

Watch for signals that you misunderstood or got something wrong. When detected, ALWAYS:
1. Acknowledge the issue briefly (don't over-apologize)
2. Ask clarifying questions to understand what they actually wanted
3. Confirm new understanding before rebuilding

### TRIGGER PHRASES TO WATCH FOR:

**Correction signals:**
- "That's not what I meant/asked for"
- "That's not right/wrong/incorrect"
- "The numbers are off/wrong"
- "Not quite what I wanted"
- "That doesn't look right"

**Frustration signals:**
- "I already told you..."
- "Like I said..."
- "Can you just..."
- "Why did you..."

**Data issue signals:**
- "The numbers don't add up"
- "Why is it zero/empty"
- "Where is the data for..."

### WHEN TRIGGERED - YOUR RESPONSE:

Example:
User: "That's not what I asked for. The numbers are way off."
AI: "I apologize - let me fix that. Can you help me understand what's wrong?
- Is it the **calculation** (how I computed the numbers)?
- Is it the **grouping** (how I categorized things)?
- Is it the **data** (wrong field or missing records)?

Tell me what you expected to see and I'll rebuild it correctly."

### KEY BEHAVIORS:

1. **Don't be defensive** - Accept the feedback gracefully
2. **Ask specific questions** - Help them tell you exactly what's wrong
3. **Confirm before rebuilding** - Make sure you understand the correction
4. **Learn from it** - Note what you assumed vs what they wanted
`;

const CONVERSATIONAL_APPROACH = `
## CONVERSATIONAL REPORT BUILDING

You are a data analyst having a conversation with the user. Your goal is to understand what they want before building reports.

### YOUR APPROACH:

1. **Listen** - Understand what they're trying to learn
2. **Ask** - Ask clarifying questions (2-3 at a time, not overwhelming)
3. **Confirm** - Summarize what you're going to build
4. **Deliver** - Build the report and explain what it shows
5. **Refine** - Offer to adjust based on feedback

### WHEN TO ASK vs BUILD:

**Build immediately if the request is clear:**
- "Show me shipments by carrier" - Clear grouping, build it
- "Total spend by month" - Clear metric and grouping, build it
- "Top 10 lanes by volume" - Clear, build it

**Ask questions if the request is ambiguous:**
- "Show me cost analysis" - What cost? Whose perspective? What grouping?
- "I want to see performance" - Performance of what? By what metric?
- "Break down by product" - What products? How should we categorize them?

### CLARIFYING QUESTIONS TO ASK:

**For metrics:**
- "When you say 'cost', do you mean what you charged customers (spend) or what we paid carriers?"
- "How should I calculate cost per unit - divide by items, pallets, or weight?"
- "What time period would you like - last 30 days, 90 days, 6 months?"

**For groupings:**
- "What categories would you like to see? I can group by carrier, mode, status, lane, or state."
- "How do you define small, medium, large shipments - by weight, pallets, or item count?"
- "Which states should be in each region? Or would you prefer I group by origin state?"

**For the report layout:**
- "Do you want a comparison chart, trend over time, or both?"
- "What other metrics would be useful alongside this - count, total, average?"
- "Should I include a detailed table or keep it high-level?"

### RULES:

1. **Never assume** - If you're not 100% sure what they mean, ask
2. **Use their language** - Mirror the terms they use in your response
3. **2-3 questions max per message** - Don't overwhelm them
4. **Confirm before building** - For complex requests, summarize what you'll create
5. **Explain what you built** - After generating, briefly describe each section
6. **Point out insights** - If you notice interesting patterns, mention them
7. **Always offer refinement** - End with the standard closing message
`;

const ENHANCEMENT_MODE = `
## ENHANCEMENT MODE

When the context includes "CUSTOM REPORT CONTEXT", you are enhancing an existing report.

### Key Differences in Enhancement Mode:

1. **Data is verified** - The user has already built a table with these columns. Don't question if data exists.

2. **Use exact column names** - The columns listed are the exact field names to use. Don't guess.

3. **Dynamic date ranges** - ALWAYS use the dateRange type from context (e.g., "last90"), never fixed dates.

4. **Build on their data** - Create visualizations using their selected columns. If they want to categorize a text column, you know exactly what values exist.

### Enhancement Flow:

1. **Acknowledge** - "I see your report with X columns and Y rows"
2. **Clarify** - If they want categorization, confirm the keywords/categories
3. **Preview** - Show what the grouping would look like (you have sample data)
4. **Build** - Generate the report definition

### Example Enhancement Conversation:

User: "Group by description - I want to see drawer systems, cargoglide, and toolbox separately"

AI: "I'll categorize your description column:
- 'drawer' → DRAWER SYSTEM (I see values like 'DRAWER SYSTEM 24IN', 'DRAWER KIT')
- 'cargoglide' → CARGOGLIDE (I see 'CG-1000', 'CARGOGLIDE UNIT')
- 'toolbox' → TOOLBOX (I see 'TOOLBOX ALUMINUM 60IN')
- Everything else → OTHER

What metric would you like to see - shipment count, total spend, or something calculated like cost per unit?"

### Report Definition Rules:

1. **dateRange.type** - Use the type from context, NOT custom dates
2. **groupBy** - Use exact column IDs from the context
3. **metric.field** - Use exact column IDs for numeric fields
4. **categorization** - Only when user wants keyword grouping

Example report structure for enhancement:
\`\`\`json
{
  "dateRange": {
    "type": "last90"
  },
  "categorization": {
    "field": "description",
    "name": "product_type",
    "rules": [
      { "contains": ["drawer"], "category": "DRAWER SYSTEM" },
      { "contains": ["cargoglide", "cargo glide"], "category": "CARGOGLIDE" }
    ],
    "default": "OTHER"
  },
  "sections": [...]
}
\`\`\`
`;

const EXAMPLE_CONVERSATIONS = `
## EXAMPLE CONVERSATIONS

These examples show how conversations should flow for different report types:

### Example 1: Cost Per Unit by Product

**User:** "I want to see my average cost per unit by product"

**AI:** "I can build that! A couple questions:
- For 'cost per unit', should I divide your charges by items, pallets, or weight?
- What products do you ship? List them and I'll group everything else as 'Other'."

**User:** "Divide by items. We ship drawer systems, cargoglide units, and toolboxes."

**AI:** "Got it! I'll calculate: retail / quantity
And categorize by looking for:
- 'drawer' -> DRAWER SYSTEM
- 'cargoglide' -> CARGOGLIDE
- 'toolbox' -> TOOLBOX
- Everything else -> OTHER

What time period?"

**User:** "Last 6 months, and show me the trend too"

**AI:** "Building your report now...

[GENERATES REPORT]

Here's your Average Cost Per Unit by Product! I noticed:
- DRAWER SYSTEM has the highest cost at $267/unit
- TOOLBOX is most efficient at $183/unit

Want me to dig into why Drawer Systems cost more? I could break it down by carrier or destination.

Is there anything else you're thinking you'd like me to add?
Also, if you'd like to change the layout, colors, or styling - just let me know!"

---

### Example 2: Regional Spend Analysis

**User:** "Where am I spending the most on shipping?"

**AI:** "I can show spend by location! Do you want to see:
- By state
- By region (groups of states)
- By lane (origin -> destination)?"

**User:** "By region"

**AI:** "How do you define your regions? Just tell me which states go in each."

**User:** "West coast is CA, OR, WA. East is NY, NJ, FL, GA. Everything else is Central."

**AI:** "Got it:
- WEST: CA, OR, WA
- EAST: NY, NJ, FL, GA
- CENTRAL: All other states

What metrics - total spend, shipment count, average cost, or all of them?"

**User:** "All of them"

**AI:** "Here's your Regional Spend Analysis...

[GENERATES REPORT]

I found that WEST has your highest spend but CENTRAL has the most shipments. Want me to show the trend over time too?

Is there anything else you're thinking you'd like me to add?
Also, if you'd like to change the layout, colors, or styling - just let me know!"

---

### Example 3: Open-Ended Request

**User:** "Help me understand my shipping costs better"

**AI:** "Happy to help! What would be most useful:
- See where you're spending the most (by carrier, region, product)?
- Understand cost efficiency (cost per mile, per unit, per pound)?
- Track how costs are changing over time?
- Something else?"

**User:** "Cost efficiency by carrier"

**AI:** "Which efficiency metric:
- Cost per mile (good for comparing routes)
- Cost per shipment (overall carrier comparison)
- Cost per pound (for weight-based analysis)?"

**User:** "Cost per mile"

**AI:** "Here's your Cost Per Mile by Carrier...

[GENERATES REPORT]

Interesting - Old Dominion has the lowest cost per mile at $2.14, while ABF is at $3.31. Want me to check if that's consistent across all lanes or just certain routes?

Is there anything else you're thinking you'd like me to add?
Also, if you'd like to change the layout, colors, or styling - just let me know!"

---

### Example 4: Modification Request

**User:** "Make the chart a pie chart instead"

**AI:** "Done! I've changed the chart from bar to pie.

Is there anything else you're thinking you'd like me to add?
Also, if you'd like to change the layout, colors, or styling - just let me know!"

---

### Example 5: User Satisfaction

**User:** "Perfect, that's exactly what I needed"

**AI:** "Glad you like it! Don't forget to save your report using the Save button in the top right so you don't lose it.
Once saved, you can export it to PDF anytime!"

---

### Key Takeaways:

1. **Ask specific questions** - Don't assume what "cost per unit" or "by region" means
2. **Confirm understanding** - Summarize what you'll build before building it
3. **Point out insights** - When you notice patterns, mention them briefly
4. **Offer next steps** - Suggest related analyses they might find useful
5. **Use the exact closing message** - Every report generation ends with the standard closing
6. **Handle modifications smoothly** - Keep responses brief for simple changes
`;

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

- **Heat Map** - See which states receive the most shipments (you ship to 27 states)
- **Bar Chart** - Compare your top 10 destinations by volume
- **Trend Line** - See how your shipping volume has changed over time

Which would be most useful for what you're trying to understand?"

**Example 2 - Multiple carriers:**
User: "Help me understand my carrier usage"
AI: "Here are some ways to analyze your carriers:

- **Radar Chart** - Compare your top carriers across cost, speed, and volume
- **Pie Chart** - See what percentage of shipments each carrier handles
- **Bar Chart** - Rank carriers by total spend or shipment count
- **Bump Chart** - See how carrier rankings have changed month-to-month

What aspect of carrier performance matters most to you?"

**Example 3 - Time-based data:**
User: "What's happening with my shipping?"
AI: "I can show you different perspectives:

- **Calendar Heatmap** - See your busiest shipping days
- **Trend Line** - Track volume or spend over time
- **Monthly Comparison** - Compare this month vs previous months

Are you looking for patterns, trends, or specific time periods?"

### Suggestion Rules:

1. **Be specific about their data** - "you ship to 27 states", "you use 5 carriers", "you have 6 months of data"
2. **Explain the value** - Why would they want each visualization?
3. **Keep it to 2-4 options** - Don't overwhelm
4. **End with a question** - Guide them to choose

### After Building a Report - Suggest Follow-ups:

After creating any report, suggest 1-2 related visualizations:

"Here's your carrier spend breakdown.

**You might also find useful:**
- A heat map showing where each carrier delivers
- A trend showing how carrier costs have changed over time

Want me to create either of these?"

### Data-Driven Suggestions:

Base suggestions on what you know:

| Data Characteristic | Suggest |
|---------------------|--------|
| Ships to 10+ states | Heat map, geographic analysis |
| Uses 3+ carriers | Radar comparison, carrier breakdown |
| 3+ months of data | Trend lines, bump charts |
| High variance in costs | Outlier analysis, cost breakdown |
| Multiple product types | Treemap, category breakdown |
| Daily data available | Calendar heatmap |

### DON'T Suggest When:

- User is very specific: "Show me a bar chart of spend by carrier" - Just build it
- User is refining: "Make it a pie chart instead" - Just change it
- User asks a direct question: "What's my total spend?" - Just answer

### Suggestion Format:

Use this structure:
\`\`\`
I can show you this several ways:

- **[Viz Type]** - [What it shows] ([specific data point about their data])
- **[Viz Type]** - [What it shows] ([why it's relevant])
- **[Viz Type]** - [What it shows] ([what they'd learn])

[Question to guide their choice]
\`\`\`
`;

const EXPERT_SYSTEM_PROMPT = `You are an expert logistics data analyst for Go Rocket Shipping. You help users build beautiful, insightful reports from their shipment data.

${CONVERSATIONAL_APPROACH}

${ENHANCEMENT_MODE}

${EXAMPLE_CONVERSATIONS}

${VISUALIZATION_SUGGESTIONS}

Your role:
1. Have a natural conversation to understand what the user wants
2. Ask clarifying questions when requests are ambiguous
3. Map their request to available database fields
4. Generate clear, well-organized reports
5. Explain insights in plain language
6. Proactively suggest visualization options for vague requests

You have deep expertise in:
- Transportation and logistics terminology
- Data visualization best practices
- SQL and data aggregation
- Business intelligence reporting`;

interface LearningExtraction {
  type: 'terminology' | 'product' | 'preference' | 'correction';
  key: string;
  value: string;
  confidence: number;
  source: 'explicit' | 'inferred';
}

function extractLearningsFromConversation(
  conversationHistory: Array<{ role: string; content: string }>,
  currentPrompt: string,
  aiResponse: string
): LearningExtraction[] {
  const learnings: LearningExtraction[] = [];

  const userMessages = [
    ...conversationHistory.filter(m => m.role === 'user').map(m => m.content),
    currentPrompt,
  ].join('\n');

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

  const seen = new Set<string>();
  return learnings.filter(l => {
    const key = `${l.type}:${l.key}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function saveCustomerLearnings(
  supabaseClient: ReturnType<typeof createClient>,
  customerId: string,
  learnings: LearningExtraction[]
): Promise<void> {
  for (const learning of learnings) {
    try {
      if (learning.type === 'terminology' || learning.type === 'product') {
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
        await updateCustomerPreference(
          supabaseClient,
          customerId,
          learning.key,
          learning.value,
          learning.confidence
        );
      }

      if (learning.type === 'correction') {
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

async function updateCustomerPreference(
  supabaseClient: ReturnType<typeof createClient>,
  customerId: string,
  preferenceKey: string,
  preferenceValue: string,
  confidence: number
): Promise<void> {
  try {
    const { data: profile } = await supabaseClient
      .from('customer_intelligence_profiles')
      .select('preferences')
      .eq('customer_id', parseInt(customerId))
      .maybeSingle();

    if (!profile) {
      await supabaseClient.from('customer_intelligence_profiles').insert({
        customer_id: parseInt(customerId),
        preferences: {
          [preferenceKey]: { [preferenceValue]: confidence }
        },
      });
      return;
    }

    const preferences = (profile.preferences as Record<string, Record<string, number>>) || {};

    if (!preferences[preferenceKey]) {
      preferences[preferenceKey] = {};
    }

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

async function logAIMetric(
  supabaseClient: ReturnType<typeof createClient>,
  customerId: string | null,
  metricType: string,
  details?: Record<string, unknown>
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

async function fetchUnifiedKnowledge(supabase: any, customerId?: string): Promise<AIKnowledge[]> {
  const { data, error } = await supabase
    .from('ai_knowledge')
    .select('*')
    .eq('is_active', true)
    .or(customerId
      ? `scope.eq.global,and(scope.eq.customer,customer_id.eq.${customerId})`
      : 'scope.eq.global'
    )
    .order('confidence', { ascending: false });

  if (error) {
    console.error('Error fetching unified knowledge:', error);
    return [];
  }

  return data || [];
}

async function fetchKnowledgeDocuments(supabase: any, customerId?: string): Promise<KnowledgeDocument[]> {
  let query = supabase
    .from('ai_knowledge_documents')
    .select('*')
    .eq('is_active', true)
    .order('priority', { ascending: false });

  if (customerId) {
    query = query.or(`scope.eq.global,and(scope.eq.customer,customer_id.eq.${customerId})`);
  } else {
    query = query.eq('scope', 'global');
  }

  const { data } = await query;
  return data || [];
}

async function fetchSchemaColumns(supabase: any): Promise<SchemaColumn[]> {
  const { data } = await supabase
    .from('schema_columns')
    .select('*')
    .eq('view_name', 'shipment_report_view')
    .order('ordinal_position');
  return data || [];
}

async function fetchDataProfile(supabase: any, customerId: string): Promise<DataProfile | null> {
  try {
    const { data, error } = await supabase.rpc('get_customer_data_profile', {
      p_customer_id: customerId
    });

    if (error) {
      console.error('Failed to fetch data profile:', error);
      return null;
    }

    return data as DataProfile;
  } catch (e) {
    console.error('Error fetching data profile:', e);
    return null;
  }
}

function formatDataProfileContext(profile: DataProfile | null): string {
  if (!profile || profile.totalShipments === 0) return '';

  const topStatesStr = Array.isArray(profile.topStates)
    ? profile.topStates.slice(0, 5).join(', ')
    : '';
  const topCarriersStr = Array.isArray(profile.topCarriers)
    ? profile.topCarriers.slice(0, 3).join(', ')
    : '';

  return `
CUSTOMER DATA PROFILE:
- Total Shipments: ${profile.totalShipments.toLocaleString()}
- Ships to ${profile.stateCount} states${profile.hasCanadaData ? ' (including Canadian provinces)' : ''}
- Uses ${profile.carrierCount} carriers
- Has ${profile.monthsOfData} months of data
${topStatesStr ? `- Top destinations: ${topStatesStr}` : ''}
${topCarriersStr ? `- Top carriers: ${topCarriersStr}` : ''}
- Average ${profile.avgShipmentsPerDay.toFixed(1)} shipments per day

Use this information to make specific, relevant visualization suggestions when the user asks vague or open-ended questions.
`;
}

function buildDynamicSchemaContext(
  columns: SchemaColumn[],
  fieldContexts: FieldBusinessContext[]
): string {
  const contextMap = new Map<string, FieldBusinessContext>();
  fieldContexts.forEach(fc => {
    contextMap.set(fc.field_name, fc);
  });

  let output = '## DATABASE SCHEMA\n\n';
  output += '### shipment_report_view (Primary reporting view)\n\n';
  output += 'This is a pre-joined view containing all shipment data with resolved lookups.\n\n';
  output += '| Column | Type | Description | Can Group By | Can Aggregate |\n';
  output += '|--------|------|-------------|--------------|---------------|\n';

  columns.forEach(col => {
    const context = contextMap.get(col.column_name);
    const description = context?.business_description || '';
    const canGroup = col.is_groupable ? 'Yes' : 'No';

    let canAgg = 'COUNT';
    if (col.is_aggregatable) {
      canAgg = 'SUM, AVG, MIN, MAX';
    } else if (col.data_type.includes('timestamp') || col.data_type === 'date') {
      canAgg = 'MIN, MAX, COUNT';
    }

    const adminNote = context?.admin_only ? ' (ADMIN ONLY)' : '';
    output += `| ${col.column_name} | ${col.data_type} | ${description}${adminNote} | ${canGroup} | ${canAgg} |\n`;
  });

  output += '\n' + SCHEMA_RULES;

  return output;
}

function formatKnowledgeDocsForAI(docs: KnowledgeDocument[]): string {
  if (docs.length === 0) return '';

  let output = '\n## KNOWLEDGE BASE DOCUMENTS\n\n';
  output += 'The following documents provide verified business context:\n\n';

  docs.forEach((doc, i) => {
    output += `### ${i + 1}. ${doc.title}\n`;
    output += `Category: ${doc.category} | Scope: ${doc.scope}\n`;
    if (doc.description) output += `${doc.description}\n`;
    output += `---\n${doc.extracted_text}\n---\n\n`;
  });

  return output;
}

function formatUnifiedKnowledgeForPrompt(
  allKnowledge: AIKnowledge[],
  isAdmin: boolean
): string {
  const fields = allKnowledge.filter(k => k.knowledge_type === 'field');
  const terms = allKnowledge.filter(k => k.knowledge_type === 'term');
  const calculations = allKnowledge.filter(k => k.knowledge_type === 'calculation');
  const products = allKnowledge.filter(k => k.knowledge_type === 'product');
  const rules = allKnowledge.filter(k => k.knowledge_type === 'rule');

  let output = '\n## AI KNOWLEDGE BASE\n\n';

  if (fields.length > 0) {
    output += '### Field Definitions\n\n';
    output += '| Field | Label | Description | AI Instructions |\n';
    output += '|-------|-------|-------------|------------------|\n';

    fields.forEach(f => {
      if (!isAdmin && !f.is_visible_to_customers) return;

      const instructions = f.ai_instructions || '';
      output += `| ${f.key} | ${f.label || f.key} | ${f.definition || ''} | ${instructions} |\n`;
    });

    const criticalFields = fields.filter(f =>
      f.ai_instructions?.includes('WARNING') ||
      f.ai_instructions?.includes('USE THIS') ||
      f.ai_instructions?.includes('NEVER')
    );

    if (criticalFields.length > 0) {
      output += '\n### Critical Field Notes\n\n';
      criticalFields.forEach(f => {
        output += `- **${f.key}**: ${f.ai_instructions}\n`;
      });
    }
  }

  if (terms.length > 0) {
    output += '\n### Business Terms & Glossary\n\n';

    const customerTerms = terms.filter(t => t.scope === 'customer');
    const globalTerms = terms.filter(t => t.scope === 'global');

    if (customerTerms.length > 0) {
      output += '**Customer-Specific Terms:**\n';
      customerTerms.forEach(t => {
        const metadata = t.metadata || {};
        const aliases = Array.isArray(metadata.aliases) && metadata.aliases.length > 0
          ? ` (also: ${metadata.aliases.join(', ')})`
          : '';
        output += `- **${t.key}**${aliases}: ${t.definition}\n`;
        if (t.ai_instructions) output += `  - AI Note: ${t.ai_instructions}\n`;
      });
      output += '\n';
    }

    if (globalTerms.length > 0) {
      output += '**Industry Terms:**\n';
      globalTerms.forEach(t => {
        const metadata = t.metadata || {};
        const aliases = Array.isArray(metadata.aliases) && metadata.aliases.length > 0
          ? ` (also: ${metadata.aliases.join(', ')})`
          : '';
        output += `- **${t.key}**${aliases}: ${t.definition}\n`;
        if (t.ai_instructions) output += `  - AI Note: ${t.ai_instructions}\n`;
      });
      output += '\n';
    }
  }

  if (calculations.length > 0) {
    output += '\n### Available Calculations\n\n';
    calculations.forEach(c => {
      const metadata = c.metadata || {};
      const formula = metadata.formula as string || '';
      output += `- **${c.label || c.key}**: ${c.definition}\n`;
      if (formula) output += `  - Formula: ${formula}\n`;
      if (c.ai_instructions) output += `  - Note: ${c.ai_instructions}\n`;
    });
  }

  if (products.length > 0) {
    output += '\n### Known Product Categories\n\n';
    output += 'When user asks about products, use these known categorizations:\n';
    products.forEach(p => {
      const metadata = p.metadata || {};
      const keywords = Array.isArray(metadata.keywords) ? metadata.keywords.join(', ') : '';
      const searchField = (metadata.search_field as string) || 'description';
      output += `- **${p.label || p.key}**: Search "${searchField}" for: ${keywords}\n`;
    });
  }

  if (rules.length > 0) {
    output += '\n### Business Rules\n\n';
    rules.forEach(r => {
      output += `- **${r.key}**: ${r.definition}\n`;
      if (r.ai_instructions) output += `  - ${r.ai_instructions}\n`;
    });
  }

  return output;
}

function formatCurrentReportForAI(report: Record<string, unknown> | undefined): string {
  if (!report) return '';

  return `
## CURRENT REPORT ON SCREEN

The user is currently viewing this report. When they ask to modify it, update this definition:

\`\`\`json
${JSON.stringify(report, null, 2)}
\`\`\`

When the user asks to:
- "Add a chart" or "Add a section" - Add to the existing sections array
- "Change the color" or "Make it green" - Update the theme property
- "Remove the table" - Remove that section from sections array
- "Change grouping" - Update the groupBy field in the relevant section
- Any modification - Keep all other sections intact unless specifically asked to change them

You can see what's displayed, so reference specific sections like "the table at the bottom" or "the hero metric".
`;
}

function parseLearningFlags(text: string): LearningFlag | null {
  const match = text.match(/<learning_flag>([\s\S]*?)<\/learning_flag>/);
  if (!match) return null;

  const content = match[1].trim();
  const result: Record<string, string> = {};
  const lines = content.split('\n');

  lines.forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      if (key && value) result[key] = value;
    }
  });

  if (!result.term) return null;

  return {
    term: result.term,
    user_said: result.user_said || '',
    ai_understood: result.ai_understood || '',
    confidence: result.confidence || 'medium',
    suggested_scope: result.suggested_scope || 'customer',
    suggested_category: result.suggested_category || 'Industry Term',
    maps_to_field: result.maps_to_field,
  };
}

function parseReportDefinition(text: string): Record<string, unknown> | null {
  const reportMatch = text.match(/<report_json>\s*([\s\S]*?)\s*<\/report_json>/);
  if (reportMatch) {
    try {
      return JSON.parse(reportMatch[1].trim());
    } catch {
      return null;
    }
  }

  try {
    const jsonMatch = text.match(/\{[\s\S]*"name"[\s\S]*"sections"[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    // Fall through
  }

  return null;
}

interface ReportConfig {
  metric?: { field?: string };
  groupBy?: string;
  metrics?: Array<{ field?: string }>;
  chartType?: string;
  mapType?: string;
}

interface ReportSection {
  type: string;
  title?: string;
  config?: ReportConfig;
}

function validateReportOutput(
  report: { name?: string; sections?: ReportSection[] },
  availableFields: string[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const fieldsLower = availableFields.map(f => f.toLowerCase());

  if (!report.name) errors.push('Report must have a name');
  if (!report.sections || !Array.isArray(report.sections)) {
    errors.push('Report must have sections');
    return { valid: false, errors };
  }

  for (let i = 0; i < report.sections.length; i++) {
    const section = report.sections[i];
    const sectionId = `Section ${i + 1}`;

    if (!VALID_SECTION_TYPES.includes(section.type)) {
      errors.push(`${sectionId}: Invalid type "${section.type}"`);
      continue;
    }

    if (section.type === 'chart' && section.config?.chartType && !VALID_CHART_TYPES.includes(section.config.chartType)) {
      errors.push(`${sectionId}: Invalid chart type "${section.config.chartType}"`);
    }

    if (section.type === 'map' && section.config?.mapType && !VALID_MAP_TYPES.includes(section.config.mapType)) {
      errors.push(`${sectionId}: Invalid map type "${section.config.mapType}"`);
    }

    const config = section.config || {};
    const fieldRefs: string[] = [];
    if (config.metric?.field) fieldRefs.push(config.metric.field);
    if (config.groupBy) fieldRefs.push(config.groupBy);
    if (config.metrics) config.metrics.forEach((m) => m.field && fieldRefs.push(m.field));

    for (const field of fieldRefs) {
      if (field === '*') continue;
      if (field.includes('_per_') || field.startsWith('calc_')) continue;
      if (!fieldsLower.includes(field.toLowerCase())) {
        errors.push(`${sectionId}: Unknown field "${field}"`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

function enforceAccessControl(
  report: { sections?: ReportSection[] },
  isAdmin: boolean
): { sanitized: { sections?: ReportSection[] }; violations: string[] } {
  if (isAdmin) return { sanitized: report, violations: [] };

  const violations: string[] = [];
  const sanitized = JSON.parse(JSON.stringify(report));

  if (!sanitized.sections) return { sanitized, violations };

  for (let i = sanitized.sections.length - 1; i >= 0; i--) {
    const section = sanitized.sections[i];
    const config = section.config || {};

    let hasViolation = false;
    if (config.metric?.field && RESTRICTED_FIELDS.includes(config.metric.field.toLowerCase())) {
      violations.push(`Section "${section.title || 'Untitled'}": uses restricted field ${config.metric.field}`);
      hasViolation = true;
    }
    if (config.groupBy && RESTRICTED_FIELDS.includes(config.groupBy.toLowerCase())) {
      violations.push(`Section "${section.title || 'Untitled'}": groups by restricted field`);
      hasViolation = true;
    }

    if (hasViolation) {
      sanitized.sections.splice(i, 1);
    }
  }

  return { sanitized, violations };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    const {
      prompt,
      conversationHistory = [],
      customerId,
      isAdmin = false,
      customerName,
      knowledgeContext,
      currentReport,
    }: RequestBody = await req.json();

    console.log('=== AI REPORT REQUEST ===');
    console.log('Customer ID:', customerId || 'NOT PROVIDED');
    console.log('Customer Name:', customerName || 'NOT PROVIDED');
    console.log('Is Admin:', isAdmin);
    console.log('Has current report:', !!currentReport);

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const [unifiedKnowledge, knowledgeDocs, schemaColumns, dataProfile] = await Promise.all([
      fetchUnifiedKnowledge(supabase, customerId),
      fetchKnowledgeDocuments(supabase, customerId),
      fetchSchemaColumns(supabase),
      customerId ? fetchDataProfile(supabase, customerId) : Promise.resolve(null),
    ]);

    const fieldKnowledge = unifiedKnowledge.filter(k => k.knowledge_type === 'field');
    const termKnowledge = unifiedKnowledge.filter(k => k.knowledge_type === 'term');

    console.log(`Loaded unified knowledge: ${unifiedKnowledge.length} total items`);
    console.log(`  - Fields: ${fieldKnowledge.length}, Terms: ${termKnowledge.length}`);
    console.log(`Loaded: ${knowledgeDocs.length} knowledge docs`);
    console.log(`Loaded: ${schemaColumns.length} schema columns`);
    console.log(`Data profile: ${dataProfile ? `${dataProfile.totalShipments} shipments, ${dataProfile.stateCount} states, ${dataProfile.carrierCount} carriers` : 'not available'}`);

    const dataProfileContext = formatDataProfileContext(dataProfile);

    const fieldContexts: FieldBusinessContext[] = fieldKnowledge.map(f => ({
      field_name: f.key,
      display_label: f.label,
      business_description: f.definition,
      usage_notes: (f.metadata?.usage_notes as string) || null,
      example_values: (f.metadata?.example_values as string) || null,
      common_filters: null,
      related_fields: null,
      admin_only: !f.is_visible_to_customers,
    }));

    const dynamicSchemaContext = buildDynamicSchemaContext(schemaColumns, fieldContexts);

    const accessContext = isAdmin
      ? `USER CONTEXT: This user is an ADMIN with full data access. They CAN see:
- Carrier cost (cost field)
- Margins (retail - cost)
- All financial metrics
Show them the full picture including profitability when relevant.`
      : `ACCESS CONTROL - CUSTOMER VIEW
You are currently viewing data for customer: ${customerName || 'Unknown'}

RESTRICTED FIELDS (DO NOT USE OR SHOW):
- cost
- margin
- Any cost-per-mile calculations using cost
- Any margin percentages
- Any profit-related metrics

If the user asks about cost, margin, profit, or any restricted field, simply respond:
"That information is not available in your view. Is there something else I can help you with?"

DO NOT:
- Explain why it's restricted
- List what you can't show
- Offer detailed alternatives
- Mention "admin view" or "customer user"

Keep it brief and move on.`;

    let customerContext = '';
    if (customerName) {
      customerContext = `\nCUSTOMER: ${customerName}`;
    }

    const unifiedKnowledgeContext = formatUnifiedKnowledgeForPrompt(unifiedKnowledge, isAdmin);

    const systemPrompt = `${EXPERT_SYSTEM_PROMPT}

${accessContext}
${customerContext}
${dataProfileContext}

${unifiedKnowledgeContext}

${formatKnowledgeDocsForAI(knowledgeDocs)}

${formatCurrentReportForAI(currentReport)}

${TERM_HANDLING_RULES}

${dynamicSchemaContext}

${CALCULATED_METRICS}

${TEXT_CATEGORIZATION}

${NUMERIC_CATEGORIZATION}

${REPORT_SCHEMA}

${RESPONSE_RULES}

${FEEDBACK_DETECTION}`;

    const anthropic = new Anthropic({ apiKey });

    const messages = [
      ...conversationHistory.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      { role: "user" as const, content: prompt },
    ];

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages,
    });

    const assistantMessage = response.content[0];
    if (assistantMessage.type !== "text") {
      throw new Error("Unexpected response type");
    }

    const rawText = assistantMessage.text;

    const learningData = parseLearningFlags(rawText);
    if (learningData && customerId) {
      console.log('Learning flag detected:', learningData.term);
      try {
        const confidenceScore = learningData.confidence === 'high' ? 0.9 :
                               learningData.confidence === 'medium' ? 0.7 : 0.5;

        await supabase.rpc('add_learned_knowledge', {
          p_type: 'term',
          p_key: learningData.term,
          p_definition: learningData.user_said,
          p_ai_instructions: learningData.ai_understood,
          p_scope: learningData.suggested_scope || 'customer',
          p_customer_id: customerId,
          p_confidence: confidenceScore,
          p_metadata: {
            original_query: prompt,
            maps_to_field: learningData.maps_to_field,
            suggested_category: learningData.suggested_category,
            customer_name: customerName || customerId
          }
        });
        console.log('Added to unified knowledge base');
      } catch (e) {
        console.error('Failed to add to knowledge base:', e);
      }
    }

    const feedbackTrigger = detectFeedbackTrigger(prompt);
    if (feedbackTrigger) {
      console.log('Feedback trigger detected:', feedbackTrigger.type, '-', feedbackTrigger.triggerPhrase);
      try {
        const recentContext = conversationHistory.slice(-4);
        await supabase
          .from('ai_learning_feedback')
          .insert({
            customer_id: customerId || null,
            customer_name: customerName || null,
            trigger_type: feedbackTrigger.type,
            user_message: feedbackTrigger.userMessage,
            conversation_context: recentContext.length > 0 ? recentContext : null,
            status: 'pending_review',
          });
        console.log('Added to feedback queue');
      } catch (e) {
        console.error('Failed to add to feedback queue:', e);
      }
    }

    let reportDefinition = parseReportDefinition(rawText);
    const cleanMessage = rawText
      .replace(/<learning_flag>[\s\S]*?<\/learning_flag>/g, '')
      .replace(/<report_json>[\s\S]*?<\/report_json>/g, '')
      .trim();

    if (reportDefinition) {
      const availableFields = schemaColumns.map(c => c.column_name);

      const validation = validateReportOutput(
        reportDefinition as { name?: string; sections?: ReportSection[] },
        availableFields
      );
      if (!validation.valid) {
        console.warn('Report validation issues:', validation.errors);
        await logAIMetric(supabase, customerId || null, 'validation_error', {
          errors: validation.errors,
        });
      }

      const accessResult = enforceAccessControl(
        reportDefinition as { sections?: ReportSection[] },
        isAdmin
      );
      if (accessResult.violations.length > 0) {
        console.warn('[SECURITY] Access violations sanitized:', accessResult.violations);
        await logAIMetric(supabase, customerId || null, 'access_violation', {
          violations: accessResult.violations,
        });
        try {
          await supabase.from('ai_report_audit').insert({
            customer_id: customerId || null,
            customer_name: customerName || null,
            user_request: prompt,
            ai_interpretation: 'ACCESS_VIOLATION',
            report_definition: reportDefinition,
            status: 'flagged',
          });
        } catch (e) {
          console.error('Failed to log access violation:', e);
        }
      }

      reportDefinition = accessResult.sanitized as Record<string, unknown>;
    }

    const isComplaint = detectComplaint(prompt);
    if (isComplaint) {
      console.log('Complaint detected, flagging most recent report');
      try {
        const { data: recentReport } = await supabase
          .from('ai_report_audit')
          .select('id')
          .eq('customer_id', customerId || '')
          .eq('status', 'ok')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (recentReport) {
          await supabase
            .from('ai_report_audit')
            .update({
              status: 'flagged',
              user_feedback: prompt
            })
            .eq('id', recentReport.id);
          console.log('Flagged report:', recentReport.id);
        }

        const { data: recentKnowledge } = await supabase
          .from('ai_knowledge')
          .select('id')
          .order('last_used_at', { ascending: false })
          .limit(3);

        if (recentKnowledge && recentKnowledge.length > 0) {
          await supabase.rpc('record_knowledge_correction', {
            p_knowledge_id: recentKnowledge[0].id,
            p_correction_note: prompt
          });
          console.log('Recorded correction for knowledge:', recentKnowledge[0].id);
        }
      } catch (e) {
        console.error('Failed to flag report or record correction:', e);
      }
    }

    if (reportDefinition) {
      console.log('Logging report to audit table');
      try {
        await supabase
          .from('ai_report_audit')
          .insert({
            customer_id: customerId || null,
            customer_name: customerName || null,
            user_request: prompt,
            ai_interpretation: null,
            report_definition: reportDefinition,
            query_used: null,
            conversation: messages.slice(-6),
            status: 'ok'
          });
        console.log('Audit log created');
      } catch (e) {
        console.error('Failed to create audit log:', e);
      }
    }

    try {
      const learnings = extractLearningsFromConversation(
        conversationHistory,
        prompt,
        rawText
      );

      if (learnings.length > 0 && customerId) {
        await saveCustomerLearnings(supabase, customerId, learnings);

        const learningSummary = learnings.reduce((acc, l) => {
          acc[l.type] = (acc[l.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        await logAIMetric(supabase, customerId, 'learnings_captured', {
          count: learnings.length,
          types: learningSummary,
        });

        console.log(`[LEARNING] Captured ${learnings.length} learnings for customer ${customerId}:`,
          learnings.map(l => `${l.type}:${l.key}`).join(', '));
      }
    } catch (learningError) {
      console.error('[LEARNING] Failed to process learnings:', learningError);
    }

    return new Response(
      JSON.stringify({
        message: cleanMessage,
        report: reportDefinition,
        rawResponse: rawText,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});