import { useState } from 'react';
import {
  MessageSquare, Database, FileText, Users,
  BookOpen, Lightbulb, Brain, Calculator, Tags,
  Map, BarChart3, Sparkles,
  ChevronDown, ChevronRight
} from 'lucide-react';
import { Card } from '../ui/Card';

interface Section {
  id: string;
  icon: typeof MessageSquare;
  title: string;
  description: string;
  content: string;
  adminOnly?: boolean;
}

const sections: Section[] = [
  {
    id: 'ai-report-studio',
    icon: MessageSquare,
    title: 'AI Report Studio',
    description: 'Build reports by having a conversation',
    content: `
## Getting Started

The AI Report Studio lets you create sophisticated reports by simply describing what you want to see. No SQL, no complex queries - just tell the AI what you need.

### How to Use

1. **Start a conversation** - Click "+ New Report" and describe what you want
2. **Answer questions** - The AI will ask clarifying questions to build the perfect report
3. **Refine as you go** - Ask to add charts, change colors, filter data
4. **Save your work** - Click Save when you're happy

### Example Conversations

**Simple Report:**
> "Show me shipments by carrier"

**With Calculations:**
> "What's my average cost per unit by product?"
> AI: "What products do you ship? List them and I'll group everything else as 'Other'."
> "Drawer systems, cargoglide, and toolboxes"

**Geographic Analysis:**
> "Show me where my shipments go"
> AI: Creates a heat map showing shipment distribution by state

**Carrier Comparison:**
> "Compare my top carriers on cost, volume, and transit time"
> AI: Creates a radar chart comparing carriers across metrics

### What the AI Can Do

**Calculated Metrics:**
- Cost per unit (charges / items)
- Cost per mile (CPM)
- Cost per pallet
- Averages, totals, counts

**Custom Groupings:**
- Group by product type (searches your descriptions)
- Group by size (small/medium/large based on weight)
- Group by region (you define which states)

**Visualizations:**
- Bar charts, line charts, pie charts, area charts
- Heat maps showing data by state
- Flow maps showing shipment routes
- Treemaps for hierarchical breakdowns
- Radar charts for multi-metric comparisons
- Calendar views for daily patterns
- Stat cards with key metrics
- Data tables with sorting

### Tips for Best Results

- **Be specific** - "Last 90 days" is better than "recently"
- **List your products** - When asked, tell the AI exactly what to look for
- **Ask follow-ups** - "Add a trend chart" or "Break it down by carrier too"
- **Use industry terms** - The AI knows LTL, FTL, CPM, BOL, lane, etc.
    `
  },
  {
    id: 'how-ai-works',
    icon: Brain,
    title: 'How the AI Works',
    description: 'Understanding the AI system behind the scenes',
    adminOnly: true,
    content: `
## How the AI Actually Works

Think of the AI as a smart analyst who:
1. **Knows logistics terminology** - LTL, CPM, SCAC, lanes, etc.
2. **Can query your database** - But checks data quality first
3. **Remembers what each customer cares about** - Their terms, priorities, products
4. **Builds reports piece by piece** - Not all at once, which reduces errors

### The Request Flow

When a user asks "Which carriers are driving up my costs?":

**Step 1: Load Context**
- Who is this customer?
- Admin or regular user? (determines what data they can see)
- What fields exist in the database?
- Any customer-specific terminology?

**Step 2: Investigate with Tools**
- Explores the "carrier_name" field (how many carriers? good data coverage?)
- Previews what a grouping would look like (carrier by cost - does it make sense?)
- Checks if the customer has special terms to understand

**Step 3: Build Incrementally**
- Adds a stat row for total cost
- Adds a bar chart of cost by carrier
- Sets a meaningful report name
- The AI can loop through this up to 8 times for complex requests

**Step 4: Finalize & Return**
- Validates the report structure
- Sends back JSON that the frontend renders as a report

### The Tools the AI Uses

| Tool | What It Does | Example |
|------|--------------|---------|
| **explore_field** | Checks a database column | "Is carrier_name 80% populated or 10%?" |
| **preview_grouping** | Tests a chart before building | "Will this give 5 bars or 500?" |
| **get_customer_context** | Loads customer-specific info | "This customer calls Cargoglide 'CG'" |
| **suggest_visualization** | Picks best chart type | "Time data = line chart" |
| **add_report_section** | Adds a chart/table/stat | Building the actual report |
| **finalize_report** | Marks complete | Validation and completion |

### Why This Matters for Admins

The AI is only as good as its knowledge. When you:
- Add terminology → The AI understands customer language
- Define products → The AI can filter correctly
- Set priorities → The AI emphasizes what matters
- Review learned items → The AI stops making mistakes
    `
  },
  {
    id: 'knowledge-base-admin',
    icon: Sparkles,
    title: 'Managing the Knowledge Base',
    description: 'How to enrich and maintain AI knowledge',
    adminOnly: true,
    content: `
## The Knowledge System

The AI's knowledge has three layers:

### 1. Global Knowledge (All Customers)

Industry-standard terms everyone uses:
- "LTL" = Less Than Truckload
- "SCAC" = Standard Carrier Alpha Code
- "CPM" = Cost Per Mile

**Where to add:** AI Intelligence page → Add Knowledge → Scope: Global

### 2. Customer-Specific Knowledge (One Customer)

Terms unique to one customer:
- "Acme calls Cargoglide products 'CG'"
- "Beta Corp's West Region = CA, OR, WA, AZ"
- "Gamma Inc's fiscal year starts in July"

**Where to add:** Customer Profile Editor OR AI Intelligence → Scope: Customer

### 3. Learned Knowledge (AI Picks Up)

Things the AI learned from conversations:
- User corrected "CG" means Cargoglide
- User always wants bar charts descending
- User prefers weekly over monthly views

**Where to manage:** AI Intelligence → Needs Review tab

---

## Weekly Admin Tasks

### 1. Review "Needs Review" Items

**Where:** AI Intelligence page → Needs Review tab

**What you're looking at:**
- Items the AI learned automatically from conversations
- Items that have been corrected (the AI got something wrong)
- Low-confidence items

**What to do:**
- ✅ **Approve** if correct → Becomes trusted knowledge
- ❌ **Reject** if wrong → Gets removed
- ✏️ **Edit** if close but needs fixing → Correct then approve

### 2. Check Global Promotion Suggestions

**Where:** AI Intelligence page → scroll to "Promote to Global" section

**What you're looking at:**
- Terms that multiple customers use the same way
- Example: 3 customers all use "hot shipment" to mean expedited

**What to do:**
- If the term is truly universal, click "Promote to Global"
- Now ALL customers benefit from that knowledge

---

## Monthly Admin Tasks

### 3. Review Customer Profiles

**Where:** Knowledge Base → Profiles tab → Click a customer

**What to check:**
- **Priorities** - Are they still accurate? (cost reduction, speed, etc.)
- **Products** - Any new product lines to add?
- **Key Markets** - Has their geography changed?
- **Terminology** - Any new terms they're using?

**Why it matters:** The AI uses this to personalize responses

### 4. Check the Stats Dashboard

**Where:** AI Intelligence page → top stats cards

**What to look for:**
- **Total Active** - How many knowledge items exist
- **Accuracy %** - Are users correcting the AI often?
- **Auto-Learned** - Is the AI picking up new terms?

**Red flags:**
- Accuracy below 85% → AI is making mistakes, review recent items
- No new learned items → Learning system might not be working
- Many items in "Needs Review" → You're falling behind

---

## Adding Knowledge - Step by Step

### Adding a Customer Term

**Scenario:** Acme Corp always calls their Cargoglide products "CG"

1. Go to **Knowledge Base → Profiles → Acme Corp**
2. Under **Terminology**, click **Add Term**
3. Fill in:
   - **Term:** CG
   - **Meaning:** Cargoglide truck bed slides
   - **AI Instructions:** When user says CG, filter description for "Cargoglide"
4. Save

Now when Acme asks "Show me CG shipments" → The AI knows what to do

### Adding a Product Category

**Scenario:** Customer ships three product types you want to track

1. Go to **Knowledge Base → Profiles → [Customer]**
2. Under **Products**, click **Add Product**
3. Fill in:
   - **Name:** Drawer Systems
   - **Keywords:** drawer, storage, slide
   - **Search Field:** description
4. Repeat for other products
5. Save

Now the AI can filter and group by these product categories

### Adding a Global Term

**Scenario:** You want all customers to understand "DPM" means Deliveries Per Month

1. Go to **AI Intelligence** page
2. Click **Add Knowledge**
3. Fill in:
   - **Type:** Business Term
   - **Scope:** Global (All Customers)
   - **Key:** DPM
   - **Label:** Deliveries Per Month
   - **Definition:** The count of unique deliveries made in a calendar month
   - **AI Instructions:** Calculate as COUNT of shipments grouped by month
4. Save

Now ALL customers can use "DPM" in their conversations

---

## Keeping Knowledge Clean

### Signs of a Healthy Knowledge Base

✅ Accuracy rate above 90%
✅ "Needs Review" queue under 10 items
✅ Each active customer has a profile with products/terms
✅ Global knowledge covers common industry terms
✅ No duplicate terms (check before adding)

### Common Problems and Fixes

**Problem: AI doesn't understand customer terminology**
> Fix: Add it to their profile or global knowledge
> Check: Is it spelled the same way the customer uses it?

**Problem: AI keeps suggesting wrong chart types**
> Fix: Check preferences in customer profile
> The AI learns from usage - correct it and it will adapt

**Problem: Customer says AI got something wrong**
> Fix: Check "Needs Review" for corrections
> If not there, add the correct knowledge manually

**Problem: Same term defined multiple times**
> Fix: Delete duplicates, keep the most accurate one
> Use the search filter to find all instances

**Problem: Customer-specific term promoted to global by mistake**
> Fix: Delete the global version if it's not universal
> Re-add as customer-specific if needed

---

## Quick Reference

| Task | Where to Go |
|------|-------------|
| Review learned terms | AI Intelligence → Needs Review |
| Add global terminology | AI Intelligence → Add Knowledge (Global) |
| Add customer terminology | Customer Profile → Terminology |
| Define customer products | Customer Profile → Products |
| Set customer priorities | Customer Profile → Priorities |
| Promote term to global | AI Intelligence → Promotion Suggestions |
| See AI usage stats | AI Intelligence → Stats cards |
| Check what AI knows about a customer | AI Intelligence → filter by customer |
    `
  },
  {
    id: 'visualizations',
    icon: BarChart3,
    title: 'Visualization Types',
    description: 'Charts, maps, and visual analytics',
    content: `
## Available Visualizations

The AI can create many types of visualizations based on your request.

### Charts

**Bar Chart**
Best for comparing categories.
> "Show me shipments by carrier"
> "Top 10 destinations by spend"

**Line Chart**
Best for trends over time.
> "Show me monthly shipment volume"
> "Spend trend over the last year"

**Pie Chart**
Best for showing composition (2-6 categories).
> "What percentage goes to each carrier?"
> "Mode breakdown"

**Area Chart**
Best for trends with emphasis on volume.
> "Volume over time with area fill"

**Treemap**
Best for hierarchical breakdowns.
> "Break down spend by carrier, then by service type"
> "Show me cost composition"

**Radar Chart**
Best for comparing entities across multiple metrics.
> "Compare FedEx, UPS, and XPO on cost, speed, and volume"
> "How do my carriers stack up?"

**Waterfall Chart**
Best for showing how components add up.
> "Break down my total cost into components"
> "What makes up my freight spend?"

**Bump Chart**
Best for ranking changes over time.
> "How have my top carriers changed over the months?"
> "Carrier ranking trends"

**Calendar Heatmap**
Best for daily patterns.
> "Show me shipping activity by day"
> "When are we busiest?"

### Maps

**Heat Map (Choropleth)**
Shows values by state/province with color intensity.
> "Where do my shipments go?"
> "Show me a heat map of spend by state"
> "Geographic distribution"

**Flow Map**
Shows lines from origins to destinations.
> "Show me shipment routes from Ohio"
> "Where do we ship from our warehouse?"

**Arc Map**
Shows curved connections between locations.
> "Visualize our shipping lanes"
> "Origin to destination arcs"

**Cluster Map**
Groups nearby points into clusters.
> "Show me delivery hotspots"
> "Where are our shipments concentrated?"

### How to Request Visualizations

Just describe what you want to see:
> "I want to see where my shipments go" → Heat map
> "Compare my carriers" → Radar or bar chart
> "Show me the trend" → Line chart
> "Break it down by..." → Treemap or pie chart
> "Daily patterns" → Calendar heatmap

The AI will choose the best visualization for your request, or you can be specific:
> "Make it a treemap"
> "Show that as a radar chart"
> "I want a heat map, not a bar chart"
    `
  },
  {
    id: 'maps-geographic',
    icon: Map,
    title: 'Geographic Analysis',
    description: 'Heat maps, flow maps, and location insights',
    content: `
## Geographic Visualizations

See your shipping data on a map to understand geographic patterns.

### Heat Maps (Choropleth)

Shows states/provinces colored by value - darker means higher.

**Use cases:**
- Where do most shipments go?
- Which states cost the most to serve?
- Regional volume distribution

**How to request:**
> "Show me where my shipments go"
> "Heat map of spend by state"
> "Which states get the most deliveries?"

**What you'll see:**
- US and Canada map
- States colored by metric value
- Legend showing value ranges
- Hover for details (state name, exact value, shipment count)
- Click states to filter

**Insights included:**
- Outlier detection (unusually high values)
- Regional patterns (West Coast vs East Coast)
- Canada vs US comparison (if applicable)

### Flow Maps

Shows lines connecting origins to destinations.

**Use cases:**
- Where do shipments go from a specific location?
- Visualize shipping lanes
- Understand distribution patterns

**How to request:**
> "Show me where shipments go from Ohio"
> "Shipment flow from our warehouse"
> "Lane visualization"

**What you'll see:**
- Curved lines from origins to destinations
- Line thickness shows volume
- Animated flow direction
- Color coding by volume or cost

### Tips for Geographic Analysis

- **Filter first** - "Show me LTL shipments to California" then visualize
- **Compare regions** - "How does West Coast compare to East Coast?"
- **Identify outliers** - Heat maps highlight unusually expensive states
- **Drill down** - Click a state to see details or filter to it
    `
  },
  {
    id: 'report-features',
    icon: FileText,
    title: 'Report Features',
    description: 'PDF export, editing, scheduling, and customization',
    content: `
## Saving Reports

Click **Save** to keep your report. Saved reports appear in "My Reports" tab.

### Editing Report Titles

- Click on the report title to edit it
- Type your custom name
- Press Enter or click away to save
- This helps avoid duplicate names

### Exporting to PDF

1. Build or open a report
2. Click **Export PDF** button
3. PDF downloads automatically with:
   - Report title and timestamp
   - All charts and tables
   - Maps and visualizations
   - Multi-page support for long reports

### Email Reports

Send reports directly:
1. Click the **Email** button
2. Enter recipient email(s)
3. Add optional message
4. Report is sent as PDF attachment

### Schedule Reports

Set up automatic report delivery:
1. Save your report
2. Click **Schedule**
3. Choose frequency (daily, weekly, monthly)
4. Select recipients
5. Reports are generated and emailed automatically

### Date Filtering

All reports respect the date filter:
- Use the date picker to change the range
- "Last 30 days", "Last 90 days", "Year to date", etc.
- Custom date ranges are supported
- The AI will ask about dates if relevant

### Customizing Colors

Request different themes:
> "Make it blue"
> "Use green colors"
> "Orange theme"

Available themes: Blue, Green, Orange, Purple, Red, Teal, Slate
    `
  },
  {
    id: 'customer-profiles',
    icon: BookOpen,
    title: 'Customer Profiles',
    description: 'Set up customer-specific AI context',
    adminOnly: true,
    content: `
## Customer Intelligence Profiles

Each customer can have a profile that helps the AI understand their business.

### Profile Sections

**Priorities** - What matters most to this customer
- Cost reduction
- On-time delivery
- Specific carrier performance
- Damage prevention

**Products** - What they ship
- Product names and categories
- Keywords to search for in descriptions
- Helps AI group and filter correctly

**Key Markets** - Geographic focus
- Which states/regions matter most
- Helps AI emphasize relevant data

**Terminology** - Their unique language
- Abbreviations they use
- Product nicknames
- Internal codes

**Benchmark Period** - Default comparison timeframe
- Last month, last quarter, YoY
- Used when customer asks "how are we doing?"

**Account Notes** - General context
- Industry they're in
- Seasonality patterns
- Special considerations

### Setting Up a New Customer Profile

1. Go to **Knowledge Base → Profiles**
2. Find the customer (or they'll be auto-created)
3. Click to open their profile
4. Fill in each section:
   - Add their products with keywords
   - Add any terminology they use
   - Set their key markets
   - Note their priorities
5. Save changes

### When to Update Profiles

- Customer mentions new products
- Customer uses unfamiliar terms
- Customer's focus changes (new markets, new priorities)
- After a correction from the customer
- Quarterly review of all active customers

### Impact on AI Behavior

When a customer asks a question, the AI:
1. Loads their profile
2. Uses their terminology
3. Filters by their products (if relevant)
4. Emphasizes their key markets
5. Compares to their benchmark period

Better profiles = Better, more personalized AI responses
    `
  },
  {
    id: 'schema-explorer',
    icon: Database,
    title: 'Schema Explorer',
    description: 'View available data fields',
    adminOnly: true,
    content: `
## Schema Explorer

The Schema Explorer shows the database structure available for reporting.

### Tables & Views Tab

Browse available data:
- See all tables and views
- View column names and data types
- Understand what data you can report on

### Lookup Tables Tab

Reference data like:
- Status codes and names
- Mode types (LTL, FTL, Parcel)
- Equipment types
- Carriers

### Available Fields for Reports

**Shipment Data:**
- Dates (pickup, delivery, created)
- Financials (charges, cost for admin)
- Volume (miles, weight, quantity, pallets)

**Locations:**
- Origin (company, city, state, zip)
- Destination (company, city, state, zip)
- Lane (origin state to destination state)

**Classifications:**
- Status (Pending, In Transit, Delivered)
- Mode (LTL, FTL, Parcel)
- Equipment type
- Carrier
- Freight class

**References:**
- Reference number
- BOL number
- Description
    `
  },
  {
    id: 'viewing-as-customer',
    icon: Users,
    title: 'Viewing as Customer',
    description: 'Admin feature to see customer view',
    adminOnly: true,
    content: `
## Viewing as Customer (Admin Only)

Admins can see exactly what a customer sees.

### How to Use

1. Click **"View as Customer"** dropdown in the header
2. Select a customer
3. Orange banner shows you're in customer view
4. Click **"Exit"** to return to admin view

### What Changes

When viewing as a customer:
- You see only that customer's data
- Sensitive fields are hidden (cost, margin)
- Reports show only their shipments
- AI won't reveal admin-only information
- Maps show only their geographic data

### What's Hidden from Customers

- **Cost** - What you pay carriers
- **Margin** - Your profit
- Any cost-per-mile using carrier cost
- Any margin calculations

If a customer asks about these, the AI responds:
> "That information is not available in your view."

### Why Use It

- **Support** - See what customers see when they call
- **Testing** - Verify reports and maps look correct
- **Training** - Show customers how to use features
    `
  },
  {
    id: 'security-access',
    icon: Users,
    title: 'Security & Data Access',
    description: 'How the AI handles sensitive data',
    adminOnly: true,
    content: `
## Security & Data Access

The AI respects access levels and protects sensitive data.

### Customer Users (Non-Admin)

**CAN see:**
- Retail (what customer pays)
- Shipment details (origin, destination, weight, etc.)
- Carrier names
- Dates and counts
- Their own data only

**CANNOT see:**
- Cost (what Go Rocket pays carriers)
- Margin (profit)
- Carrier pay rates
- Other customers' data

### Admin Users

**CAN see:** Everything

### How It Works

The AI checks the **isAdmin** flag with every request:
- Admin = Full field access
- Customer = Restricted view (no cost/margin)

If a customer asks about costs, the AI says:
> "That information is not available in your view. I can show you retail revenue or shipment counts instead."

### Database Security

- Row-Level Security (RLS) enforces customer isolation
- Views exclude sensitive columns for customer access
- Even if the AI tried to access cost data for a customer, the database wouldn't return it

### Audit Logging

Every AI request is logged:
- What was asked
- What context was used
- What was generated
- Whether it succeeded
- Tools that were used

This enables: Compliance review, quality monitoring, dispute resolution
    `
  },
  {
    id: 'tips-tricks',
    icon: Lightbulb,
    title: 'Tips & Tricks',
    description: 'Get the most out of the app',
    content: `
## Pro Tips

### Be Conversational

The AI is designed for natural conversation:
- "What carriers do I use most?"
- "Show me where my shipments go"
- "Break down my spend by product"

### Let the AI Ask Questions

Don't try to specify everything upfront. The AI will ask:
- What time period?
- What products do you ship?
- Which metric - items, pallets, or weight?

This ensures you get exactly what you need.

### Iterate and Refine

Start broad, then narrow:
1. "Show me shipments by carrier"
2. "Add total spend"
3. "Just LTL shipments"
4. "Last 6 months only"

### Use Follow-Up Suggestions

After each report, the AI suggests related insights. Click them to explore further.

### Request Specific Visualizations

If you want a specific chart type:
- "Show that as a treemap"
- "I want a heat map"
- "Make it a radar chart"

### Save Before Starting New

If you don't save your report before starting a new one, it will be lost.

### Edit Titles Before Saving

Click the title to customize it. This helps find reports later and avoids duplicates.

### Export for Sharing

Use Export PDF to:
- Email reports to colleagues
- Include in presentations
- Keep offline records

### Ask Questions Too

The AI can answer questions, not just build reports:
- "What was my busiest month?"
- "Which lane has the highest spend?"
- "How many shipments went to California?"

### Explore the Maps

Geographic visualizations help you:
- Identify high-cost regions
- See shipping patterns
- Find opportunities for consolidation
- Understand your distribution network
    `
  }
];

