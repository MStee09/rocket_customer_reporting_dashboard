import { Lightbulb } from 'lucide-react';

interface SmartScheduleHintsProps {
  currentFrequency: string;
  currentDateRange: string;
  suggestedDateRange: { range: string; reason: string };
  onApplySuggestion: (suggestion: { dateRange?: string; frequency?: string }) => void;
}

const DATE_RANGE_LABELS: Record<string, string> = {
  rolling: 'Rolling 7 Days',
  previous_week: 'Previous Week',
  previous_month: 'Previous Month',
  previous_quarter: 'Previous Quarter',
  mtd: 'Month to Date',
  ytd: 'Year to Date',
  report_default: 'Report Default',
};

export function SmartScheduleHints({
  currentDateRange,
  suggestedDateRange,
  onApplySuggestion
}: SmartScheduleHintsProps) {
  const showSuggestion = currentDateRange !== suggestedDateRange.range
    && currentDateRange !== 'report_default';

  if (!showSuggestion) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-800">Suggestion</p>
          <p className="text-xs text-amber-700 mt-0.5">
            {suggestedDateRange.reason}
          </p>
          <button
            onClick={() => onApplySuggestion({ dateRange: suggestedDateRange.range })}
            className="mt-2 text-xs font-medium text-amber-600 hover:text-amber-800 underline underline-offset-2"
          >
            Use "{DATE_RANGE_LABELS[suggestedDateRange.range]}" instead
          </button>
        </div>
      </div>
    </div>
  );
}
