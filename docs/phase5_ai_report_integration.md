# PHASE 5: INTEGRATE VISUALIZATIONS INTO AI REPORT BUILDER

This phase integrates all the new chart and map components into the AI Report Builder system so users can create them through natural conversation.

---

## Overview

The AI Report Builder currently supports these visualization types:
- bar, line, pie, area (charts)
- hero, stat-row, category-grid, table, header (sections)

We need to add:
- **Maps**: choropleth (heat map), flow, cluster, arc
- **Advanced Charts**: treemap, radar, calendar, bump, waterfall

---

## STEP 1: Update Type Definitions

### FILE: src/types/aiReport.ts

Add new chart types to the existing types:

```typescript
// Update ChartType to include new types
export type ChartType = 
  | 'bar' 
  | 'line' 
  | 'pie' 
  | 'area'
  | 'treemap'
  | 'radar'
  | 'calendar'
  | 'bump'
  | 'waterfall';

// Add new section type for maps
export type MapType = 'choropleth' | 'flow' | 'cluster' | 'arc';

// Add MapSection interface after ChartSection
export interface MapSection {
  type: 'map';
  config: {
    title?: string;
    mapType: MapType;
    metric: MetricConfig;
    groupBy: string; // state, origin_state, destination_state
    showLabels?: boolean;
    showLegend?: boolean;
    height?: number;
    // For flow/arc maps
    flowField?: string; // e.g., 'lane' for origin->destination
  };
}

// Update ReportSection union type
export type ReportSection =
  | HeroSection
  | StatRowSection
  | CategoryGridSection
  | ChartSection
  | TableSection
  | HeaderSection
  | MapSection;

// Update ReportSectionType
export type ReportSectionType =
  | 'hero'
  | 'stat-row'
  | 'category-grid'
  | 'chart'
  | 'table'
  | 'header'
  | 'map';
```

---

## STEP 2: Update ReportChart Component

### FILE: src/components/reports/studio/ReportChart.tsx

Add imports for new chart types and update the component:

```typescript
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
  Treemap,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { chartColors, formatValue } from './colors';
import { getTheme, ReportTheme } from './reportTheme';
import { Card } from '../../ui/Card';

// Import the new chart components
import { TreemapChart } from '../../dashboard/charts/TreemapChart';
import { RadarComparisonChart } from '../../dashboard/charts/RadarComparisonChart';
import { CalendarHeatmap } from '../../dashboard/charts/CalendarHeatmap';
import { BumpChart } from '../../dashboard/charts/BumpChart';
import { WaterfallChart } from '../../dashboard/charts/WaterfallChart';

export interface ChartDataPoint {
  name: string;
  value: number;
  color?: string;
  children?: ChartDataPoint[]; // For treemap
  date?: string; // For calendar
  rank?: number; // For bump
}

export interface ReportChartProps {
  type: 'bar' | 'line' | 'pie' | 'area' | 'treemap' | 'radar' | 'calendar' | 'bump' | 'waterfall';
  data: ChartDataPoint[];
  title?: string;
  height?: number;
  format?: 'currency' | 'number' | 'percent';
  colors?: string[];
  theme?: ReportTheme;
  showLegend?: boolean;
  horizontal?: boolean;
  compact?: boolean;
}

// In the renderChart function, add cases for new chart types:

const renderChart = () => {
  switch (type) {
    // ... existing cases ...

    case 'treemap':
      return (
        <TreemapChart
          data={chartData.map(d => ({
            name: d.name,
            value: d.value,
            children: d.children,
          }))}
          height={height}
          valueFormat={format}
        />
      );

    case 'radar':
      return (
        <RadarComparisonChart
          data={chartData.map(d => ({
            metric: d.name,
            value: d.value,
          }))}
          entities={[{ key: 'value', name: 'Value', color: effectiveColors[0] }]}
          height={height}
          showLegend={showLegend}
        />
      );

    case 'calendar':
      return (
        <CalendarHeatmap
          data={chartData.map(d => ({
            date: d.date || d.name,
            value: d.value,
          }))}
          height={height}
        />
      );

    case 'bump':
      return (
        <BumpChart
          data={chartData}
          height={height}
        />
      );

    case 'waterfall':
      return (
        <WaterfallChart
          data={chartData.map(d => ({
            name: d.name,
            value: d.value,
          }))}
          height={height}
          valueFormat={format}
        />
      );

    default:
      return null;
  }
};
```

