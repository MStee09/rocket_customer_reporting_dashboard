import { useState } from 'react';
import { Calendar, X, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SchedulePromptBannerProps {
  reportType: 'ai' | 'custom';
  reportId?: string;
  reportName?: string;
  onDismiss: () => void;
  onSchedule?: () => void;
}

export function SchedulePromptBanner({
  reportType,
  reportId,
  reportName,
  onDismiss,
  onSchedule
}: SchedulePromptBannerProps) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleSchedule = () => {
    if (onSchedule) {
      onSchedule();
    } else {
      navigate('/scheduled-reports', {
        state: {
          createNew: true,
          reportType,
          reportId,
          reportName
        }
      });
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss();
    sessionStorage.setItem('hideSchedulePrompt', 'true');
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h4 className="font-medium text-blue-900">Want this report regularly?</h4>
            <p className="text-sm text-blue-700 mt-1">
              Schedule this report to run automatically and receive it via email.
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-blue-400 hover:text-blue-600"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center gap-3 mt-4 ml-12">
        <button
          onClick={handleSchedule}
          className="flex items-center gap-2 px-4 py-2 bg-rocket-600 text-white text-sm font-medium rounded-lg hover:bg-rocket-700 transition-colors"
        >
          <Calendar className="w-4 h-4" />
          Schedule Report
        </button>
        <button
          onClick={handleDismiss}
          className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
        >
          Maybe Later
        </button>
      </div>
    </div>
  );
}
