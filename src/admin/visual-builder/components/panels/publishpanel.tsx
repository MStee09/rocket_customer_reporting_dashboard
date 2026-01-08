/**
 * PublishPanel - Publish Widget to Database
 * 
 * Saves the configured widget as a WidgetInstance in the database.
 * Handles scope, placement, and final validation.
 */

import React, { useState, useEffect } from 'react';
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Globe,
  Building2,
  LayoutDashboard,
  BarChart3,
  FileText,
  Target,
} from 'lucide-react';
import { useBuilder } from '../BuilderContext';
import { clearDraftFromStorage } from '../BuilderContext';
import { compileLogicBlocks, serializeLogicBlocks } from '../../logic/compileLogic';
import { supabase } from '../../../lib/supabase';

// =============================================================================
// TYPES
// =============================================================================

interface Customer {
  customer_id: number;
  company_name: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function PublishPanel() {
  const { state, setPublishConfig, validation, compiledParams } = useBuilder();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ success: boolean; message: string } | null>(null);

  // Fetch customers for customer-scoped widgets
  useEffect(() => {
    async function fetchCustomers() {
      const { data } = await supabase
        .from('customer')
        .select('customer_id, company_name')
        .order('company_name');
      if (data) setCustomers(data);
    }
    fetchCustomers();
  }, []);

