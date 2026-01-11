import React, { useState, useCallback, useEffect } from 'react';
import { Rocket, Lock, Users, Shield, Activity, BarChart3, Loader2, CheckCircle, AlertCircle, Info, Building2 } from 'lucide-react';
import { useBuilderV3 } from './BuilderContextV3';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { WidgetVisibility, WidgetPlacement } from '../types/BuilderSchemaV3';

const BASE_VISIBILITY_OPTIONS = [
  { type: 'admin_only' as const, label: 'Admin Only', description: 'Only admins can see this widget', icon: Shield },
  { type: 'all_customers' as const, label: 'All Customers', description: 'All customers can add this widget', icon: Users },
  { type: 'private' as const, label: 'Private', description: 'Only you can see this widget', icon: Lock },
];

const PLACEMENT_OPTIONS = [
  { value: 'analytics_hub' as WidgetPlacement, label: 'Analytics Hub', icon: BarChart3 },
  { value: 'pulse' as WidgetPlacement, label: 'Pulse Dashboard', icon: Activity },
  { value: 'both' as WidgetPlacement, label: 'Both', icon: BarChart3 },
];

export function PublishPanelV3() {
  const { state, dispatch, buildWidgetDefinition, canPublish } = useBuilderV3();
  const { user, isAdmin, effectiveCustomerId } = useAuth();
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ success: boolean; message: string; widgetId?: string } | null>(null);
  const [targetCustomerName, setTargetCustomerName] = useState<string | null>(null);

  const isCustomerSpecificMode = state.customerScope === 'specific' && state.selectedCustomerId;

  useEffect(() => {
    if (isCustomerSpecificMode) {
      supabase
        .from('customer')
        .select('company_name')
        .eq('customer_id', state.selectedCustomerId)
        .maybeSingle()
        .then(({ data }) => {
          setTargetCustomerName(data?.company_name || `Customer ${state.selectedCustomerId}`);
        });
    } else {
      setTargetCustomerName(null);
    }
  }, [isCustomerSpecificMode, state.selectedCustomerId]);

  const VISIBILITY_OPTIONS = isCustomerSpecificMode
    ? [
        {
          type: 'customer_specific' as const,
          label: `${targetCustomerName || 'Selected Customer'} Only`,
          description: `Only ${targetCustomerName || 'the selected customer'} can see this widget`,
          icon: Building2,
        },
        ...BASE_VISIBILITY_OPTIONS,
      ]
    : BASE_VISIBILITY_OPTIONS;

  useEffect(() => {
    if (isCustomerSpecificMode && state.visibility.type !== 'customer_specific') {
      const visibility: WidgetVisibility = {
        type: 'customer_specific',
        targetCustomerId: state.selectedCustomerId!,
        targetCustomerName: targetCustomerName || undefined,
      };
      dispatch({ type: 'SET_VISIBILITY', visibility });
    }
  }, [isCustomerSpecificMode, state.selectedCustomerId, targetCustomerName, state.visibility.type, dispatch]);

  const handlePublish = useCallback(async () => {
    if (!canPublish()) return;
    setIsPublishing(true);
    setPublishResult(null);

    try {
      const widgetDefinition = buildWidgetDefinition();

      if (state.visibility.type === 'customer_specific' && state.selectedCustomerId) {
        widgetDefinition.visibility = {
          type: 'customer_specific',
          targetCustomerId: state.selectedCustomerId,
          targetCustomerName: targetCustomerName || undefined,
        };
      }

      let storagePath: string;

      if (state.visibility.type === 'customer_specific' && state.selectedCustomerId) {
        storagePath = `customer/${state.selectedCustomerId}/${widgetDefinition.id}.json`;
      } else if (state.visibility.type === 'admin_only' || (isAdmin() && state.visibility.type !== 'private')) {
        storagePath = `admin/${widgetDefinition.id}.json`;
      } else {
        storagePath = `customer/${effectiveCustomerId || 'unknown'}/${widgetDefinition.id}.json`;
      }

      const { error } = await supabase.storage
        .from('custom-widgets')
        .upload(storagePath, JSON.stringify(widgetDefinition, null, 2), {
          contentType: 'application/json',
          upsert: true,
        });

      if (error) throw error;

      const successMessage = state.visibility.type === 'customer_specific'
        ? `Widget published for ${targetCustomerName}!`
        : 'Widget published successfully!';

      setPublishResult({
        success: true,
        message: successMessage,
        widgetId: widgetDefinition.id,
      });
      setTimeout(() => dispatch({ type: 'RESET' }), 3000);
    } catch (err) {
      setPublishResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to publish',
      });
    } finally {
      setIsPublishing(false);
    }
  }, [canPublish, buildWidgetDefinition, state.visibility, state.selectedCustomerId, targetCustomerName, isAdmin, effectiveCustomerId, dispatch]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h3 className="font-semibold text-slate-900 mb-4">Widget Details</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Name *</label>
            <input
              type="text"
              value={state.name}
              onChange={(e) => dispatch({ type: 'SET_NAME', name: e.target.value })}
              placeholder="Widget name..."
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Description</label>
            <textarea
              value={state.description}
              onChange={(e) => dispatch({ type: 'SET_DESCRIPTION', description: e.target.value })}
              placeholder="Description..."
              rows={2}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg resize-none"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h3 className="font-semibold text-slate-900 mb-4">Visibility</h3>
        <div className="space-y-2">
          {VISIBILITY_OPTIONS.map((option) => {
            const isSelected = state.visibility.type === option.type;
            const Icon = option.icon;
            return (
              <button
                key={option.type}
                onClick={() => {
                  let visibility: WidgetVisibility;
                  if (option.type === 'private') {
                    visibility = { type: 'private', ownerId: user?.id || '' };
                  } else if (option.type === 'customer_specific' && state.selectedCustomerId) {
                    visibility = {
                      type: 'customer_specific',
                      targetCustomerId: state.selectedCustomerId,
                      targetCustomerName: targetCustomerName || undefined,
                    };
                  } else {
                    visibility = { type: option.type } as WidgetVisibility;
                  }
                  dispatch({ type: 'SET_VISIBILITY', visibility });
                }}
                className={`w-full flex items-start gap-3 p-3 rounded-lg border-2 text-left ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-100' : 'bg-slate-100'}`}>
                  <Icon className={`w-5 h-5 ${isSelected ? 'text-blue-600' : 'text-slate-500'}`} />
                </div>
                <div>
                  <p className={`font-medium ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>
                    {option.label}
                  </p>
                  <p className="text-sm text-slate-500">{option.description}</p>
                </div>
              </button>
            );
          })}
        </div>
        {state.visibility.type === 'admin_only' && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
            <Info className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              Admin-only widgets are perfect for internal metrics and cost analysis.
            </p>
          </div>
        )}
        {state.visibility.type === 'customer_specific' && targetCustomerName && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
            <Building2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <p className="text-sm text-blue-800">
              This widget will be saved to <strong>{targetCustomerName}'s</strong> widget library and only they will be able to see it.
            </p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h3 className="font-semibold text-slate-900 mb-4">Placement</h3>
        <div className="space-y-2">
          {PLACEMENT_OPTIONS.map((option) => {
            const isSelected = state.placement === option.value;
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                onClick={() => dispatch({ type: 'SET_PLACEMENT', placement: option.value })}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-5 h-5 ${isSelected ? 'text-blue-600' : 'text-slate-500'}`} />
                <span className={`font-medium ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {publishResult && (
        <div
          className={`p-4 rounded-lg flex items-start gap-3 ${
            publishResult.success
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          {publishResult.success ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600" />
          )}
          <div>
            <p
              className={`font-medium ${
                publishResult.success ? 'text-green-900' : 'text-red-900'
              }`}
            >
              {publishResult.success ? 'Success!' : 'Error'}
            </p>
            <p
              className={`text-sm ${publishResult.success ? 'text-green-700' : 'text-red-700'}`}
            >
              {publishResult.message}
            </p>
          </div>
        </div>
      )}

      <button
        onClick={handlePublish}
        disabled={!canPublish() || isPublishing}
        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 disabled:from-slate-400 disabled:to-slate-400 font-semibold text-lg"
      >
        {isPublishing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Publishing...
          </>
        ) : (
          <>
            <Rocket className="w-5 h-5" />
            Publish Widget
          </>
        )}
      </button>

      {!canPublish() && (
        <div className="text-sm text-slate-500 text-center">
          {!state.name && <p>Enter a widget name</p>}
          {(!state.previewData || state.previewData.length === 0) && (
            <p>Preview must have data</p>
          )}
        </div>
      )}
    </div>
  );
}
