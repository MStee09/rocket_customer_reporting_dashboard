import { FileText, Info } from 'lucide-react';
import { ReportBuilderState } from '../../types/reports';

interface BasicInformationStepProps {
  state: ReportBuilderState;
  updateState: (updates: Partial<ReportBuilderState>) => void;
}

export function BasicInformationStep({ state, updateState }: BasicInformationStepProps) {
  const MAX_NAME_LENGTH = 100;
  const MAX_DESCRIPTION_LENGTH = 500;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-100 rounded-lg">
          <FileText className="w-8 h-8 text-blue-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-800">Report Information</h3>
          <p className="text-slate-600">Give your report a clear name and description</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex gap-2">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">Tips for naming your report:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>Be specific and descriptive (e.g., "Monthly Carrier Cost Analysis")</li>
              <li>Include the time period or scope if relevant</li>
              <li>Use clear business terms your team will understand</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Report Name <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={state.name}
            onChange={(e) => updateState({ name: e.target.value })}
            maxLength={MAX_NAME_LENGTH}
            placeholder="e.g., Monthly Carrier Performance Dashboard"
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rocket-500 focus:border-transparent"
          />
          <div className="flex justify-between items-center mt-1">
            <p className="text-xs text-slate-500">
              {state.name.length > 0 ? (
                state.name.trim().length === 0 ? (
                  <span className="text-red-600">Name cannot be empty</span>
                ) : (
                  <span className="text-green-600">Looks good!</span>
                )
              ) : (
                'Required field'
              )}
            </p>
            <p className="text-xs text-slate-500">
              {state.name.length} / {MAX_NAME_LENGTH}
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Description <span className="text-red-600">*</span>
          </label>
          <textarea
            value={state.description}
            onChange={(e) => updateState({ description: e.target.value })}
            maxLength={MAX_DESCRIPTION_LENGTH}
            rows={4}
            placeholder="Describe what this report shows and who should use it..."
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rocket-500 focus:border-transparent resize-none"
          />
          <div className="flex justify-between items-center mt-1">
            <p className="text-xs text-slate-500">
              {state.description.length > 0 ? (
                state.description.trim().length === 0 ? (
                  <span className="text-red-600">Description cannot be empty</span>
                ) : (
                  <span className="text-green-600">Looks good!</span>
                )
              ) : (
                'Required field'
              )}
            </p>
            <p className="text-xs text-slate-500">
              {state.description.length} / {MAX_DESCRIPTION_LENGTH}
            </p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <h4 className="font-medium text-slate-800 mb-3">Examples:</h4>
          <div className="space-y-3">
            <div className="bg-white p-3 rounded border border-slate-200">
              <p className="font-medium text-sm text-slate-800">Average Cost Per Unit by Category</p>
              <p className="text-xs text-slate-600 mt-1">
                Track shipping costs per product category to identify optimization opportunities and cost trends over time.
              </p>
            </div>
            <div className="bg-white p-3 rounded border border-slate-200">
              <p className="font-medium text-sm text-slate-800">Carrier Performance Scorecard</p>
              <p className="text-xs text-slate-600 mt-1">
                Compare on-time delivery rates, cost efficiency, and service quality across all carriers for the past quarter.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
