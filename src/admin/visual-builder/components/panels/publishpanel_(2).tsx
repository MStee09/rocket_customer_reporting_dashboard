import React, { useState, useEffect } from 'react';
import {
  Upload,
  Globe,
  Building2,
  Activity,
  BarChart3,
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
import { useAuth } from '../../../../contexts/AuthContext';

interface Customer {
  customer_id: number;
  company_name: string;
}

export function PublishPanel() {
  const { state, setPublishConfig } = useBuilder();
  const { customers: authCustomers } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ success: boolean; message: string; widgetId?: string } | null>(null);

  const validation = validateBuilderSchema(state);

  useEffect(() => {
    if (state.publish.scope === 'customer') {
      if (authCustomers && authCustomers.length > 0) {
        setCustomers(authCustomers.map(c => ({
          customer_id: c.customer_id,
          company_name: c.customer_name || `Customer ${c.customer_id}`
        })));
      } else {
        loadCustomers();
      }
    }
  }, [state.publish.scope, authCustomers]);

  const loadCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const { data, error } = await supabase
        .from('customer')
        .select('customer_id, company_name')
        .eq('is_active', true)
        .order('company_name');

      if (error) {
        console.error('[PublishPanel] Failed to load customers:', error);
        throw error;
      }

      console.log('[PublishPanel] Loaded customers:', data?.length);
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
        customerScope: state.customerScope,
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

        setPublishResult({
          success: true,
          message: 'Widget updated successfully!',
          widgetId: data?.instance_id,
        });
      } else {
        const { data, error } = await supabase
          .from('widget_instances')
          .insert({
            widget_type: 'custom',
            config: widgetConfig,
            customer_id: state.publish.scope === 'customer' ? state.publish.customerId : null,
            placement: state.publish.placement,
            display_order: state.publish.displayOrder || 0,
            is_active: true,
          })
          .select()
          .single();

        if (error) throw error;

        setPublishResult({
          success: true,
          message: 'Widget published successfully!',
          widgetId: data?.instance_id,
        });
      }
    } catch (err) {
      console.error('[PublishPanel] Publish error:', err);
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
      {/* Scope Selection */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">Visibility</h3>
        
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setPublishConfig({ scope: 'system', customerId: undefined })}
            className={`
              flex items-center gap-2 p-3 rounded-lg border-2 text-left transition-all
              ${state.publish.scope === 'system'
                ? 'border-orange-500 bg-orange-50'
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
              flex items-center gap-2 p-3 rounded-lg border-2 text-left transition-all
              ${state.publish.scope === 'customer'
                ? 'border-orange-500 bg-orange-50'
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

        {/* Customer selector - only shown when scope is 'customer' */}
        {state.publish.scope === 'customer' && (
          <div className="mt-3">
            <label className="block text-xs text-slate-500 mb-1">Select Customer</label>
            {loadingCustomers ? (
              <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading customers...
              </div>
            ) : customers.length === 0 ? (
              <div className="text-sm text-amber-600 p-2 bg-amber-50 rounded-lg">
                No customers found. Check database connection.
              </div>
            ) : (
              <select
                value={state.publish.customerId || ''}
                onChange={(e) => setPublishConfig({ customerId: Number(e.target.value) || undefined })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Select a customer...</option>
                {customers.map(c => (
                  <option key={c.customer_id} value={c.customer_id}>
                    {c.company_name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {/* Placement Selection - UPDATED to only show Pulse and Analytics Hub */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">Placement</h3>

        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'pulse', label: 'Pulse', icon: Activity, desc: 'Executive dashboard' },
            { value: 'analytics_hub', label: 'Analytics Hub', icon: BarChart3, desc: 'Detailed analytics' },
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

      {/* Widget Size */}
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

      {/* Update existing widget option */}
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

      {/* Validation Errors */}
      {validation.errors.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700">Cannot publish:</p>
              <ul className="text-xs text-red-600 mt-1 space-y-1">
                {validation.errors.map((err, i) => (
                  <li key={i}>• {err}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Warnings */}
      {validation.warnings.length > 0 && validation.errors.length === 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-700">Warnings:</p>
              <ul className="text-xs text-amber-600 mt-1 space-y-1">
                {validation.warnings.map((warn, i) => (
                  <li key={i}>• {warn}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Publish Button */}
      <button
        onClick={handlePublish}
        disabled={publishing || !validation.valid}
        className={`
          w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all
          ${validation.valid
            ? 'bg-orange-500 text-white hover:bg-orange-600'
            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }
        `}
      >
        {publishing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Publishing...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            {state.publish.isUpdate ? 'Update Widget' : 'Publish Widget'}
          </>
        )}
      </button>

      {/* Publish Result */}
      {publishResult && (
        <div className={`p-3 rounded-lg border ${
          publishResult.success 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-start gap-2">
            {publishResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
            )}
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                publishResult.success ? 'text-green-700' : 'text-red-700'
              }`}>
                {publishResult.message}
              </p>
              {publishResult.widgetId && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <Copy className="w-3 h-3" />
                  Widget ID: {publishResult.widgetId}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
