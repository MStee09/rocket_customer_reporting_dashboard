import { Truck, Building, User, Calendar, Globe } from 'lucide-react';
import { ShipmentCarrier, Carrier } from './types';
import { EmptyState, InfoRow, DateRow } from './helpers';

interface CarrierTabProps {
  carrierAssignment: ShipmentCarrier | null;
  rateCarrier: Carrier | null;
  showFinancials?: boolean;
}

export function CarrierTab({ carrierAssignment, rateCarrier, showFinancials = false }: CarrierTabProps) {
  if (!carrierAssignment && !rateCarrier) {
    return <EmptyState icon={Truck} message="No carrier assigned" />;
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {rateCarrier && (
          <div className="border border-slate-200 rounded-lg p-4">
            <h3 className="font-semibold flex items-center gap-2 mb-4 text-slate-800">
              <Building className="w-5 h-5 text-blue-600" />
              Rate Carrier
            </h3>
            <div className="space-y-3 text-sm">
              <InfoRow label="Carrier Name" value={rateCarrier.carrier_name} />
              <InfoRow label="SCAC" value={rateCarrier.scac} />
              <InfoRow label="MC Number" value={rateCarrier.mc_number} />
              <InfoRow label="DOT Number" value={rateCarrier.dot_number} />
              <InfoRow label="Account #" value={rateCarrier.account_number} />
              {rateCarrier.website && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Website</span>
                  <a
                    href={rateCarrier.website.startsWith('http') ? rateCarrier.website : `https://${rateCarrier.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-blue-600 hover:underline flex items-center gap-1"
                  >
                    {rateCarrier.website}
                    <Globe className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {carrierAssignment && (
          <div className="border border-slate-200 rounded-lg p-4">
            <h3 className="font-semibold flex items-center gap-2 mb-4 text-slate-800">
              <Truck className="w-5 h-5 text-blue-600" />
              Assignment Details
            </h3>
            <div className="space-y-3 text-sm">
              {carrierAssignment.carrier_name && (
                <InfoRow label="Carrier Name" value={carrierAssignment.carrier_name} />
              )}
              <InfoRow label="SCAC" value={carrierAssignment.carrier_scac} />
              <InfoRow label="PRO Number" value={carrierAssignment.pro_number} />
              <InfoRow label="Assignment Status" value={carrierAssignment.assignment_status} />
              <InfoRow label="Assignment Type" value={carrierAssignment.assignment_type} />
              {showFinancials && carrierAssignment.carrier_pay !== null && carrierAssignment.carrier_pay !== undefined && (
                <InfoRow label="Carrier Pay" value={`$${carrierAssignment.carrier_pay.toLocaleString()}`} />
              )}
            </div>
          </div>
        )}

        {carrierAssignment && (
          <div className="border border-slate-200 rounded-lg p-4">
            <h3 className="font-semibold flex items-center gap-2 mb-4 text-slate-800">
              <User className="w-5 h-5 text-blue-600" />
              Driver Information
            </h3>
            <div className="space-y-3 text-sm">
              <InfoRow label="Driver Name" value={carrierAssignment.driver_name} />
              <InfoRow label="Driver Phone" value={carrierAssignment.driver_phone} />
              <InfoRow label="Truck #" value={carrierAssignment.truck_number} />
              <InfoRow label="Trailer #" value={carrierAssignment.trailer_number} />
            </div>
          </div>
        )}

        {carrierAssignment && (
          <div className="border border-slate-200 rounded-lg p-4">
            <h3 className="font-semibold flex items-center gap-2 mb-4 text-slate-800">
              <Calendar className="w-5 h-5 text-blue-600" />
              Assignment Dates
            </h3>
            <div className="space-y-3 text-sm">
              <DateRow label="Assigned" value={carrierAssignment.assigned_date} />
              <DateRow label="Accepted" value={carrierAssignment.accepted_date} />
              <DateRow label="Declined" value={carrierAssignment.declined_date} />
            </div>
          </div>
        )}

        {(carrierAssignment?.notes || rateCarrier?.notes) && (
          <div className="border border-slate-200 rounded-lg p-4 md:col-span-2">
            <h3 className="font-semibold mb-2 text-slate-800">Notes</h3>
            {carrierAssignment?.notes && (
              <div className="mb-2">
                <p className="text-xs text-slate-500 uppercase mb-1">Assignment Notes</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{carrierAssignment.notes}</p>
              </div>
            )}
            {rateCarrier?.notes && (
              <div>
                <p className="text-xs text-slate-500 uppercase mb-1">Carrier Notes</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{rateCarrier.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
