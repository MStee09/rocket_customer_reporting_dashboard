import React from 'react';
import { Loader2, Rocket } from 'lucide-react';
import { WidgetConfig } from '../types/visualBuilderTypes';

interface BuilderPublishModalProps {
  config: WidgetConfig;
  setConfig: React.Dispatch<React.SetStateAction<WidgetConfig>>;
  onPublish: () => void;
  isPublishing: boolean;
  publishResult: { success: boolean; message: string } | null;
  canSeeAdminColumns: boolean;
}

export function BuilderPublishModal({
  config,
  setConfig,
  onPublish,
  isPublishing,
  publishResult,
}: BuilderPublishModalProps) {
  const canPublish = config.name.trim() && config.data && config.data.length > 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
      <h3 className="font-semibold text-slate-900 text-sm">Publish Widget</h3>

      <div>
        <label className="text-xs font-medium text-slate-700">Widget Name *</label>
        <input
          type="text"
          value={config.name}
          onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
          placeholder="e.g., Revenue by Carrier"
          className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-slate-700">Description</label>
        <textarea
          value={config.description}
          onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
          rows={2}
          placeholder="Brief description of this widget"
          className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none"
        />
      </div>

      {publishResult && (
        <div className={`p-3 rounded-lg text-sm ${
          publishResult.success ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {publishResult.message}
        </div>
      )}

      <button
        onClick={onPublish}
        disabled={!canPublish || isPublishing}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-slate-400 disabled:to-slate-400 font-semibold text-sm"
      >
        {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
        {isPublishing ? 'Publishing...' : 'Publish Widget'}
      </button>
    </div>
  );
}
