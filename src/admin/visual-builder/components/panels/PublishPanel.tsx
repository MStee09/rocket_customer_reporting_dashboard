import React, { useState, useEffect } from 'react';
import {
  Upload,
  Globe,
  User,
  LayoutDashboard,
  Activity,
  BarChart3,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useBuilder } from '../BuilderContext';
import { validateBuilderSchema } from '../../types/BuilderSchema';
import { compileLogicBlocks, serializeLogicBlocks } from '../../logic/compileLogic';
import { supabase } from '../../../../lib/supabase';
import { clearDraftFromStorage } from '../BuilderContext';

const PLACEMENTS = [
  { id: 'pulse', label: 'Pulse Dashboard', icon: <Activity className="w-4 h-4" />, description: 'Executive overview' },
  { id: 'hub', label: 'Analytics Hub', icon: <BarChart3 className="w-4 h-4" />, description: 'Deep analytics' },
  { id: 'dashboard', label: 'Custom Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, description: 'User dashboards' },
  { id: 'report', label: 'Reports', icon: <FileText className="w-4 h-4" />, description: 'Scheduled reports' },
] as const;

const SIZES = [
  { value: 1, label: 'Small', description: '1/3 width' },
  { value: 2, label: 'Medium', description: '2/3 width' },
  { value: 3, label: 'Large', description: 'Full width' },
] as const;

export function PublishPanel() {
  const { state, setPublishConfig } = useBuilder();
  const [customers, setCustomers] = useState<{ id: number; name: string }[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ success: boolean; message: string } | null>(null);

  const validation = validateBuilderSchema(state);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    const { data } = await supabase
      .from('customers')
      .select('customer_id, customer_name')
      .order('customer_name');

    if (data) {
      setCustomers(data.map(c => ({ id: c.customer_id, name: c.customer_name })));
    }
  };

  const handlePublish = async () => {
    if (!validation.valid) {
      setPublishResult({ success: false, message: validation.errors[0] });
      return;
    }

    setPublishing(true);
    setPublishResult(null);

    try {
      const compiledParams = compileLogicBlocks(state.logicBlocks, state.executionParams);

      const { error } = await supabase.from('dashboard_widgets').insert({
        widget_id: state.id,
        customer_id: state.publish.scope === 'customer' ? state.publish.customerId : null,
        config: {
          title: state.title,
          description: state.description,
          visualization: state.visualization,
          dataSource: state.dataSource,
          executionParams: compiledParams,
          logicBlocks: state.logicBlocks,
          publish: state.publish,
        },
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      clearDraftFromStorage();
      setPublishResult({ success: true, message: 'Widget published successfully!' });
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
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">Scope</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setPublishConfig({ scope: 'system', customerId: undefined })}
            className={`
              flex items-center gap-3 p-3 rounded-lg border text-left transition-all
              ${state.publish.scope === 'system'
                ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-500'
                : 'border-slate-200 hover:border-slate-300'
              }
            `}
          >
            <div className={`p-2 rounded-lg ${state.publish.scope === 'system' ? 'bg-orange-100' : 'bg-slate-100'}`}>
              <Globe className={`w-5 h-5 ${state.publish.scope === 'system' ? 'text-orange-600' : 'text-slate-500'}`} />
            </div>
            <div>
              <div className={`text-sm font-medium ${state.publish.scope === 'system' ? 'text-orange-700' : 'text-slate-700'}`}>
                System-wide
              </div>
              <div className="text-xs text-slate-500">Available to all users</div>
            </div>
          </button>

          <button
            onClick={() => setPublishConfig({ scope: 'customer' })}
            className={`
              flex items-center gap-3 p-3 rounded-lg border text-left transition-all
              ${state.publish.scope === 'customer'
                ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-500'
                : 'border-slate-200 hover:border-slate-300'
              }
            `}
          >
            <div className={`p-2 rounded-lg ${state.publish.scope === 'customer' ? 'bg-orange-100' : 'bg-slate-100'}`}>
              <User className={`w-5 h-5 ${state.publish.scope === 'customer' ? 'text-orange-600' : 'text-slate-500'}`} />
            </div>
            <div>
              <div className={`text-sm font-medium ${state.publish.scope === 'customer' ? 'text-orange-700' : 'text-slate-700'}`}>
                Customer-specific
              </div>
              <div className="text-xs text-slate-500">Single customer only</div>
            </div>
          </button>
        </div>
      </div>

      {state.publish.scope === 'customer' && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Customer</label>
          <select
            value={state.publish.customerId || ''}
            onChange={(e) => setPublishConfig({ customerId: e.target.value ? Number(e.target.value) : undefined })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Select customer...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">Placement</label>
        <div className="grid grid-cols-2 gap-2">
          {PLACEMENTS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPublishConfig({ placement: p.id })}
              className={`
                flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all
                ${state.publish.placement === p.id
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-slate-200 hover:border-slate-300'
                }
              `}
            >
              <div className={state.publish.placement === p.id ? 'text-orange-600' : 'text-slate-400'}>
                {p.icon}
              </div>
              <div>
                <div className={`text-sm font-medium ${state.publish.placement === p.id ? 'text-orange-700' : 'text-slate-700'}`}>
                  {p.label}
                </div>
                <div className="text-xs text-slate-500">{p.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">Size</label>
        <div className="flex gap-2">
          {SIZES.map((s) => (
            <button
              key={s.value}
              onClick={() => setPublishConfig({ size: s.value as 1 | 2 | 3 })}
              className={`
                flex-1 py-2 px-3 rounded-lg border text-center transition-all
                ${state.publish.size === s.value
                  ? 'border-orange-500 bg-orange-50 text-orange-700'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }
              `}
            >
              <div className="text-sm font-medium">{s.label}</div>
              <div className="text-xs text-slate-500">{s.description}</div>
            </button>
          ))}
        </div>
      </div>

      {validation.errors.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
            <div className="text-sm text-red-700">
              <div className="font-medium mb-1">Cannot publish:</div>
              {validation.errors.map((e, i) => (
                <div key={i}>{e}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {publishResult && (
        <div className={`p-3 rounded-lg border ${publishResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-2">
            {publishResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-500" />
            )}
            <span className={`text-sm ${publishResult.success ? 'text-green-700' : 'text-red-700'}`}>
              {publishResult.message}
            </span>
          </div>
        </div>
      )}

      <button
        onClick={handlePublish}
        disabled={publishing || !validation.valid}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {publishing ? (
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
    </div>
  );
}

export default PublishPanel;
