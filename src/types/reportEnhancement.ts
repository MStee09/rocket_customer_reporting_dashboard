export interface ReportEnhancementContext {
  sourceType: 'custom_report';
  sourceReportId: string;
  sourceReportName: string;

  columns: EnhancementColumn[];

  rowCount: number;
  dateRange: {
    type: 'last30' | 'last90' | 'last6months' | 'lastyear' | 'custom';
    start?: string;
    end?: string;
  };

  appliedFilters: AppliedFilter[];

  sampleData: Record<string, unknown>[];

  columnStats: Record<string, ColumnStats>;

  timestamp: string;
}

export interface EnhancementColumn {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'lookup';
  format?: 'currency' | 'percent' | 'number';
  isGroupable: boolean;
  isAggregatable: boolean;
}

export interface AppliedFilter {
  field: string;
  operator: string;
  value: string | number | boolean;
  label: string;
}

export interface ColumnStats {
  uniqueCount?: number;
  topValues?: string[];
  nullCount?: number;

  sum?: number;
  avg?: number;
  min?: number;
  max?: number;

  populatedPercent: number;
}

export interface EnhancementSuggestion {
  type: 'categorization' | 'calculation' | 'visualization';
  title: string;
  description: string;
  prompt: string;
}
