import { FileText } from 'lucide-react';
import { ShipmentNote } from './types';
import { EmptyState } from './helpers';

interface NotesTabProps {
  notes: ShipmentNote[];
}

export function NotesTab({ notes }: NotesTabProps) {
  if (!notes?.length) {
    return <EmptyState icon={FileText} message="No notes on this shipment" />;
  }

  return (
    <div className="p-6 space-y-4">
      {notes.map((note) => (
        <div key={note.shipment_note_id} className="border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${
                  note.is_internal
                    ? 'bg-slate-100 text-slate-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {note.note_type || (note.is_internal ? 'Internal' : 'External')}
              </span>
              {note.is_visible_to_carrier && (
                <span className="px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-700">
                  Visible to Carrier
                </span>
              )}
              {note.is_visible_to_customer && (
                <span className="px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-700">
                  Visible to Customer
                </span>
              )}
            </div>
            <span className="text-xs text-slate-500">
              {note.created_date
                ? new Date(note.created_date).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })
                : '—'}
            </span>
          </div>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.note_text}</p>
          {note.created_by && (
            <p className="text-xs text-slate-400 mt-2">By: {note.created_by}</p>
          )}
        </div>
      ))}
    </div>
  );
}
