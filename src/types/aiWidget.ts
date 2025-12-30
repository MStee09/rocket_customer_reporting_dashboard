import { AIReportDefinition } from './aiReport';

export interface AIWidgetConfig {
  sourceReportId: string;
  sourceReportName: string;
  displayMode: 'full_report' | 'single_section' | 'selected_sections';
  sectionIndices: number[];
  reportDefinition: AIReportDefinition;
  compact: boolean;
  showTitle: boolean;
  maxHeight?: number;
}

export interface AIWidgetMetadata {
  createdFromAIStudio: boolean;
  originalPrompt?: string;
  generatedAt: string;
  lastExecuted?: string;
  executionCount: number;
}