---

## STEP 3: Create ReportMap Component

### FILE: src/components/reports/studio/ReportMap.tsx

Create a new component for rendering maps in reports:

```tsx
import { Loader2 } from 'lucide-react';
import { Card } from '../../ui/Card';
import { CostPerStateMap } from '../../dashboard/CostPerStateMap';
import { ShipmentFlowMap } from '../../dashboard/ShipmentFlowMap';
import { ClusterMap } from '../../dashboard/maps/ClusterMap';
import { ArcFlowMap } from '../../dashboard/maps/ArcFlowMap';

export interface MapDataPoint {
  stateCode?: string;
  origin?: string;
  destination?: string;
  value: number;
  shipmentCount?: number;
  lat?: number;
  lng?: number;
}

export interface ReportMapProps {
  type: 'choropleth' | 'flow' | 'cluster' | 'arc';
  data: MapDataPoint[];
  title?: string;
  height?: number;
  format?: 'currency' | 'number' | 'percent';
  isLoading?: boolean;
  compact?: boolean;
}

export function ReportMap({
  type,
  data,
  title,
  height = 400,
  format = 'number',
  isLoading = false,
  compact = false,
}: ReportMapProps) {
  if (isLoading) {
    return (
      <Card variant="default" padding={compact ? 'sm' : 'md'}>
        <div className="flex items-center justify-center" style={{ height }}>
          <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
        </div>
      </Card>
    );
  }

  const renderMap = () => {
    switch (type) {
      case 'choropleth':
        // Transform data for CostPerStateMap
        const stateData = data.map(d => ({
          stateCode: d.stateCode || '',
          avgCost: d.value,
          shipmentCount: d.shipmentCount || 0,
          isOutlier: false,
        }));
        return (
          <div style={{ height }}>
            <CostPerStateMap data={stateData} isLoading={false} />
          </div>
        );

      case 'flow':
        // Transform data for ShipmentFlowMap
        const flowData = data.map(d => ({
          originState: d.origin || '',
          destinationState: d.destination || '',
          shipmentCount: d.shipmentCount || d.value,
          totalCost: d.value,
        }));
        return (
          <div style={{ height }}>
            <ShipmentFlowMap data={flowData} isLoading={false} />
          </div>
        );

      case 'cluster':
        // Transform data for ClusterMap
        const clusterData = data.map(d => ({
          lat: d.lat || 0,
          lng: d.lng || 0,
          value: d.value,
          label: d.stateCode || '',
        }));
        return (
          <div style={{ height }}>
            <ClusterMap data={clusterData} isLoading={false} />
          </div>
        );

      case 'arc':
        // Transform data for ArcFlowMap
        const arcData = data.map(d => ({
          origin: d.origin || '',
          destination: d.destination || '',
          value: d.value,
        }));
        return (
          <div style={{ height }}>
            <ArcFlowMap data={arcData} isLoading={false} />
          </div>
        );

      default:
        return null;
    }
  };

  const titleClasses = compact
    ? 'text-sm font-semibold text-gray-900 mb-2'
    : 'text-lg font-semibold text-gray-900 mb-4';

  return (
    <Card variant="default" padding={compact ? 'sm' : 'md'}>
      {title && <h3 className={titleClasses}>{title}</h3>}
      {renderMap()}
    </Card>
  );
}

export default ReportMap;
```

---

## STEP 4: Update ReportRenderer

### FILE: src/components/reports/studio/ReportRenderer.tsx

Add the map section renderer:

```typescript
// Add import at top
import { ReportMap, MapDataPoint } from './ReportMap';
import { MapSection } from '../../../types/aiReport';

// In the SectionRenderer function, add case for 'map':

case 'map': {
  const mapSection = section as MapSection;
  const mapData = data as MapDataPoint[] | null;
  
  return (
    <ReportMap
      type={mapSection.config.mapType}
      data={mapData || []}
      title={mapSection.config.title}
      height={compact ? Math.min(mapSection.config.height || 300, 300) : mapSection.config.height}
      format={mapSection.config.metric.format}
      compact={compact}
    />
  );
}
```

---

## STEP 5: Update Report Data Executor

### FILE: src/services/reportDataExecutor.ts

Add handling for new chart types and map sections. Find the section execution logic and add:

