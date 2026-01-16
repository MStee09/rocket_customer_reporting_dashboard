import { useState, useCallback } from 'react';
import { logger } from '../../../utils/logger';
import { supabase } from '../../../lib/supabase';
import {
  BuilderMode,
  DateRangePreset,
  PublishDestination,
  PulseSection,
  AnalyticsSection,
  EditableFilter,
  WidgetConfig,
} from '../types/visualBuilderTypes';
import { ADMIN_ONLY_COLUMNS } from '../config/columnDefinitions';

type VisibilityType = 'admin_only' | 'all_customers' | 'private';

interface PublishResult {
  success: boolean;
  message: string;
}

interface UseWidgetPublisherParams {
  config: WidgetConfig;
  mode: BuilderMode;
  visibility: VisibilityType;
  user: { id: string; email: string } | null;
  isAdmin: () => boolean;
  effectiveCustomerId: number | null;
  targetCustomerId: number | null;
  publishDestination: PublishDestination;
  pulseSection: PulseSection;
  analyticsSection: AnalyticsSection;
  editableFilters: EditableFilter[];
  datePreset: DateRangePreset;
  setShowPublishModal: (show: boolean) => void;
}

export function useWidgetPublisher({
  config,
  mode,
  visibility,
  user,
  isAdmin,
  effectiveCustomerId,
  targetCustomerId,
  publishDestination,
  pulseSection,
  analyticsSection,
  editableFilters,
  datePreset,
  setShowPublishModal,
}: UseWidgetPublisherParams) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null);

  const publishWidget = useCallback(async () => {
    if (!config.name.trim() || !config.data || config.data.length === 0) {
      setPublishResult({ success: false, message: 'Name and data required' });
      return;
    }

    setIsPublishing(true);
    setPublishResult(null);

    try {
      const widgetId = `widget_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      const targetCustomer = targetCustomerId || effectiveCustomerId;

      const widgetDefinition = {
        id: widgetId,
        name: config.name,
        description: config.description,
        type: config.chartType,
        source: mode === 'ai' ? 'ai' : 'manual',
        createdBy: {
          userId: user?.id,
          userEmail: user?.email,
          isAdmin: isAdmin(),
          timestamp: new Date().toISOString(),
        },
        destination: publishDestination,
        section: publishDestination === 'pulse' ? pulseSection : analyticsSection,
        visibility: {
          type: visibility,
          customerId: visibility === 'private' ? targetCustomer : null,
        },
        customerId: visibility === 'private' ? targetCustomer : null,
        containsAdminData: config.metricColumn
          ? ADMIN_ONLY_COLUMNS.has(config.metricColumn)
          : false,
        dataSource: {
          groupByColumn: config.groupByColumn,
          secondaryGroupBy: config.secondaryGroupBy,
          isMultiDimension: config.isMultiDimension,
          metricColumn: config.metricColumn,
          aggregation: config.aggregation,
          filters: editableFilters,
          aiConfig: config.aiConfig,
          datePreset,
        },
        visualization: {
          type: config.chartType,
          data: config.data,
          secondaryGroups: config.secondaryGroups,
        },
        createdAt: new Date().toISOString(),
      };

      let storagePath: string;
      if (visibility === 'admin_only') {
        storagePath = `admin/${widgetId}.json`;
      } else if (visibility === 'private' && targetCustomer) {
        storagePath = `customer/${targetCustomer}/${widgetId}.json`;
      } else {
        storagePath = `system/${widgetId}.json`;
      }

      logger.log('[VisualBuilder] Publishing widget to:', storagePath);

      const { error } = await supabase.storage
        .from('custom-widgets')
        .upload(storagePath, JSON.stringify(widgetDefinition, null, 2), {
          contentType: 'application/json',
          upsert: true,
        });

      if (error) throw error;

      const dashboardCustomerId = visibility === 'private' ? targetCustomer : null;
      const { error: dbError } = await supabase.from('dashboard_widgets').insert({
        widget_id: widgetId,
        customer_id: dashboardCustomerId,
        position: 999,
        size: 'medium',
        tab: 'overview',
      });

      if (dbError) {
        console.warn('[VisualBuilder] Could not add to dashboard_widgets:', dbError);
      }

      setPublishResult({
        success: true,
        message: `Widget "${config.name}" published to ${publishDestination === 'pulse' ? 'Pulse Dashboard' : 'Analytics Hub'}!`,
      });
      setShowPublishModal(false);
    } catch (err) {
      setPublishResult({
        success: false,
        message: err instanceof Error ? err.message : 'Publish failed',
      });
    } finally {
      setIsPublishing(false);
    }
  }, [
    config,
    mode,
    visibility,
    user,
    isAdmin,
    effectiveCustomerId,
    targetCustomerId,
    publishDestination,
    pulseSection,
    analyticsSection,
    editableFilters,
    datePreset,
    setShowPublishModal,
  ]);

  return {
    publishWidget,
    isPublishing,
    publishResult,
    setPublishResult,
  };
}
