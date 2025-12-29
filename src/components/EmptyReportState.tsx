import { FileText, Sparkles } from 'lucide-react';

interface EmptyReportStateProps {
  onBuildReport?: () => void;
  onDescribeWithAI?: () => void;
}

export function EmptyReportState({ onBuildReport, onDescribeWithAI }: EmptyReportStateProps) {
  const handleBuildReport = () => {
    if (onBuildReport) {
      onBuildReport();
    } else {
      alert('Report builder coming soon! This feature will allow you to create custom reports with a visual builder.');
    }
  };

  const handleDescribeWithAI = () => {
    if (onDescribeWithAI) {
      onDescribeWithAI();
    } else {
      alert('AI report assistant coming soon! Describe what you want to see and AI will create the report for you.');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-12 text-center">
      <div className="w-20 h-20 bg-rocket-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <FileText className="w-10 h-10 text-rocket-600" />
      </div>

      <h3 className="text-2xl font-bold text-slate-800 mb-3">
        No custom reports yet
      </h3>

      <p className="text-slate-600 mb-8 max-w-md mx-auto">
        Create your first report using the builder or describe what you want to see and let AI help you build it
      </p>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={handleBuildReport}
          className="px-6 py-3 bg-rocket-600 hover:bg-rocket-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <FileText className="w-5 h-5" />
          Build Report
        </button>

        <button
          onClick={handleDescribeWithAI}
          className="px-6 py-3 bg-gradient-to-r from-rocket-500 to-rocket-600 hover:from-rocket-600 hover:to-rocket-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Sparkles className="w-5 h-5" />
          Describe with AI
        </button>
      </div>
    </div>
  );
}