```typescript
// For map sections, we need to aggregate by state/lane
case 'map': {
  const mapConfig = section.config as MapSection['config'];
  
  // Build query based on map type
  if (mapConfig.mapType === 'choropleth') {
    // Group by state
    const stateField = mapConfig.groupBy || 'destination_state';
    // Execute query grouping by state
    // Return: [{ stateCode: 'CA', value: 1234, shipmentCount: 50 }, ...]
  } else if (mapConfig.mapType === 'flow' || mapConfig.mapType === 'arc') {
    // Group by origin/destination pair
    // Return: [{ origin: 'OH', destination: 'CA', value: 5000, shipmentCount: 25 }, ...]
  }
  break;
}

// For new chart types, handle data transformation
case 'chart': {
  const chartConfig = section.config as ChartSection['config'];
  
  if (chartConfig.chartType === 'calendar') {
    // Group by date
    // Return: [{ date: '2024-01-15', value: 45 }, ...]
  } else if (chartConfig.chartType === 'bump') {
    // Group by time period and entity, calculate rankings
    // Return data suitable for bump chart
  } else if (chartConfig.chartType === 'waterfall') {
    // Return sequential values for waterfall
  }
  // ... existing chart handling
}
```

---

## STEP 6: Update Edge Function Prompt

### FILE: supabase/functions/generate-report/index.ts

Update the REPORT_SCHEMA to include new visualization types:

```typescript
const REPORT_SCHEMA = `
## REPORT OUTPUT FORMAT

// ... existing content ...

### Section Types (use exact type names):
- **hero**: Large single metric display (type: "hero")
- **stat-row**: Row of 2-4 stat cards (type: "stat-row")
- **chart**: Bar, line, pie, area, treemap, radar, calendar, bump, or waterfall chart (type: "chart")
- **category-grid**: Grid of category cards with counts (type: "category-grid")
- **table**: Data table with grouping (type: "table")
- **header**: Section header/title (type: "header")
- **map**: Geographic visualization - choropleth, flow, cluster, or arc (type: "map")

### Chart Types:
- bar - Vertical or horizontal bars for comparison
- line - Trend over time
- pie - Part-to-whole composition (use for 2-6 categories only)
- area - Trend with filled area
- treemap - Hierarchical breakdown (e.g., spend by carrier → service type)
- radar - Multi-metric comparison (e.g., compare carriers on cost, speed, reliability)
- calendar - Daily patterns in a calendar grid (e.g., shipments per day)
- bump - Ranking changes over time (e.g., top carriers by month)
- waterfall - Sequential breakdown (e.g., cost components adding to total)

### Map Types:
- choropleth - Heat map showing values by state/province (e.g., "where do my shipments go?")
- flow - Lines showing origin→destination flows (e.g., "shipment routes from Ohio")
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

// ... rest of existing schema ...
`;
```

---

## STEP 7: Update Studio Index Exports

### FILE: src/components/reports/studio/index.ts

Add export for the new ReportMap:

```typescript
export { ReportMap } from './ReportMap';
export type { ReportMapProps, MapDataPoint } from './ReportMap';
```

---

## Testing Prompts

After implementing, test with these conversations in the AI Report Studio:

1. **Heat Map Test:**
   > "Show me where my shipments go"
   
   Expected: AI creates a choropleth map grouped by destination_state

2. **Treemap Test:**
   > "Break down my spend by carrier"
   
   Expected: AI creates a treemap showing spend by carrier

3. **Calendar Test:**
   > "Show me my shipping patterns by day for the last 3 months"
   
   Expected: AI creates a calendar heatmap

4. **Radar Test:**
   > "Compare my top 3 carriers on cost, volume, and average miles"
   
   Expected: AI creates a radar chart

5. **Flow Map Test:**
   > "Show me where shipments go from Ohio"
   
   Expected: AI creates a flow map with OH as origin

---

## Summary

This phase connects all the visualization components to the AI Report Builder by:

1. Adding type definitions for new visualizations
2. Creating a ReportMap component to render geographic visualizations
3. Updating ReportChart to handle new chart types
4. Updating ReportRenderer to render map sections
5. Updating the edge function prompt so AI knows when to use each visualization
6. Adding data transformation logic for new visualization types

After this phase, users can ask for heat maps, flow maps, treemaps, radar charts, and more through natural conversation.