function renderMarkdown(content: string): string {
  return content
    .replace(/^## (.*$)/gm, '<h2 class="text-lg font-semibold text-slate-800 mt-4 mb-2">$1</h2>')
    .replace(/^### (.*$)/gm, '<h3 class="font-medium text-slate-700 mt-3 mb-1">$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-800">$1</strong>')
    .replace(/^> (.*$)/gm, '<blockquote class="border-l-4 border-rocket-300 pl-3 py-1 my-2 text-slate-600 italic bg-rocket-50 rounded-r">$1</blockquote>')
    .replace(/^- (.*$)/gm, '<li class="ml-4 text-slate-600">$1</li>')
    .replace(/(<li[^>]*>.*<\/li>\n?)+/g, '<ul class="list-disc space-y-1 my-2">$&</ul>')
    .replace(/^(\d+)\. (.*$)/gm, '<li class="ml-4 text-slate-600"><span class="font-medium text-slate-700">$1.</span> $2</li>')
    .replace(/\n\n/g, '</p><p class="my-2 text-slate-600">')
    .replace(/\| (.*) \|/gm, (match) => {
      const cells = match.split('|').filter(c => c.trim());
      return '<tr>' + cells.map(c => `<td class="border border-slate-200 px-3 py-2 text-sm">${c.trim()}</td>`).join('') + '</tr>';
    })
    .replace(/(<tr>.*<\/tr>\n?)+/g, '<table class="w-full border-collapse my-3 text-left">$&</table>')
    .replace(/✅/g, '<span class="text-green-600">✅</span>')
    .replace(/❌/g, '<span class="text-red-600">❌</span>')
    .replace(/✏️/g, '<span>✏️</span>')
    .trim();
}

interface HowToGuideProps {
  isAdmin?: boolean;
}

export function HowToGuide({ isAdmin = false }: HowToGuideProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('ai-report-studio');

  const visibleSections = sections.filter(section =>
    !section.adminOnly || (section.adminOnly && isAdmin)
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">How To Guide</h2>
        <p className="text-slate-500 mt-1">Learn how to use all the features in your dashboard</p>
      </div>

      <div className="space-y-2">
        {visibleSections.map((section) => {
          const Icon = section.icon;
          const isExpanded = expandedSection === section.id;

          return (
            <Card key={section.id} variant="default" padding="none" className="overflow-hidden">
              <button
                onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
              >
                <div className="p-2 bg-rocket-50 rounded-lg">
                  <Icon className="w-5 h-5 text-rocket-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-slate-800 flex items-center gap-2">
                    {section.title}
                    {section.adminOnly && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                        Admin
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-slate-500">{section.description}</div>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                )}
              </button>

              {isExpanded && (
                <div className="px-6 pb-6 border-t border-slate-100 bg-slate-50">
                  <div
                    className="prose prose-sm max-w-none pt-4"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(section.content) }}
                  />
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
