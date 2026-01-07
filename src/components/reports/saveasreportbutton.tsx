import { useState, KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { createWidgetReport } from '../../services/report';
import type { ReportExecutionParams } from '../../types/report';
import { Save, X, Loader2 } from 'lucide-react';

interface SaveAsReportButtonProps {
  widgetId: string;
  widgetName: string;
  executionParams: ReportExecutionParams;
}

export function SaveAsReportButton({
  widgetId,
  widgetName,
  executionParams,
}: SaveAsReportButtonProps) {
  const navigate = useNavigate();
  const { user, effectiveCustomerId } = useAuth();

  const [mode, setMode] = useState<'button' | 'input'>('button');
  const [reportName, setReportName] = useState(widgetName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!user || !effectiveCustomerId) {
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
      const newReport = await createWidgetReport(
        widgetId,
        trimmedName,
        executionParams,
        user.id,
        String(effectiveCustomerId)
      );

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

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSave();
    else if (e.key === 'Escape') handleCancel();
  };

  if (mode === 'button') {
    return (
      <button
        onClick={() => setMode('input')}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
      >
        <Save className="w-4 h-4" />
        Save as Report
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={reportName}
        onChange={(e) => setReportName(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Report name"
        className="px-3 py-2 border border-charcoal-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
        autoFocus
        disabled={saving}
      />
      <button
        onClick={handleSave}
        disabled={saving || !reportName.trim()}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
      >
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </>
        ) : (
          'Save'
        )}
      </button>
      <button
        onClick={handleCancel}
        disabled={saving}
        className="p-2 text-charcoal-500 hover:text-charcoal-700 hover:bg-charcoal-100 rounded-lg disabled:opacity-50 transition-colors"
        title="Cancel"
      >
        <X className="w-4 h-4" />
      </button>
      {error && <span className="text-red-600 text-sm">{error}</span>}
    </div>
  );
}
