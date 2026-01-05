export interface AnalyticsSection {
  id: string;
  title: string;
  description: string;
  icon: string;
  order: number;
}

export interface AnalyticsWidget {
  id: string;
  title: string;
  type: 'kpi' | 'chart' | 'table' | 'report';
  sectionId: string;
  reportId?: string;
  sourceReport?: string;
  dataSource?: string;
  config?: Record<string, unknown>;
  color?: string;
  iconColor?: string;
  order: number;
}

export interface PinnedReport {
  id: string;
  reportId: string;
  title: string;
  sectionId: string;
  customerId: number;
  pinnedAt: string;
  config?: {
    displayType?: 'kpi' | 'chart' | 'table';
    primaryMetric?: string;
    secondaryMetrics?: string[];
  };
}

export interface AnalyticsHubLayout {
  sections: AnalyticsSection[];
  widgetsBySections: Record<string, AnalyticsWidget[]>;
}
