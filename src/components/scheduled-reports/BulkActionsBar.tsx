import { PlayCircle, PauseCircle, Trash2, X } from 'lucide-react';

interface BulkActionsBarProps {
  selectedCount: number;
  onPause: () => void;
  onResume: () => void;
  onDelete: () => void;
  onClear: () => void;
}

export function BulkActionsBar({
  selectedCount,
  onPause,
  onResume,
  onDelete,
  onClear,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-6 z-50">
      <span className="font-medium">{selectedCount} selected</span>

      <button
        onClick={onPause}
        className="flex items-center gap-1.5 hover:text-yellow-400 transition-colors"
      >
        <PauseCircle className="h-4 w-4" />
        Pause
      </button>

      <button
        onClick={onResume}
        className="flex items-center gap-1.5 hover:text-green-400 transition-colors"
      >
        <PlayCircle className="h-4 w-4" />
        Resume
      </button>

      <button
        onClick={onDelete}
        className="flex items-center gap-1.5 hover:text-red-400 transition-colors"
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </button>

      <div className="w-px h-6 bg-gray-600" />

      <button
        onClick={onClear}
        className="flex items-center gap-1.5 hover:text-gray-400 transition-colors"
      >
        <X className="h-4 w-4" />
        Clear
      </button>
    </div>
  );
}
