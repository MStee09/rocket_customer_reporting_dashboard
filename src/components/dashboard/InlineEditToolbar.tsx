import { Check, X, Plus, RotateCcw, Layout } from 'lucide-react';

interface InlineEditToolbarProps {
  isEditing: boolean;
  hasChanges: boolean;
  onEnterEdit: () => void;
  onExitEdit: () => void;
  onSave: () => void;
  onReset: () => void;
  onAddWidget: () => void;
}

export function InlineEditToolbar({
  isEditing,
  hasChanges,
  onEnterEdit,
  onExitEdit,
  onSave,
  onReset,
  onAddWidget,
}: InlineEditToolbarProps) {
  if (!isEditing) {
    return (
      <button
        onClick={onEnterEdit}
        className="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-2 shadow-sm transition-colors text-sm"
      >
        <Layout className="w-4 h-4" />
        Customize
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-xl">
      <div className="flex items-center gap-2 pr-3 border-r border-orange-200">
        <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-orange-700">Edit Mode</span>
      </div>

      <button
        onClick={onAddWidget}
        className="px-3 py-1.5 text-sm text-orange-600 hover:bg-orange-100 rounded-lg flex items-center gap-1.5 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add
      </button>

      {hasChanges && (
        <button
          onClick={onReset}
          className="px-3 py-1.5 text-sm text-slate-600 hover:bg-orange-100 rounded-lg flex items-center gap-1.5 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
      )}

      <div className="w-px h-6 bg-orange-200" />

      <button
        onClick={onExitEdit}
        className="px-3 py-1.5 text-sm text-slate-600 hover:bg-orange-100 rounded-lg flex items-center gap-1.5 transition-colors"
      >
        <X className="w-4 h-4" />
        Cancel
      </button>

      <button
        onClick={onSave}
        className="px-3 py-1.5 text-sm bg-orange-500 text-white hover:bg-orange-600 rounded-lg flex items-center gap-1.5 transition-colors"
      >
        <Check className="w-4 h-4" />
        Done
      </button>
    </div>
  );
}
