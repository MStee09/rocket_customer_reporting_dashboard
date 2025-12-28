import { useState } from 'react';
import { X, AlertTriangle, Copy, CheckCircle, Users, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CustomWidgetDefinition } from '../../config/widgets/customWidgetTypes';
import { WidgetIcon } from './WidgetIcon';

interface CloneToSystemModalProps {
  widget: CustomWidgetDefinition;
  onClose: () => void;
  onSuccess: (newWidgetId: string) => void;
}

export function CloneToSystemModal({ widget, onClose, onSuccess }: CloneToSystemModalProps) {
  const { user } = useAuth();
  const [name, setName] = useState(widget.name);
  const [description, setDescription] = useState(widget.description);
  const [isCloning, setIsCloning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClone = async () => {
    if (!user) return;

    if (!name.trim()) {
      setError('Widget name is required');
      return;
    }

    setIsCloning(true);
    setError(null);

    try {
      const newWidgetId = `widget_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const timestamp = new Date().toISOString();

      const promotedWidget: CustomWidgetDefinition = {
        ...widget,
        id: newWidgetId,
        name: name.trim(),
        description: description.trim(),
        source: 'promoted' as any,
        createdBy: {
          userId: user.id,
          userEmail: user.email || '',
          isAdmin: true,
          timestamp,
        },
        visibility: {
          type: 'system' as any,
          promotedFrom: {
            originalWidgetId: widget.id,
            originalCreatorId: widget.createdBy.userId,
            originalCreatorEmail: widget.createdBy.userEmail,
            promotedBy: user.id,
            promotedByEmail: user.email || '',
            promotedAt: timestamp,
          },
        } as any,
        createdAt: timestamp,
        updatedAt: timestamp,
        version: 1,
      };

      const path = `system/${newWidgetId}.json`;

      const { error: uploadError } = await supabase.storage
        .from('custom-widgets')
        .upload(path, JSON.stringify(promotedWidget, null, 2), {
          contentType: 'application/json',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      onSuccess(newWidgetId);
    } catch (err) {
      console.error('Failed to clone widget to system:', err);
      setError(err instanceof Error ? err.message : 'Failed to clone widget');
      setIsCloning(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Copy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Clone to System Widget</h2>
              <p className="text-sm text-slate-500">Make this widget available to all customers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            disabled={isCloning}
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Warning Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 mb-1">
                  This will make the widget available to ALL customers
                </h3>
                <p className="text-sm text-amber-800">
                  Once promoted, this widget will appear in the System Widgets library for every customer.
                  They will be able to add it to their dashboards.
                </p>
              </div>
            </div>
          </div>

          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-1">
                  Original widget remains unchanged
                </h3>
                <p className="text-sm text-blue-800">
                  A new copy will be created as a system widget. The customer's original widget will stay
                  in their private collection and won't be modified.
                </p>
              </div>
            </div>
          </div>

          {/* Original Widget Info */}
          <div className="border border-slate-200 rounded-lg p-4">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Original Widget Information
            </h3>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                <WidgetIcon icon={widget.display.icon} className="w-8 h-8 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900">{widget.name}</div>
                  <div className="text-sm text-slate-600 mt-1">{widget.description}</div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                    <span className="px-2 py-0.5 bg-slate-200 rounded">
                      {widget.type}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-200 rounded">
                      {widget.category}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-slate-500">Created by:</span>
                  <div className="font-medium text-slate-900 mt-0.5">
                    {widget.createdBy.userEmail}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Created:</span>
                  <div className="font-medium text-slate-900 mt-0.5">
                    {new Date(widget.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Edit Form */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">System Widget Details</h3>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Widget Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter widget name"
                disabled={isCloning}
              />
              <p className="mt-1 text-xs text-slate-500">
                This name will be displayed in the system widgets library
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Describe what this widget shows"
                disabled={isCloning}
              />
              <p className="mt-1 text-xs text-slate-500">
                Help customers understand what data this widget displays
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 mb-1">Failed to clone widget</h3>
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            disabled={isCloning}
          >
            Cancel
          </button>
          <button
            onClick={handleClone}
            disabled={isCloning || !name.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {isCloning ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Cloning...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Clone to System Widget
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
