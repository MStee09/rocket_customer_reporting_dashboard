export interface CategoryConfig {
  name: string;
  keywords: string[];
  color: string;
  isDefault?: boolean;
}

export interface MetricConfig {
  key: string;
  name: string;
  description: string;
  route: string;
  icon: string;
  sidebarSection: 'reports' | 'analytics';
  component: string;
  config?: {
    categories?: CategoryConfig[];
  };
}

export type CustomerMetricsConfig = {
  [customerId: number]: MetricConfig[];
};
