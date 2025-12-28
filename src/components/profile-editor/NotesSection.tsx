import { useState, useEffect } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { updateAccountNotes } from '../../services/customerIntelligenceService';
import type { CustomerIntelligenceProfile } from '../../types/customerIntelligence';

interface NotesSectionProps {
  customerId: number;
  notes: string | undefined;
  onUpdate: (profile: CustomerIntelligenceProfile) => void;
}

export function NotesSection({ customerId, notes, onUpdate }: NotesSectionProps) {
  const { user } = useAuth();
  const [currentNotes, setCurrentNotes] = useState(notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setCurrentNotes(notes || '');
    setHasChanges(false);
  }, [notes]);

  const handleChange = (value: string) => {
    setCurrentNotes(value);
    setHasChanges(value !== (notes || ''));
  };

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const updated = await updateAccountNotes(customerId, currentNotes, user.id, user.email || 'unknown');
      onUpdate(updated);
      setHasChanges(false);
    } catch (err) {
      console.error('Error updating account notes:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <textarea
        value={currentNotes}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Add notes about this customer, their business context, special requirements, or anything else the AI should know when generating reports..."
        rows={5}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
      />
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          These notes will be included as context when the AI generates reports for this customer.
        </p>
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Notes
          </button>
        )}
      </div>
    </div>
  );
}

export default NotesSection;
