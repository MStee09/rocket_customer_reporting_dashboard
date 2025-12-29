import { Calendar, Package, MapPin, Building, Truck, Hash, DollarSign } from 'lucide-react';
import { ShipmentFullData } from './types';
import { InfoRow, DateRow } from './helpers';

interface OverviewTabProps {
  data: ShipmentFullData;
  showFinancials?: boolean;
}

export function OverviewTab({ data, showFinancials = false }: OverviewTabProps) {
  const sortedAddresses = [...(data.addresses || [])].sort(
    (a, b) => (a.stop_number || 0) - (b.stop_number || 0)
  );

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return null;
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="border border-slate-200 rounded-lg p-4">
        <h3 className="font-semibold flex items-center gap-2 mb-4 text-slate-800">
          <Calendar className="w-5 h-5 text-rocket-600" />
          Key Dates
        </h3>
        <div className="space-y-3 text-sm">
          <DateRow label="Pickup Date" value={data.shipment?.pickup_date} />
          <DateRow label="Delivery Date" value={data.shipment?.delivery_date} />
          <DateRow label="Expected Delivery" value={data.shipment?.expected_delivery_date} />
          <DateRow label="Estimated Delivery" value={data.shipment?.estimated_delivery_date} />
          <DateRow label="Requested On Dock" value={data.shipment?.requested_on_dock_date} />
        </div>
      </div>

      <div className="border border-slate-200 rounded-lg p-4">
        <h3 className="font-semibold flex items-center gap-2 mb-4 text-slate-800">
          <DollarSign className="w-5 h-5 text-emerald-600" />
          Financial Summary
        </h3>
        <div className="space-y-3 text-sm">
          <InfoRow label="Retail" value={formatCurrency(data.shipment?.retail)} />
          {showFinancials && (
            <>
              <InfoRow label="Cost" value={formatCurrency(data.shipment?.cost)} />
              <InfoRow label="Target Rate" value={formatCurrency(data.shipment?.target_rate)} />
              {data.shipment?.retail !== undefined && data.shipment?.cost !== undefined && (
                <div className="flex justify-between pt-2 border-t border-slate-100">
                  <span className="text-slate-500 font-medium">Margin</span>
                  <span className={`font-semibold ${
                    (data.shipment.retail || 0) - (data.shipment.cost || 0) >= 0
                      ? 'text-emerald-600'
                      : 'text-red-600'
                  }`}>
                    {formatCurrency((data.shipment.retail || 0) - (data.shipment.cost || 0))}
                  </span>
                </div>
              )}
            </>
          )}
          <InfoRow label="Shipment Value" value={formatCurrency(data.shipment?.shipment_value)} />
        </div>
      </div>

      <div className="border border-slate-200 rounded-lg p-4">
        <h3 className="font-semibold flex items-center gap-2 mb-4 text-slate-800">
          <Package className="w-5 h-5 text-rocket-600" />
          Shipment Info
        </h3>
        <div className="space-y-3 text-sm">
          <InfoRow label="Mode" value={data.mode?.mode_name} />
          <InfoRow label="Equipment" value={data.equipmentType?.equipment_name} />
          <InfoRow label="Miles" value={data.shipment?.miles?.toLocaleString()} />
          <InfoRow label="Pallets" value={data.shipment?.number_of_pallets} />
          <InfoRow label="Linear Feet" value={data.shipment?.linear_feet} />
          <InfoRow label="Stackable" value={data.shipment?.is_stackable ? 'Yes' : 'No'} />
          <InfoRow label="Palletized" value={data.shipment?.is_palletized ? 'Yes' : 'No'} />
          <InfoRow label="Priority" value={data.shipment?.priority} />
        </div>
      </div>

      <div className="border border-slate-200 rounded-lg p-4">
        <h3 className="font-semibold flex items-center gap-2 mb-4 text-slate-800">
          <Building className="w-5 h-5 text-rocket-600" />
          Customer
        </h3>
        <div className="space-y-3 text-sm">
          <InfoRow label="Company" value={data.customer?.company_name} />
          <InfoRow label="Customer ID" value={data.customer?.customer_id} />
          <InfoRow label="External ID" value={data.customer?.external_customer_id} />
          <InfoRow label="Status" value={data.customer?.is_active ? 'Active' : 'Inactive'} />
          {data.customer?.is_on_hold && (
            <div className="flex justify-between">
              <span className="text-slate-500">Hold Status</span>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded">
                On Hold
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="border border-slate-200 rounded-lg p-4">
        <h3 className="font-semibold flex items-center gap-2 mb-4 text-slate-800">
          <Truck className="w-5 h-5 text-rocket-600" />
          Carrier
        </h3>
        <div className="space-y-3 text-sm">
          <InfoRow label="Carrier Name" value={data.rateCarrier?.carrier_name} />
          <InfoRow label="SCAC" value={data.rateCarrier?.scac} />
          <InfoRow label="MC Number" value={data.rateCarrier?.mc_number} />
          <InfoRow label="DOT Number" value={data.rateCarrier?.dot_number} />
          {data.carrierAssignment && (
            <>
              <InfoRow label="PRO Number" value={data.carrierAssignment.pro_number} />
              <InfoRow label="Driver" value={data.carrierAssignment.driver_name} />
            </>
          )}
        </div>
      </div>

      <div className="border border-slate-200 rounded-lg p-4">
        <h3 className="font-semibold flex items-center gap-2 mb-4 text-slate-800">
          <Hash className="w-5 h-5 text-rocket-600" />
          Reference Numbers
        </h3>
        <div className="space-y-3 text-sm">
          <InfoRow label="BOL Number" value={data.shipment?.bol_number} />
          <InfoRow label="PO Reference" value={data.shipment?.po_reference} />
          <InfoRow label="Reference #" value={data.shipment?.reference_number} />
          <InfoRow label="Shipper #" value={data.shipment?.shipper_number} />
          <InfoRow label="Pickup #" value={data.shipment?.pickup_number} />
          <InfoRow label="Quote #" value={data.shipment?.quote_number} />
          <InfoRow label="Client Load ID" value={data.shipment?.client_load_id} />
        </div>
      </div>

      <div className="border border-slate-200 rounded-lg p-4">
        <h3 className="font-semibold flex items-center gap-2 mb-4 text-slate-800">
          Status
        </h3>
        <div className="space-y-3 text-sm">
          <InfoRow label="Status" value={data.status?.status_name} />
          <InfoRow label="Status Code" value={data.shipment?.status_code} />
          <InfoRow
            label="Description"
            value={data.shipment?.status_description || data.status?.status_description}
          />
        </div>
      </div>

      <div className="md:col-span-2 border border-slate-200 rounded-lg p-4">
        <h3 className="font-semibold flex items-center gap-2 mb-4 text-slate-800">
          <MapPin className="w-5 h-5 text-red-500" />
          Route & Stops
        </h3>
        {sortedAddresses.length === 0 ? (
          <p className="text-sm text-slate-500">No stops defined</p>
        ) : (
          <div className="space-y-4">
            {sortedAddresses.map((addr) => (
              <div key={addr.shipment_address_id} className="flex items-start gap-3">
                <div
                  className={`px-2 py-1 rounded text-xs font-medium shrink-0 ${
                    addr.address_type === 1 || addr.address_type === 'origin' || addr.address_type === 'pickup'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-rocket-100 text-rocket-700'
                  }`}
                >
                  {addr.address_type === 1 || addr.address_type === 'origin' || addr.address_type === 'pickup'
                    ? 'Shipper'
                    : 'Consignee'}
                </div>
                <div>
                  <p className="font-medium text-slate-800">
                    {addr.company_name || addr.contact_name || 'Unknown'}
                  </p>
                  <p className="text-sm text-slate-600">
                    {addr.city}, {addr.state} {addr.postal_code}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
