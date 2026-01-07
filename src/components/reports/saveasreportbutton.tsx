// src/components/SaveAsReportButton.tsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { ReportExecutionParams } from '@/types/report';

interface SaveAsReportButtonProps {
  widgetId: string;
  widgetName: string;
  executionParams: ReportExecutionParams;
}

/**
 * Button that saves the current widget view as a report.
 * Creates a widget-backed report with frozen execution params.
 */
export function SaveAsReportButton({
  widgetId,
  widgetName,
  executionParams,
}: SaveAsReportButtonProps) {
  const navigate = useNavigate();
  const { user, customerId } = useAuth();

  const [mode, setMode] = useState<'button' | 'input'>('button');
  const [reportName, setReportName] = useState(widgetName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!user || !customerId) {
      setError('You must be logged in to save reports');
      return;
    }

    const trimmedName = reportName.trim();
    if (!trimmedName) {
      setError('Please enter a report name');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { data: newReport, error: insertError } = await supabase
        .from('reports')
        .insert({
          name: trimmedName,
          source_type: 'widget',
          source_widget_id: widgetId,
          execution_params: executionParams,
          query_definition: null, // Not used for widget-backed reports
          visibility: 'saved',
          owner_id: user.id,
          customer_id: customerId,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Navigate to the new report
      navigate(`/reports/${newReport.id}`, {
        state: { toast: { type: 'success', message: 'Report saved!' } },
      });
    } catch (err) {
      console.error('Failed to save report:', err);
      setError(err instanceof Error ? err.message : 'Failed to save report');
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setMode('button');
    setReportName(widgetName);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSave();
    else if (e.key === 'Escape') handleCancel();
  };

  // Initial button state
  if (mode === 'button') {
    return (
      <button
        onClick={() => setMode('input')}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
      >
        Save as Report
      </button>
    );
  }

  // Input state for naming the report
  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={reportName}
        onChange={(e) => setReportName(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Report name"
        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        autoFocus
        disabled={saving}
      />
      <button
        onClick={handleSave}
        disabled={saving || !reportName.trim()}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
      >
        {saving ? 'Saving...' : 'Save'}
      </button>
      <button
        onClick={handleCancel}
        disabled={saving}
        className="px-3 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
      >
        Cancel
      </button>
      {error && <span className="text-red-600 text-sm ml-2">{error}</span>}
    </div>
  );
}
