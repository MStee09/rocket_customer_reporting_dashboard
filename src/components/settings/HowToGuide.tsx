import { useState } from 'react';
import {
  MessageSquare, Database, FileText, Users,
  BookOpen, Lightbulb, Brain, Calculator, Tags,
  ChevronDown, ChevronRight
} from 'lucide-react';

interface Section {
  id: string;
  icon: typeof MessageSquare;
  title: string;
  description: string;
  content: string;
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

**Industry Terms:**
> "Show me my LTL spend by carrier"
> "What's my CPM by lane?"

The AI understands freight terminology like LTL, FTL, CPM, BOL, lane, consignee, and more.

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
- Bar charts, line charts, pie charts
- Stat cards with key metrics
- Data tables with sorting
- Category breakdowns with colors

### Tips for Best Results

- **Be specific** - "Last 90 days" is better than "recently"
- **List your products** - When asked, tell the AI exactly what to look for
- **Ask follow-ups** - "Add a trend chart" or "Break it down by carrier too"
- **Use industry terms** - The AI knows LTL, FTL, CPM, BOL, lane, etc.
    `
  },
  {
    id: 'report-features',
    icon: FileText,
    title: 'Report Features',
    description: 'PDF export, editing, and customization',
    content: `
## Saving Reports

Click **Save** to keep your report. Saved reports appear in the sidebar.

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
   - Multi-page support for long reports

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
    `
  },
  {
    id: 'schema-explorer',
    icon: Database,
    title: 'Schema Explorer',
    description: 'View available data fields',
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

### What's Hidden from Customers

- **Cost** - What you pay carriers
- **Margin** - Your profit
- Any cost-per-mile using carrier cost
- Any margin calculations

If a customer asks about these, the AI responds:
> "That information is not available in your view."

### Why Use It

- **Support** - See what customers see when they call
- **Testing** - Verify reports look correct
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
    `
  }
];

function renderMarkdown(content: string): string {
  return content
    .replace(/^## (.*$)/gm, '<h2 class="text-lg font-semibold text-slate-800 mt-4 mb-2">$1</h2>')
    .replace(/^### (.*$)/gm, '<h3 class="font-medium text-slate-700 mt-3 mb-1">$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-800">$1</strong>')
    .replace(/^> (.*$)/gm, '<blockquote class="border-l-4 border-blue-300 pl-3 py-1 my-2 text-slate-600 italic bg-blue-50 rounded-r">$1</blockquote>')
    .replace(/^- (.*$)/gm, '<li class="ml-4 text-slate-600">$1</li>')
    .replace(/(<li[^>]*>.*<\/li>\n?)+/g, '<ul class="list-disc space-y-1 my-2">$&</ul>')
    .replace(/^(\d+)\. (.*$)/gm, '<li class="ml-4 text-slate-600"><span class="font-medium text-slate-700">$1.</span> $2</li>')
    .replace(/\n\n/g, '</p><p class="my-2 text-slate-600">')
    .trim();
}

export function HowToGuide() {
  const [expandedSection, setExpandedSection] = useState<string | null>('ai-report-studio');

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">How To Guide</h2>
        <p className="text-slate-500 mt-1">Learn how to use all the features in your dashboard</p>
      </div>

      <div className="space-y-2">
        {sections.map((section) => {
          const Icon = section.icon;
          const isExpanded = expandedSection === section.id;

          return (
            <div key={section.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
              <button
                onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
              >
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Icon className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-slate-800">{section.title}</div>
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
