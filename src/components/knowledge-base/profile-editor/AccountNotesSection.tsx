import { useState, useEffect } from 'react';
import { Pencil, Save, X, Loader2, FileText } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { updateAccountNotes } from '../../../services/customerIntelligenceService';

interface AccountNotesSectionProps {
  notes: string | undefined;
  customerId: number;
  onUpdate: () => void;
}

export function AccountNotesSection({ notes, customerId, onUpdate }: AccountNotesSectionProps) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [currentNotes, setCurrentNotes] = useState(notes || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setCurrentNotes(notes || '');
  }, [notes]);

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      await updateAccountNotes(customerId, currentNotes.trim(), user.id, user.email || 'unknown');
      onUpdate();
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating account notes:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setCurrentNotes(notes || '');
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="space-y-3">
        <textarea
          value={currentNotes}
          onChange={(e) => setCurrentNotes(e.target.value)}
          placeholder="Add notes about this customer, their business context, special requirements, or anything else the AI should know when generating reports..."
          rows={6}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rocket-500 focus:border-blue-500 resize-none text-sm"
          autoFocus
        />
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="flex items-center gap-1 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1 px-4 py-2 bg-rocket-600 text-white rounded-lg hover:bg-rocket-700 disabled:opacity-50 transition-colors text-sm font-medium"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </div>
      </div>
    );
  }

  if (!notes) {
    return (
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
            <FileText className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-gray-500 italic">No notes yet</p>
        </div>
        <button
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
        >
          <Pencil className="w-4 h-4" />
          Add Notes
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{notes}</p>
      </div>
      <div className="flex items-center justify-end">
        <button
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
        >
          <Pencil className="w-4 h-4" />
          Edit
        </button>
      </div>
    </div>
  );
}

export default AccountNotesSection;
