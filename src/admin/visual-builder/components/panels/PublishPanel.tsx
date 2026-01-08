/**
 * Publish Panel
 *
 * LOCATION: /src/admin/visual-builder/components/panels/PublishPanel.tsx
 *
 * Allows admins to configure publishing options and deploy the widget.
 */

import React, { useState, useEffect } from 'react';
import {
  Upload,
  Globe,
  Building2,
  LayoutDashboard,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Info,
  History,
  Copy,
} from 'lucide-react';
import { useBuilder } from '../BuilderContext';
import { validateBuilderSchema } from '../../types/BuilderSchema';
import { supabase } from '../../../../lib/supabase';

interface Customer {
  id: number;
  company_name: string;
}

export function PublishPanel() {
  const { state, setPublishConfig } = useBuilder();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ success: boolean; message: string; widgetId?: string } | null>(null);

  const validation = validateBuilderSchema(state);

  useEffect(() => {
    if (state.publish.scope === 'customer') {
      loadCustomers();
    }
  }, [state.publish.scope]);

  const loadCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, company_name')
        .order('company_name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handlePublish = async () => {
    if (!validation.valid) return;

    setPublishing(true);
    setPublishResult(null);

    try {
      const widgetConfig = {
        title: state.title,
        description: state.description,
        visualization: state.visualization,
        executionParams: state.executionParams,
        logicBlocks: state.logicBlocks,
        dataSource: state.dataSource,
      };

      const isUpdate = state.publish.isUpdate && state.publish.existingWidgetId;

      if (isUpdate) {
        const { data, error } = await supabase
          .from('widget_instances')
          .update({
            config: widgetConfig,
            updated_at: new Date().toISOString(),
          })
          .eq('instance_id', state.publish.existingWidgetId)
          .select()
          .single();

        if (error) throw error;

        if (state.publish.versionNotes) {
          await supabase.from('widget_version_history').insert({
            widget_id: state.publish.existingWidgetId,
            version_notes: state.publish.versionNotes,
            config_snapshot: widgetConfig,
          });
        }

        setPublishResult({
          success: true,
          message: 'Widget updated successfully!',
          widgetId: data.instance_id,
        });
      } else {
        const { data, error } = await supabase
          .from('widget_instances')
          .insert({
            widget_id: state.widgetId || 'custom_visual_builder',
            customer_id: state.publish.scope === 'customer' ? state.publish.customerId : null,
            placement: state.publish.placement,
            section_id: state.publish.sectionId,
            display_order: state.publish.displayOrder || 0,
            size: state.publish.size,
            config: widgetConfig,
            is_active: true,
          })
          .select()
          .single();

        if (error) throw error;

        setPublishResult({
          success: true,
          message: 'Widget published successfully!',
          widgetId: data.instance_id,
        });
      }
    } catch (err) {
      setPublishResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to publish widget',
      });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <ValidationStatus validation={validation} />

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">Visibility</h3>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setPublishConfig({ scope: 'system', customerId: undefined })}
            className={`
              flex items-center gap-2 p-3 rounded-lg border text-left transition-all
              ${state.publish.scope === 'system'
                ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-500'
                : 'border-slate-200 hover:border-slate-300'
              }
            `}
          >
            <Globe className={`w-5 h-5 ${state.publish.scope === 'system' ? 'text-orange-500' : 'text-slate-400'}`} />
            <div>
              <div className="text-sm font-medium text-slate-900">System-wide</div>
              <div className="text-xs text-slate-500">All customers</div>
            </div>
          </button>

          <button
            onClick={() => setPublishConfig({ scope: 'customer' })}
            className={`
              flex items-center gap-2 p-3 rounded-lg border text-left transition-all
              ${state.publish.scope === 'customer'
                ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-500'
                : 'border-slate-200 hover:border-slate-300'
              }
            `}
          >
            <Building2 className={`w-5 h-5 ${state.publish.scope === 'customer' ? 'text-orange-500' : 'text-slate-400'}`} />
            <div>
              <div className="text-sm font-medium text-slate-900">Customer</div>
              <div className="text-xs text-slate-500">Single customer</div>
            </div>
          </button>
        </div>

        {state.publish.scope === 'customer' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Select Customer
            </label>
            {loadingCustomers ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading customers...
              </div>
            ) : (
              <select
                value={state.publish.customerId || ''}
                onChange={(e) => setPublishConfig({ customerId: Number(e.target.value) || undefined })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Select a customer...</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.company_name}</option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">Placement</h3>

        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'pulse', label: 'Pulse', icon: LayoutDashboard, desc: 'Customer overview' },
            { value: 'hub', label: 'Hub', icon: LayoutDashboard, desc: 'Main dashboard' },
            { value: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'Analytics page' },
            { value: 'report', label: 'Report', icon: FileText, desc: 'Report builder' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setPublishConfig({ placement: opt.value as any })}
              className={`
                flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all
                ${state.publish.placement === opt.value
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-slate-200 hover:border-slate-300'
                }
              `}
            >
              <opt.icon className={`w-4 h-4 ${state.publish.placement === opt.value ? 'text-orange-500' : 'text-slate-400'}`} />
              <div>
                <div className="text-sm font-medium text-slate-900">{opt.label}</div>
                <div className="text-xs text-slate-500">{opt.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">Widget Size</h3>

        <div className="flex gap-2">
          {[
            { value: 1, label: 'Small', width: 'w-1/3' },
            { value: 2, label: 'Medium', width: 'w-1/2' },
            { value: 3, label: 'Large', width: 'w-full' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setPublishConfig({ size: opt.value as 1 | 2 | 3 })}
              className={`
                flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all
                ${state.publish.size === opt.value
                  ? 'border-orange-500 bg-orange-50 text-orange-700'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }
              `}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {state.sourceWidgetId && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-blue-700">
                This widget is based on an existing widget.
              </p>
              <label className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={state.publish.isUpdate}
                  onChange={(e) => setPublishConfig({
                    isUpdate: e.target.checked,
                    existingWidgetId: e.target.checked ? state.sourceWidgetId : undefined,
                  })}
                  className="rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-blue-700">Update original widget</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {state.publish.isUpdate && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            <History className="w-4 h-4 inline mr-1" />
            Version Notes (optional)
          </label>
          <textarea
            value={state.publish.versionNotes || ''}
            onChange={(e) => setPublishConfig({ versionNotes: e.target.value })}
            placeholder="Describe what changed in this version..."
            rows={2}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
          />
        </div>
      )}

      <div className="pt-4 border-t border-slate-200">
        <button
          onClick={handlePublish}
          disabled={!validation.valid || publishing}
          className={`
            w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all
            ${validation.valid && !publishing
              ? 'bg-orange-500 hover:bg-orange-600 text-white'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }
          `}
        >
          {publishing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Publishing...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              {state.publish.isUpdate ? 'Update Widget' : 'Publish Widget'}
            </>
          )}
        </button>
      </div>

      {publishResult && (
        <div className={`
          p-3 rounded-lg border
          ${publishResult.success
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
          }
        `}>
          <div className="flex items-start gap-2">
            {publishResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            )}
            <div className="flex-1">
              <p className={`text-sm font-medium ${publishResult.success ? 'text-green-700' : 'text-red-700'}`}>
                {publishResult.message}
              </p>
              {publishResult.widgetId && (
                <div className="flex items-center gap-2 mt-2">
                  <code className="text-xs bg-green-100 px-2 py-1 rounded text-green-800">
                    {publishResult.widgetId}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(publishResult.widgetId!)}
                    className="text-green-600 hover:text-green-700"
                    title="Copy widget ID"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ValidationStatusProps {
  validation: { valid: boolean; errors: string[]; warnings: string[] };
}

function ValidationStatus({ validation }: ValidationStatusProps) {
  if (validation.valid && validation.warnings.length === 0) {
    return (
      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
        <CheckCircle2 className="w-5 h-5 text-green-500" />
        <span className="text-sm text-green-700">Ready to publish</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {validation.errors.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700">Cannot publish</p>
              <ul className="mt-1 text-sm text-red-600 list-disc list-inside">
                {validation.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {validation.warnings.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-700">Warnings</p>
              <ul className="mt-1 text-sm text-amber-600 list-disc list-inside">
                {validation.warnings.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PublishPanel;
