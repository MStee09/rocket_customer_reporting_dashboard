import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { AIReportWidget } from './AIReportWidget';
import { AIReportWidgetConfig } from '../ai-studio';

interface AIReportsSectionProps {
  aiWidgets: AIReportWidgetConfig[];
  customerId: string | undefined;
  isAdmin: boolean;
  onRemoveWidget: (index: number) => void;
}

export function AIReportsSection({
  aiWidgets,
  customerId,
  isAdmin,
  onRemoveWidget,
}: AIReportsSectionProps) {
  const navigate = useNavigate();

  if (aiWidgets.length === 0) return null;

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-rocket-600" />
          <h2 className="text-lg font-semibold text-slate-800">AI Reports</h2>
        </div>
        <button
          onClick={() => navigate('/ai-studio')}
          className="text-sm text-rocket-600 hover:text-rocket-700"
        >
          Create New Report
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {aiWidgets.map((widget, index) => (
          <AIReportWidget
            key={`${widget.reportId}-${index}`}
            config={widget}
            customerId={customerId}
            isAdmin={isAdmin}
            onRemove={() => onRemoveWidget(index)}
          />
        ))}
      </div>
    </div>
  );
}
