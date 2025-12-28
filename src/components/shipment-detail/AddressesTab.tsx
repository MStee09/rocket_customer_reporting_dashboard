import { MapPin } from 'lucide-react';
import { ShipmentAddress } from './types';
import { EmptyState, InfoRow, formatDateTime } from './helpers';

interface AddressesTabProps {
  addresses: ShipmentAddress[];
}

export function AddressesTab({ addresses }: AddressesTabProps) {
  if (!addresses?.length) {
    return <EmptyState icon={MapPin} message="No addresses on this shipment" />;
  }

  const sortedAddresses = [...addresses].sort(
    (a, b) => (a.stop_number || 0) - (b.stop_number || 0)
  );

  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
      {sortedAddresses.map((addr) => (
        <div key={addr.shipment_address_id} className="border border-slate-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${
                addr.address_type === 'origin' || addr.address_type === 'pickup'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              Stop {addr.stop_number} -{' '}
              {addr.address_type === 'origin' || addr.address_type === 'pickup'
                ? 'Pickup'
                : 'Delivery'}
            </span>
            {addr.is_residential && (
              <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded">
                Residential
              </span>
            )}
          </div>

          <h4 className="font-semibold text-lg text-slate-800 mb-2">
            {addr.company_name || '—'}
          </h4>

          <div className="space-y-1 text-sm text-slate-600 mb-4">
            {addr.address_line1 && <p>{addr.address_line1}</p>}
            {addr.address_line2 && <p>{addr.address_line2}</p>}
            <p>
              {addr.city}, {addr.state} {addr.postal_code} {addr.country}
            </p>
          </div>

          {(addr.contact_name || addr.contact_phone || addr.contact_email) && (
            <div className="border-t border-slate-200 pt-3 mt-3">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Contact</p>
              {addr.contact_name && (
                <p className="text-sm font-medium text-slate-800">{addr.contact_name}</p>
              )}
              {addr.contact_phone && <p className="text-sm text-slate-600">{addr.contact_phone}</p>}
              {addr.contact_email && <p className="text-sm text-slate-600">{addr.contact_email}</p>}
            </div>
          )}

          {(addr.appointment_time || addr.arrival_time || addr.departure_time) && (
            <div className="border-t border-slate-200 pt-3 mt-3 grid grid-cols-1 gap-2 text-sm">
              {addr.appointment_time && (
                <InfoRow label="Appointment" value={formatDateTime(addr.appointment_time)} />
              )}
              {addr.arrival_time && (
                <InfoRow label="Arrival" value={formatDateTime(addr.arrival_time)} />
              )}
              {addr.departure_time && (
                <InfoRow label="Departure" value={formatDateTime(addr.departure_time)} />
              )}
            </div>
          )}

          {addr.special_instructions && (
            <div className="border-t border-slate-200 pt-3 mt-3">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                Special Instructions
              </p>
              <p className="text-sm text-slate-700">{addr.special_instructions}</p>
            </div>
          )}

          {addr.reference_number && (
            <div className="border-t border-slate-200 pt-3 mt-3">
              <InfoRow label="Reference #" value={addr.reference_number} />
            </div>
          )}

          {addr.latitude && addr.longitude && (
            <div className="border-t border-slate-200 pt-3 mt-3 text-xs text-slate-500">
              Coordinates: {addr.latitude.toFixed(6)}, {addr.longitude.toFixed(6)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
