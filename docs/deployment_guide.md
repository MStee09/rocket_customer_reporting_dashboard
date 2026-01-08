# Visual Builder - Deployment Guide

## What This Is

A complete admin tool for creating widgets visually - no code required. Think Tableau/Looker widget builder but integrated with your widget system.

### Features
- **10 visualization types**: Bar, line, area, pie, scatter, heatmap, KPI, table, choropleth, flow map
- **Data field mapping**: Drag fields to X/Y axes, aggregations
- **Filter blocks**: Direct field comparisons
- **AI logic blocks**: Natural language compiled to deterministic rules
- **Live preview**: Real-time preview using actual widget execution
- **Publish system**: Save to widget_instances table with scope/placement

---

## File Structure

```
src/admin/visual-builder/
├── index.ts                     # Main exports
├── types/
│   └── BuilderSchema.ts         # Schema & validation
├── logic/
│   ├── compileLogic.ts          # Compile blocks to ExecutionParams
│   └── aiCompilation.ts         # AI logic compilation service
├── components/
│   ├── BuilderContext.tsx       # State management
│   ├── VisualBuilderPage.tsx    # Main page
│   └── panels/
│       ├── VisualizationPanel.tsx
│       ├── FieldMappingPanel.tsx
│       ├── LogicPanel.tsx
│       ├── PreviewPanel.tsx
│       └── PublishPanel.tsx
└── migrations/
    └── 20250108_create_widget_instances.sql
```

---

## Deployment Steps

### Step 1: Database Migration (Supabase)

Run this in **Supabase SQL Editor**:

Copy contents of `migrations/20250108_create_widget_instances.sql`

This creates:
- `widget_instances` table
- RLS policies for admin/customer access
- `get_widget_instances()` helper function

### Step 2: Add Visual Builder to Bolt

Copy the entire `visual-builder` folder to `src/admin/visual-builder/`.

Tell Bolt:
> "Create folder src/admin/visual-builder and add these files..."

Then paste each file in order:
1. `types/BuilderSchema.ts`
2. `logic/compileLogic.ts`
3. `logic/aiCompilation.ts`
4. `components/BuilderContext.tsx`
5. `components/panels/VisualizationPanel.tsx`
6. `components/panels/FieldMappingPanel.tsx`
7. `components/panels/LogicPanel.tsx`
8. `components/panels/PreviewPanel.tsx`
9. `components/panels/PublishPanel.tsx`
10. `components/VisualBuilderPage.tsx`
11. `index.ts`

### Step 3: Add Route

In your router config (likely `src/App.tsx` or `src/routes.tsx`):

```tsx
import { VisualBuilderPage } from './admin/visual-builder';

// In routes:
{
  path: '/admin/visual-builder',
  element: <VisualBuilderPage />,
}
```

### Step 4: Add Navigation Link

In your admin navigation/sidebar:

```tsx
<Link to="/admin/visual-builder">
  <BarChart3 className="w-4 h-4" />
  Visual Builder
</Link>
```

---

## How It Works

### 1. Schema-Driven Configuration

Everything is stored in `VisualBuilderSchema`:

```typescript
interface VisualBuilderSchema {
  title: string;
  visualization: {
    type: 'bar' | 'line' | 'pie' | ...;
    xField?: string;
    yField?: string;
    aggregation?: 'sum' | 'avg' | 'count';
  };
  executionParams: ExecutionParams;
  logicBlocks: LogicBlock[];
  publish: {
    scope: 'system' | 'customer';
    placement: 'pulse' | 'hub' | 'dashboard';
  };
}
```

### 2. Logic Blocks

Two types:

**Filter Block** (direct):
```typescript
{
  type: 'filter',
  field: 'retail',
  operator: 'gt',
  value: 1000,
  enabled: true
}
```

