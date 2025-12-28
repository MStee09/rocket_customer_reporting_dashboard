import { ShipmentData, ShipmentDetail } from './types';
import { Flag } from './helpers';

interface HistoryTabProps {
  shipment: ShipmentData | null;
  detail: ShipmentDetail | null;
}

interface TimelineEvent {
  label: string;
  date: string | null;
  by: string | null;
}

export function HistoryTab({ shipment, detail }: HistoryTabProps) {
  const events: TimelineEvent[] = [
    { label: 'Created', date: shipment?.created_date ?? null, by: shipment?.created_by ?? null },
    { label: 'Quoted', date: detail?.quoted_date ?? null, by: detail?.quoted_by ?? null },
    { label: 'Booked', date: detail?.booked_date ?? null, by: detail?.booked_by ?? null },
    { label: 'Dispatched', date: detail?.dispatch_date ?? null, by: detail?.dispatched_by ?? null },
    { label: 'Delivered', date: detail?.delivered_date ?? null, by: detail?.delivered_by ?? null },
    { label: 'Last Modified', date: shipment?.modified_date ?? null, by: shipment?.modified_by ?? null },
  ].filter((e) => e.date);

  return (
    <div className="p-6">
      {events.length === 0 ? (
        <p className="text-sm text-slate-500">No history events recorded</p>
      ) : (
        <div className="relative">
          {events.map((event, i) => (
            <div key={i} className="flex gap-4 pb-6 last:pb-0">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-blue-600 shrink-0" />
                {i < events.length - 1 && (
                  <div className="w-0.5 flex-1 bg-slate-200 mt-1" />
                )}
              </div>

              <div className="flex-1 -mt-1">
                <p className="font-medium text-slate-800">{event.label}</p>
                <p className="text-sm text-slate-500">
                  {event.date
                    ? new Date(event.date).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })
                    : '—'}
                  {event.by && ` • ${event.by}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {detail && (
        <div className="mt-6 pt-6 border-t border-slate-200">
          <h3 className="font-semibold mb-3 text-slate-800">Status Flags</h3>
          <div className="flex flex-wrap gap-2">
            {detail.needs_follow_up && <Flag label="Needs Follow Up" color="yellow" />}
            {detail.ready_to_invoice && <Flag label="Ready to Invoice" color="green" />}
            {detail.has_edi_dispatched && <Flag label="EDI Dispatched" color="blue" />}
            {!detail.needs_follow_up && !detail.ready_to_invoice && !detail.has_edi_dispatched && (
              <span className="text-sm text-slate-500">No flags set</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
