# PHASE 6: UPDATE HOW-TO DOCUMENTATION

This phase updates the HowToGuide component to document all the new visualization features for customers and admins.

---

## FILE: src/components/settings/HowToGuide.tsx

Replace the entire file with this updated version that includes documentation for all new features:

```tsx
import { useState } from 'react';
import {
  MessageSquare, Database, FileText, Users,
  BookOpen, Lightbulb, Brain, Calculator, Tags,
  Map, BarChart3, Calendar, GitCompare,
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

Use the date buttons to change the time period:
- Last 30 Days
- Last 90 Days
- Last 6 Months
- Last Year
- YTD (Year to Date)
- All Time
- Custom date range

### Themes & Colors

Tell the AI to change colors:
- "Make it green"
- "Use the purple theme"
- "Change to teal"

Available themes: Blue, Green, Red, Orange, Purple, Teal, Slate

### Add to Dashboard

Add any report as a dashboard widget:
1. Create and save your report
2. Click **Add to Dashboard**
3. Choose widget size
4. Report appears on your dashboard
    `
  },
  {
    id: 'calculated-metrics',
    icon: Calculator,
    title: 'Calculated Metrics',
    description: 'Cost per unit, CPM, and custom calculations',
    content: `
## Available Calculations

The AI can create these metrics on the fly:

### Cost Efficiency
- **Cost Per Unit** - Your charges / number of items
- **Cost Per Mile (CPM)** - Your charges / miles traveled
- **Cost Per Pallet** - Your charges / number of pallets
- **Cost Per Pound** - Your charges / weight

### Volume & Totals
- **Total Spend** - Sum of all charges
- **Shipment Count** - Number of shipments
- **Total Units** - Sum of all items shipped
- **Average per Shipment** - Total / shipment count

### How to Request Calculations

Just ask naturally:
> "What's my average cost per unit?"
> "Show me CPM by lane"
> "What's my cost per mile by carrier?"

The AI will ask clarifying questions if needed:
> AI: "For cost per unit, should I divide by items, pallets, or weight?"

### Calculation Accuracy

The AI uses correct aggregation methods:
- **Correct**: Total Spend / Total Units = True average
- **Not**: Average of each shipment's cost/unit

This ensures accurate metrics even when shipment sizes vary.
    `
  },
  {
    id: 'product-categorization',
    icon: Tags,
    title: 'Product Categorization',
    description: 'Group shipments by product type',
    content: `
## Categorizing by Product

The AI can search your shipment descriptions to categorize by product type.

### How It Works

1. Ask for a breakdown by product
2. AI asks what products you ship
3. You list them
4. AI searches descriptions for those keywords
5. Everything else becomes "Other"

### Example

> You: "Show me cost per unit by product type"
> AI: "What products do you ship?"
> You: "Drawer systems, cargoglide, and toolboxes"
> AI: "Got it! I'll look for 'drawer', 'cargoglide', and 'toolbox' in your descriptions."

### Result

The report shows categories like:
- DRAWER SYSTEM - $272/unit
- CARGOGLIDE - $185/unit
- TOOLBOX - $190/unit
- OTHER - $191/unit

### Spelling Variations

The AI will ask about alternate spellings:
> AI: "Any alternate spellings? Like 'cargoglide' vs 'cargo glide'?"

List variations to catch all matches.

### Tips

- Use simple keywords (just "drawer" not "drawer system assembly")
- The AI searches case-insensitively
- List your main products, let "Other" catch the rest
    `
  },
  {
    id: 'freight-terminology',
    icon: BookOpen,
    title: 'Freight Terminology',
    description: 'Industry terms the AI understands',
    content: `
## Terms the AI Knows

You can use these freight industry terms and the AI will understand:

### Transportation Modes
- **LTL** - Less Than Truckload
- **FTL** - Full Truckload
- **Parcel** - Small packages (UPS, FedEx)
- **Intermodal** - Rail + truck

### Documents
- **BOL** - Bill of Lading
- **PRO Number** - Carrier's tracking number
- **PO** - Purchase Order

### Metrics
- **CPM** - Cost Per Mile
- **Spend** - Total charges
- **Volume** - Shipment count or quantity

### Locations
- **Lane** - Route from origin to destination (e.g., OH to CA)
- **Origin** - Pickup location
- **Destination** - Delivery location
- **Consignee** - Receiver
- **Shipper** - Sender

### Equipment
- **Dry Van** - Standard enclosed trailer
- **Reefer** - Refrigerated trailer
- **Flatbed** - Open trailer

### Parties
- **Carrier** - Trucking company
- **Broker** - Arranges transportation
- **3PL** - Third-party logistics provider

### Example Usage
> "Show me LTL spend by carrier"
> "What's my CPM by lane?"
> "How many FTL shipments to California?"
    `
  },
  {
    id: 'knowledge-base',
    icon: Brain,
    title: 'AI Knowledge Base',
    description: 'Manage what the AI knows',
    adminOnly: true,
    content: `
## Knowledge Base Overview

The AI Knowledge Base contains everything that helps the AI understand your business.

### Intelligence Tab

This is where all AI context is managed:

**Knowledge Types:**
- **Field Definitions** - What database columns mean
- **Business Terms** - Industry and company terminology
- **Calculations** - Formulas and metrics
- **Products** - Product categorizations
- **Rules** - Business logic preferences

**Features:**
- Search across all knowledge
- Filter by type (term, field, calculation)
- Filter by scope (global vs customer-specific)
- See confidence scores and usage counts
- Approve, edit, or reject learned items

### Documents Tab

Upload documents the AI can reference:
- Carrier contracts
- Service descriptions
- Company policies
- Industry guides

### AI Learning

When you explain something to the AI, it may learn:
1. AI encounters unknown term
2. You explain what it means
3. Term goes to learning queue
4. Admin reviews and approves
5. AI knows the term going forward

### Global vs Customer Terms

- **Global** - Industry standard (LTL, FTL, BOL)
- **Customer** - Your company's specific terms

### Customer Profiles

Set up customer-specific context:
- Products they ship
- Terminology they use
- Benchmark targets
- Account notes

This helps the AI provide personalized insights.
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
    .trim();
}

interface HowToGuideProps {
  isAdmin?: boolean;
}

export function HowToGuide({ isAdmin = false }: HowToGuideProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('ai-report-studio');

  // Filter sections based on admin status
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
```

---

## Usage

The HowToGuide component now accepts an `isAdmin` prop:

```tsx
// In your settings page or help page:
import { HowToGuide } from './components/settings/HowToGuide';

// For customers:
<HowToGuide isAdmin={false} />

// For admins:
<HowToGuide isAdmin={true} />
```

Admin-only sections will only show when `isAdmin={true}`:
- AI Knowledge Base
- Schema Explorer
- Viewing as Customer

---

## Summary of New Documentation

1. **AI Report Studio** - Updated with geographic analysis examples
2. **Visualization Types** (NEW) - Complete guide to all chart and map types
3. **Geographic Analysis** (NEW) - Detailed guide for heat maps and flow maps
4. **Report Features** - Updated with email, scheduling, and dashboard integration
5. **Calculated Metrics** - Existing content preserved
6. **Product Categorization** - Existing content preserved
7. **Freight Terminology** - Existing content preserved
8. **AI Knowledge Base** - Admin only, updated
9. **Schema Explorer** - Admin only, existing content
10. **Viewing as Customer** - Admin only, updated with map mentions
11. **Tips & Tricks** - Updated with visualization tips