**AI Block** (compiled):
```typescript
{
  type: 'ai',
  prompt: 'Only include shipments over $1000 from top carriers',
  compiledRule: {
    filters: [
      { field: 'retail', operator: 'gt', value: 1000 },
      { field: 'carrier_name', operator: 'in', value: ['FedEx', 'UPS'] }
    ]
  },
  status: 'compiled'
}
```

### 3. Compilation Flow

```
LogicBlocks + ExecutionParams
        ↓
  compileLogicBlocks()
        ↓
  Final ExecutionParams with filters
        ↓
  Widget execution (preview & published)
```

### 4. Preview Parity

The preview panel uses the exact same execution path as customer-facing widgets:
- Same `ExecutionParams`
- Same `withLimit()` safety
- Same data fetching
- Same `WidgetRenderer`

**What admin sees = What customer sees**

### 5. Publishing

On publish:
1. Compiles all logic blocks
2. Saves to `widget_instances` table
3. Clears draft from localStorage
4. Widget is immediately available

---

## Key Architecture Decisions

### AI at Authoring Time Only

```
┌─────────────────────────────────────────────┐
│  AUTHORING TIME (Admin)                     │
├─────────────────────────────────────────────┤
│  Admin writes: "Top 5 carriers"             │
│  AI compiles: { carrier_name IN [...] }     │
│  Stored as deterministic rule               │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  RUNTIME (Customer)                         │
├─────────────────────────────────────────────┤
│  Widget executes compiled rule              │
│  NO AI involved                             │
│  Fast, predictable, cacheable               │
└─────────────────────────────────────────────┘
```

### Why This Matters

1. **Performance**: No AI latency at runtime
2. **Consistency**: Same results every time
3. **Auditability**: Compiled rules are visible
4. **Cost**: AI only runs when admin clicks "Compile"

---

## Extending the Builder

### Add a New Visualization Type

1. Add to `VisualizationType` in `BuilderSchema.ts`
2. Add icon/label to `CHART_OPTIONS` in `VisualizationPanel.tsx`
3. Add data fetcher in `PreviewPanel.tsx`
4. Add renderer mapping in `getRendererType()`

### Add a New Field

1. Add to `AVAILABLE_FIELDS` in `aiCompilation.ts`
2. Add to `AVAILABLE_FIELDS` in `FieldMappingPanel.tsx`

### Add AI Edge Function (Optional)

For smarter AI compilation, deploy an edge function:

```typescript
// supabase/functions/compile-ai-logic/index.ts
Deno.serve(async (req) => {
  const { prompt, availableFields } = await req.json();
  
  // Call Claude to compile natural language to filters
  const result = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    system: `You are a filter compiler. Convert natural language to filter rules.
             Available fields: ${JSON.stringify(availableFields)}
             Return JSON: { filters: [{ field, operator, value }] }`,
    messages: [{ role: 'user', content: prompt }],
  });
  
  return new Response(JSON.stringify({ compiledRule: parse(result) }));
});
```

Without this, the builder uses `parseSimpleLogic()` as a local fallback.

---

## Testing Checklist

- [ ] Can select visualization type
- [ ] Can map X and Y fields
- [ ] Preview updates automatically
- [ ] Can add filter blocks
- [ ] Can add AI logic blocks
- [ ] AI compilation works (or falls back gracefully)
- [ ] Can select scope (system/customer)
- [ ] Can select placement
- [ ] Publish creates record in widget_instances
- [ ] Published widget appears in target location
- [ ] Draft recovery works on page reload

---

## Integration with Widget System

The Visual Builder integrates with the widget system you just deployed:

```
Visual Builder → widget_instances table
                        ↓
                 get_widget_instances()
                        ↓
                 WidgetInstanceRenderer
                        ↓
                 WidgetRenderer + data
```

Published widgets use the same `ExecutionParams`, `withLimit()`, and rendering as code-defined widgets.

---

## Permissions

- **Visual Builder Page**: Admin only (add route guard)
- **widget_instances table**: RLS policies enforce access
- **Published widgets**: Respect scope (system vs customer)
