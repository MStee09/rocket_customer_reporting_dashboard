import { useState } from 'react';
import { X, Truck, MapPin, Package, Clock, FileText, Copy, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

interface Shipment {
  load_id: number;
  pro_number: string;
  pickup_date: string | null;
  delivery_date: string | null;
  expected_delivery_date: string | null;
  reference_number: string | null;
  bol_number: string | null;
  po_reference: string | null;
  origin_company: string;
  origin_city: string;
  origin_state: string;
  origin_zip: string;
  origin_country: string;
  origin_contact: string;
  origin_phone: string;
  destination_company: string;
  destination_city: string;
  destination_state: string;
  destination_zip: string;
  destination_country: string;
  destination_contact: string;
  destination_phone: string;
  carrier_name: string;
  driver_name: string;
  driver_phone: string;
  truck_number: string;
  trailer_number: string;
  mode_name: string;
  equipment_name: string;
  status: string;
  status_id: number | null;
  status_description: string;
  is_completed: boolean;
  is_cancelled: boolean;
  total_weight: number;
  total_pieces: number;
  total_packages: number;
  number_of_pallets: number;
  linear_feet: number;
  miles: number;
  is_stackable: boolean;
  is_palletized: boolean;
  has_hazmat: boolean;
  item_descriptions: string;
  commodities: string;
  freight_classes: string;
  customer_charge: number;
  shipment_value: number;
  created_date: string | null;
  priority: number;
}

interface ShipmentDetailDrawerProps {
  shipment: Shipment | null;
  isOpen: boolean;
  onClose: () => void;
  onViewDetails: (shipment: Shipment) => void;
  onAskAI?: (shipment: Shipment) => void;
  showFinancials?: boolean;
}

export function ShipmentDetailDrawer({
  shipment,
  isOpen,
  onClose,
  onViewDetails,
  onAskAI,
  showFinancials = false
}: ShipmentDetailDrawerProps) {
  const [copied, setCopied] = useState<string | null>(null);

  if (!isOpen || !shipment) return null;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '—';
    return format(new Date(date), 'MMM d, yyyy');
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
      />

      <div className="fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-xl z-50 overflow-y-auto animate-slide-in-right">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Load #{shipment.load_id}</h2>
              <button
                onClick={() => copyToClipboard(shipment.load_id.toString(), 'load_id')}
                className="p-1 hover:bg-gray-100 rounded"
                title="Copy Load ID"
              >
                <Copy className="w-4 h-4 text-gray-400" />
              </button>
              {copied === 'load_id' && <span className="text-xs text-green-600">Copied!</span>}
            </div>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
              shipment.is_completed ? 'bg-green-100 text-green-800' :
              shipment.is_cancelled ? 'bg-red-100 text-red-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {shipment.is_cancelled ? 'Cancelled' : shipment.is_completed ? 'Completed' : shipment.status}
            </span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">PRO Number</div>
              <div className="font-medium truncate">{shipment.pro_number || '—'}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Reference #</div>
              <div className="font-medium truncate">{shipment.reference_number || '—'}</div>
            </div>
            {showFinancials && (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Customer Charge</div>
                <div className="font-medium text-green-600">{formatCurrency(shipment.customer_charge)}</div>
              </div>
            )}
            {!showFinancials && (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Mode</div>
                <div className="font-medium">{shipment.mode_name || '—'}</div>
              </div>
            )}
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b">
              <h3 className="font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                Route Details
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex gap-4">
                <div className="w-20 text-sm text-gray-500 shrink-0">Shipper</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{shipment.origin_company || 'N/A'}</div>
                  <div className="text-sm text-gray-600">
                    {shipment.origin_city}, {shipment.origin_state} {shipment.origin_zip}
                  </div>
                  {shipment.origin_contact && (
                    <div className="text-sm text-gray-500 mt-1">
                      Contact: {shipment.origin_contact}
                      {shipment.origin_phone && ` | ${shipment.origin_phone}`}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-20"></div>
                <div className="flex-1 flex items-center gap-2 text-gray-400">
                  <div className="h-px flex-1 bg-gray-200"></div>
                  <span className="text-xs">{shipment.miles ? `${shipment.miles.toLocaleString()} mi` : ''}</span>
                  <div className="h-px flex-1 bg-gray-200"></div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-20 text-sm text-gray-500 shrink-0">Consignee</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{shipment.destination_company || 'N/A'}</div>
                  <div className="text-sm text-gray-600">
                    {shipment.destination_city}, {shipment.destination_state} {shipment.destination_zip}
                  </div>
                  {shipment.destination_contact && (
                    <div className="text-sm text-gray-500 mt-1">
                      Contact: {shipment.destination_contact}
                      {shipment.destination_phone && ` | ${shipment.destination_phone}`}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b">
              <h3 className="font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                Dates
              </h3>
            </div>
            <div className="p-4 grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500">Pickup Date</div>
                <div className="font-medium">{formatDate(shipment.pickup_date)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Delivery Date</div>
                <div className="font-medium">{formatDate(shipment.delivery_date)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Expected Delivery</div>
                <div className="font-medium">{formatDate(shipment.expected_delivery_date)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Created</div>
                <div className="font-medium">{formatDate(shipment.created_date)}</div>
              </div>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b">
              <h3 className="font-medium flex items-center gap-2">
                <Truck className="w-4 h-4 text-gray-500" />
                Carrier & Equipment
              </h3>
            </div>
            <div className="p-4 grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500">Carrier</div>
                <div className="font-medium">{shipment.carrier_name || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Mode</div>
                <div className="font-medium">{shipment.mode_name || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Equipment</div>
                <div className="font-medium">{shipment.equipment_name || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Driver</div>
                <div className="font-medium">{shipment.driver_name || '—'}</div>
              </div>
              {shipment.truck_number && (
                <div>
                  <div className="text-xs text-gray-500">Truck #</div>
                  <div className="font-medium">{shipment.truck_number}</div>
                </div>
              )}
              {shipment.trailer_number && (
                <div>
                  <div className="text-xs text-gray-500">Trailer #</div>
                  <div className="font-medium">{shipment.trailer_number}</div>
                </div>
              )}
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b">
              <h3 className="font-medium flex items-center gap-2">
                <Package className="w-4 h-4 text-gray-500" />
                Freight Details
              </h3>
            </div>
            <div className="p-4 grid grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-gray-500">Weight</div>
                <div className="font-medium">{shipment.total_weight ? `${shipment.total_weight.toLocaleString()} lbs` : '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Pieces</div>
                <div className="font-medium">{shipment.total_pieces || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Pallets</div>
                <div className="font-medium">{shipment.number_of_pallets || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Freight Class</div>
                <div className="font-medium">{shipment.freight_classes || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Commodity</div>
                <div className="font-medium truncate">{shipment.commodities || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Hazmat</div>
                <div className={`font-medium ${shipment.has_hazmat ? 'text-red-600' : ''}`}>
                  {shipment.has_hazmat ? 'Yes' : 'No'}
                </div>
              </div>
            </div>
            {shipment.item_descriptions && (
              <div className="px-4 pb-4">
                <div className="text-xs text-gray-500 mb-1">Item Descriptions</div>
                <div className="text-sm bg-gray-50 rounded p-2">{shipment.item_descriptions}</div>
              </div>
            )}
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b">
              <h3 className="font-medium flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                References
              </h3>
            </div>
            <div className="p-4 grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500">BOL Number</div>
                <div className="font-medium">{shipment.bol_number || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">PO Reference</div>
                <div className="font-medium">{shipment.po_reference || '—'}</div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={() => onViewDetails(shipment)}
              className="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium transition-colors"
            >
              View Full Details
            </button>
            {onAskAI && (
              <button
                onClick={() => onAskAI(shipment)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Ask AI
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.2s ease-out;
        }
      `}</style>
    </>
  );
}
