import { useState } from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';

interface WidgetForDeletion {
  name: string;
  description?: string;
}

interface DeleteWidgetModalProps {
  widget: WidgetForDeletion;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteWidgetModal = ({
  widget,
  onClose,
  onConfirm,
}: DeleteWidgetModalProps) => {
  const [confirmText, setConfirmText] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const expectedText = 'DELETE';

  const isValid = confirmText === expectedText && confirmed;

  const handleConfirm = () => {
    if (isValid) {
      onConfirm();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">Delete Widget</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm font-medium text-red-900 mb-1">
              Warning: This action cannot be undone
            </p>
            <p className="text-sm text-red-700">
              You are about to permanently delete this widget. This will remove it from storage and it cannot be recovered.
            </p>
          </div>

          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <p className="text-sm font-medium text-slate-700 mb-1">Widget to delete:</p>
            <p className="text-base font-semibold text-slate-900">{widget.name}</p>
            {widget.description && (
              <p className="text-sm text-slate-600 mt-1">{widget.description}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Type <span className="font-mono font-bold text-red-600">DELETE</span> to confirm:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE here"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono"
              autoFocus
            />
            {confirmText && confirmText !== expectedText && (
              <p className="mt-1 text-sm text-red-600">
                Please type exactly: DELETE
              </p>
            )}
          </div>

          <label className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100 transition">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500"
            />
            <span className="text-sm text-slate-700">
              I understand that this action is permanent and the widget cannot be recovered after deletion.
            </span>
          </label>
        </div>

        <div className="px-6 py-4 border-t bg-slate-50 flex items-center justify-end gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 hover:bg-white rounded-lg border border-slate-200 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isValid}
            className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
              isValid
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            Delete Widget
          </button>
        </div>
      </div>
    </div>
  );
};
