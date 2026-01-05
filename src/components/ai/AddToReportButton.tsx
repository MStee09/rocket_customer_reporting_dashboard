import { useState } from 'react';
import { Plus, Check } from 'lucide-react';

interface AddToReportButtonProps {
  insight: {
    text?: string;
    title?: string;
    type?: string;
    data?: Record<string, unknown>;
  };
  onAdd: (insight: AddToReportButtonProps['insight']) => void;
  disabled?: boolean;
}

export function AddToReportButton({ insight, onAdd, disabled }: AddToReportButtonProps) {
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    onAdd(insight);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <button
      onClick={handleAdd}
      disabled={disabled || added}
      className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
        added
          ? 'bg-green-100 text-green-700'
          : 'bg-gray-100 text-gray-600 hover:bg-orange-100 hover:text-orange-700'
      }`}
      title="Add to report"
    >
      {added ? (
        <>
          <Check className="w-3 h-3" />
          Added
        </>
      ) : (
        <>
          <Plus className="w-3 h-3" />
          Add to Report
        </>
      )}
    </button>
  );
}
