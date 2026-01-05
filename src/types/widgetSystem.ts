export type WidgetLocation = 'pulse' | 'hub' | 'both';
export type WidgetSource = 'system' | 'report' | 'custom';
export type WidgetDisplayType = 'kpi' | 'chart' | 'table' | 'map' | 'list';

export interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
  source: WidgetSource;
  displayType: WidgetDisplayType;
  allowedLocations: WidgetLocation[];
  defaultLocation: WidgetLocation;
  dataRequirements: {
    tables: string[];
    minRows?: number;
    requiredColumns?: string[];
  };
  queryFunction?: string;
  reportId?: string;
  icon: string;
  iconColor: string;
  category: string;
  minSize: 1 | 2 | 3;
  maxSize: 1 | 2 | 3;
  defaultSize: 1 | 2 | 3;
}

export interface WidgetInstance {
  id: string;
  definitionId: string;
  customerId: number;
  location: WidgetLocation;
  sectionId?: string;
  order: number;
  title?: string;
  size: 1 | 2 | 3;
  config?: Record<string, unknown>;
  isActive: boolean;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsSection {
  id: string;
  title: string;
  description: string;
  icon: string;
  order: number;
  isCollapsible: boolean;
  defaultExpanded: boolean;
}

export interface CustomerProfile {
  id: number;
  companyName: string;
  primaryMode: 'LTL' | 'TL' | 'Partial' | 'Mixed';
  modeBreakdown: {
    LTL: number;
    TL: number;
    Partial: number;
  };
  monthlyShipments: number;
  monthlySpend: number;
  activeLanes: number;
  activeCarriers: number;
  spendTrend: number;
  volumeTrend: number;
  onTimePercentage: number;
  avgCostPerShipment: number;
  availableData: {
    hasShipments: boolean;
    hasInvoices: boolean;
    hasCarrierData: boolean;
    hasLaneData: boolean;
    hasAccessorials: boolean;
  };
}

export interface WidgetDataValidation {
  widgetId: string;
  isValid: boolean;
  hasData: boolean;
  rowCount: number;
  missingRequirements?: string[];
}

export interface PulseConfig {
  showAIInsights: boolean;
  showAnomalyAlerts: boolean;
  showCoreKPIs: boolean;
  showTrendChart: boolean;
  pinnedWidgetIds: string[];
  maxPinnedWidgets: number;
}

export interface HubLayoutConfig {
  sections: AnalyticsSection[];
  widgetsBySectionId: Record<string, string[]>;
  collapsedSections: string[];
}
