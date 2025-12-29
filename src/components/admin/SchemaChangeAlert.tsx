import { useState, useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SchemaChange {
  change_type: string;
  column_name: string;
  details: string;
}

export function SchemaChangeAlert() {
  const [changes, setChanges] = useState<SchemaChange[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    checkChanges();
  }, []);

  async function checkChanges() {
    try {
      const { data } = await supabase.rpc('detect_schema_changes');
      if (data && data.length > 0) {
        setChanges(data);
      }
    } catch (e) {
      console.error('Failed to check schema changes:', e);
    }
  }

  async function acknowledgeChanges() {
    await supabase.rpc('refresh_schema_metadata');
    setDismissed(true);
  }

  if (dismissed || changes.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-amber-800">Schema Changes Detected</h4>
          <p className="text-sm text-amber-700 mt-1">
            The database schema has changed. The AI will automatically use new fields after you refresh.
          </p>
          <ul className="mt-2 space-y-1">
            {changes.map((c, i) => (
              <li key={i} className="text-sm text-amber-600 flex items-center gap-2">
                {c.change_type === 'new_column' ? (
                  <span className="text-green-600">+ {c.column_name}</span>
                ) : (
                  <span className="text-red-600">- {c.column_name}</span>
                )}
              </li>
            ))}
          </ul>
          <button
            onClick={acknowledgeChanges}
            className="mt-3 px-3 py-1.5 bg-amber-600 text-white text-sm rounded hover:bg-amber-700"
          >
            Refresh Schema
          </button>
        </div>
        <button onClick={() => setDismissed(true)} className="text-amber-400 hover:text-amber-600">
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default SchemaChangeAlert;
