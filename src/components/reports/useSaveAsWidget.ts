import { useState } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { SimpleReportConfig } from '../../types/reports';
import { executeSimpleReport } from '../../utils/simpleQueryBuilder';
import { saveCustomWidget } from '../../config/widgets/customWidgetStorage';
import { logger } from '../../utils/logger';
import {
  WidgetConfig,
  buildQueryConfig,
  buildVisualizationConfig,
  buildWhatItShows,
  inferCategory,
  getWidgetIcon,
  getWidgetColor,
  getDefaultSize,
  transformRawDataToWidgetData,
} from './saveAsWidgetUtils';

interface UseSaveAsWidgetParams {
  config: WidgetConfig;
  report: SimpleReportConfig & { id: string };
  customerId: string | null;
  customerName: string;
  user: { id: string; email: string } | null;
  isAdmin: boolean;
  supabase: SupabaseClient;
  validateStep: (step: number) => { valid: boolean; error?: string };
  setValidationError: (error: string | null) => void;
}

interface UseSaveAsWidgetResult {
  saving: boolean;
  error: string | null;
  createdWidgetId: string | null;
  showSuccessOptions: boolean;
  setShowSuccessOptions: (show: boolean) => void;
  setError: (error: string | null) => void;
  saveWidget: () => Promise<void>;
}

export function useSaveAsWidget({
  config,
  report,
  customerId,
  customerName,
  user,
  isAdmin,
  supabase,
  validateStep,
  setValidationError,
}: UseSaveAsWidgetParams): UseSaveAsWidgetResult {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdWidgetId, setCreatedWidgetId] = useState<string | null>(null);
  const [showSuccessOptions, setShowSuccessOptions] = useState(false);

  const saveWidget = async () => {
    const validation = validateStep(2);
    if (!validation.valid) {
      setValidationError(validation.error || 'Please fill in required fields');
      return;
    }

    if (!customerId) {
      setValidationError('No customer selected. Please select a customer to save the widget.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const widgetId = `widget_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const reportPath = `customer/${customerId}/${report.id}.json`;

      const widgetDefinition = {
        id: widgetId,
        name: config.name,
        description: config.description,
        type: config.type,
        category: inferCategory(config),
        source: 'report' as const,
        visibility: { type: 'private' as const },
        createdBy: {
          userId: user?.id || '',
          userEmail: user?.email || '',
          isAdmin: isAdmin,
          customerId: customerId,
          customerName: customerName,
          timestamp: new Date().toISOString(),
        },
        sourceReport: {
          id: report.id,
          name: report.name,
          path: reportPath,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        dataSource: {
          type: 'query' as const,
          reportReference: {
            reportId: report.id,
            reportName: report.name,
          },
          reportColumns: report.columns.map(c => ({
            id: c.id,
            label: c.label,
          })),
          query: buildQueryConfig(config, report),
        },
        visualization: buildVisualizationConfig(config),
        display: {
          icon: getWidgetIcon(config.type),
          iconColor: getWidgetColor(config.type),
          defaultSize: getDefaultSize(config.type),
        },
        whatItShows: buildWhatItShows(config, report),
        dataMode: config.dataMode,
        snapshotData: undefined as unknown,
        snapshotDate: undefined as string | undefined,
      };

      if (config.dataMode === 'static') {
        try {
          const rawData = await executeSimpleReport(report, String(customerId));
          const snapshotData = transformRawDataToWidgetData(rawData, config);
          widgetDefinition.snapshotData = snapshotData;
          widgetDefinition.snapshotDate = new Date().toISOString();
        } catch (err) {
          logger.error('Failed to capture snapshot:', err);
          throw new Error('Failed to capture data snapshot for static widget');
        }
      }

      const result = await saveCustomWidget(supabase, widgetDefinition, customerId);

      if (!result.success) {
        throw new Error(result.error || 'Failed to save widget');
      }

      setCreatedWidgetId(widgetId);
      setShowSuccessOptions(true);
    } catch (err) {
      logger.error('Save error:', err);
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  return {
    saving,
    error,
    createdWidgetId,
    showSuccessOptions,
    setShowSuccessOptions,
    setError,
    saveWidget,
  };
}