  const handlePublish = async () => {
    if (!validation.valid) {
      setPublishResult({ success: false, message: 'Please fix validation errors first' });
      return;
    }

    setIsPublishing(true);
    setPublishResult(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Compile final params
      const finalParams = compileLogicBlocks(state.logicBlocks, state.executionParams);

      // Build the widget instance record
      const instanceData = {
        widget_id: state.widgetId || `custom_${state.id}`,
        title: state.title,
        description: state.description,
        scope: state.publish.scope,
        customer_id: state.publish.scope === 'customer' ? state.publish.customerId : null,
        placement: state.publish.placement,
        section_id: state.publish.sectionId || null,
        display_order: state.publish.displayOrder || 0,
        size: state.publish.size,
        default_params: finalParams,
        logic_blocks: state.logicBlocks,
        visualization_type: state.visualization.type,
        visualization_config: {
          xField: state.visualization.xField,
          yField: state.visualization.yField,
          groupBy: state.visualization.groupBy,
          aggregation: state.visualization.aggregation,
          geo: state.visualization.geo,
          flow: state.visualization.flow,
          kpi: state.visualization.kpi,
          showLegend: state.visualization.showLegend,
          showLabels: state.visualization.showLabels,
          colors: state.visualization.colors,
        },
        geo_config: state.visualization.geo || state.visualization.flow || null,
        is_active: true,
        is_pinned: false,
        created_by: user?.id,
      };

      const { data, error } = await supabase
        .from('widget_instances')
        .insert(instanceData)
        .select()
        .single();

      if (error) throw error;

      // Clear draft on successful publish
      clearDraftFromStorage();

      setPublishResult({
        success: true,
        message: `Widget "${state.title}" published successfully!`,
      });
    } catch (err) {
      setPublishResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to publish widget',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-1">Publish Widget</h3>
        <p className="text-xs text-slate-500">Configure where and how this widget will appear</p>
      </div>

      {/* Validation Status */}
      <ValidationStatus validation={validation} />

      {/* Scope Selection */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-700">Visibility Scope</label>
        <div className="grid grid-cols-2 gap-3">
          <ScopeButton
            selected={state.publish.scope === 'system'}
            onClick={() => setPublishConfig({ scope: 'system', customerId: undefined })}
            icon={<Globe className="w-5 h-5" />}
            title="System-wide"
            description="Visible to all customers"
          />
          <ScopeButton
            selected={state.publish.scope === 'customer'}
            onClick={() => setPublishConfig({ scope: 'customer' })}
            icon={<Building2 className="w-5 h-5" />}
            title="Customer-specific"
            description="Visible to one customer"
          />
        </div>

        {/* Customer Selector */}
        {state.publish.scope === 'customer' && (
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Select Customer
            </label>
            <select
              value={state.publish.customerId || ''}
              onChange={(e) => setPublishConfig({ customerId: Number(e.target.value) || undefined })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Select customer...</option>
              {customers.map(c => (
                <option key={c.customer_id} value={c.customer_id}>
                  {c.company_name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Placement Selection */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-700">Placement</label>
        <div className="grid grid-cols-2 gap-3">
          <PlacementButton
            selected={state.publish.placement === 'pulse'}
            onClick={() => setPublishConfig({ placement: 'pulse' })}
            icon={<Target className="w-5 h-5" />}
            title="Pulse Dashboard"
            description="Main overview page"
          />
          <PlacementButton
            selected={state.publish.placement === 'hub'}
            onClick={() => setPublishConfig({ placement: 'hub' })}
            icon={<BarChart3 className="w-5 h-5" />}
            title="Analytics Hub"
            description="Deep-dive analytics"
          />
          <PlacementButton
            selected={state.publish.placement === 'dashboard'}
            onClick={() => setPublishConfig({ placement: 'dashboard' })}
            icon={<LayoutDashboard className="w-5 h-5" />}
            title="Custom Dashboard"
            description="User dashboards"
          />
          <PlacementButton
            selected={state.publish.placement === 'report'}
            onClick={() => setPublishConfig({ placement: 'report' })}
            icon={<FileText className="w-5 h-5" />}
            title="Reports"
            description="Scheduled reports"
          />
        </div>
      </div>

      {/* Size Selection */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-700">Widget Size</label>
        <div className="flex gap-2">
          {[1, 2, 3].map(size => (
            <button
              key={size}
              onClick={() => setPublishConfig({ size: size as 1 | 2 | 3 })}
              className={`
                flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all
                ${state.publish.size === size
                  ? 'border-orange-500 bg-orange-50 text-orange-700'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }
              `}
            >
              {size === 1 ? 'Small' : size === 2 ? 'Medium' : 'Large'}
            </button>
          ))}
        </div>
      </div>

      {/* Display Order */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Display Order
        </label>
        <input
          type="number"
          value={state.publish.displayOrder || 0}
          onChange={(e) => setPublishConfig({ displayOrder: Number(e.target.value) })}
          min={0}
          className="w-24 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        <p className="text-xs text-slate-500 mt-1">Lower numbers appear first</p>
      </div>

      {/* Publish Button */}
      <div className="pt-4 border-t border-slate-200">
        <button
          onClick={handlePublish}
          disabled={isPublishing || !validation.valid}
          className={`
            w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all
            ${validation.valid
              ? 'bg-orange-500 hover:bg-orange-600 text-white'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }
          `}
        >
          {isPublishing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Publishing...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              Publish Widget
            </>
          )}
        </button>

        {/* Publish Result */}
        {publishResult && (
          <div className={`
            mt-3 p-3 rounded-lg flex items-start gap-2
            ${publishResult.success
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
            }
          `}>
            {publishResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            )}
            <span className={`text-sm ${publishResult.success ? 'text-green-700' : 'text-red-700'}`}>
              {publishResult.message}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function ValidationStatus({ validation }: { validation: { valid: boolean; errors: string[]; warnings: string[] } }) {
  if (validation.valid && validation.warnings.length === 0) {
    return (
      <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5 text-green-500" />
        <span className="text-sm text-green-700">Ready to publish</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {validation.errors.map((err, i) => (
        <div key={i} className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <span className="text-sm text-red-700">{err}</span>
        </div>
      ))}
      {validation.warnings.map((warn, i) => (
        <div key={i} className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <span className="text-sm text-amber-700">{warn}</span>
        </div>
      ))}
    </div>
  );
}

interface ButtonProps {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}

function ScopeButton({ selected, onClick, icon, title, description }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        p-3 rounded-lg border text-left transition-all
        ${selected
          ? 'border-orange-500 bg-orange-50'
          : 'border-slate-200 hover:border-slate-300'
        }
      `}
    >
      <div className={`mb-1 ${selected ? 'text-orange-500' : 'text-slate-400'}`}>
        {icon}
      </div>
      <div className={`font-medium text-sm ${selected ? 'text-orange-700' : 'text-slate-700'}`}>
        {title}
      </div>
      <div className="text-xs text-slate-500">{description}</div>
    </button>
  );
}

function PlacementButton({ selected, onClick, icon, title, description }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        p-3 rounded-lg border text-left transition-all
        ${selected
          ? 'border-orange-500 bg-orange-50'
          : 'border-slate-200 hover:border-slate-300'
        }
      `}
    >
      <div className={`mb-1 ${selected ? 'text-orange-500' : 'text-slate-400'}`}>
        {icon}
      </div>
      <div className={`font-medium text-sm ${selected ? 'text-orange-700' : 'text-slate-700'}`}>
        {title}
      </div>
      <div className="text-xs text-slate-500">{description}</div>
    </button>
  );
}

export default PublishPanel;
