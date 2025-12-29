import { Clock, Package, Truck, CheckCircle, XCircle, ChevronRight } from 'lucide-react';
import { Card } from '../ui/Card';

interface Shipment {
  load_id: number;
  pro_number: string;
  pickup_date: string | null;
  reference_number: string | null;
  po_reference: string | null;
  origin_city: string;
  origin_state: string;
  destination_city: string;
  destination_state: string;
  carrier_name: string;
  mode_name: string;
  status: string;
  is_completed: boolean;
  is_cancelled: boolean;
  customer_charge: number;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; icon: typeof Clock }> = {
  'Quotes': { bg: 'bg-gray-100', text: 'text-gray-700', icon: Clock },
  'Pending Dispatch': { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
  'Pending Pickup': { bg: 'bg-orange-100', text: 'text-orange-700', icon: Package },
  'In Transit': { bg: 'bg-blue-100', text: 'text-blue-700', icon: Truck },
  'Delivered': { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
  'Completed': { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
  'Canceled': { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
  'Cancelled': { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
};

function getStatusConfig(status: string, isCompleted: boolean, isCancelled: boolean) {
  if (isCancelled) {
    return STATUS_CONFIG['Cancelled'] || { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle };
  }
  if (isCompleted) {
    return STATUS_CONFIG['Completed'] || { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle };
  }
  return STATUS_CONFIG[status] || { bg: 'bg-gray-100', text: 'text-gray-600', icon: Clock };
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatMode(mode: string | null) {
  if (!mode) return null;
  const m = mode.toLowerCase();
  if (m.includes('less than truckload')) return 'LTL';
  if (m.includes('full truckload')) return 'FTL';
  if (m.includes('partial')) return 'PTL';
  return mode;
}

interface ShipmentRowProps {
  shipment: Shipment;
  onClick: () => void;
  showFinancials: boolean;
}

export function ShipmentRow({ shipment, onClick, showFinancials }: ShipmentRowProps) {
  const statusConfig = getStatusConfig(shipment.status, shipment.is_completed, shipment.is_cancelled);
  const StatusIcon = statusConfig.icon;
  const displayStatus = shipment.is_cancelled ? 'Cancelled' : shipment.is_completed ? 'Completed' : shipment.status;
  const mode = formatMode(shipment.mode_name);

  return (
    <Card
      variant="default"
      padding="sm"
      hover={true}
      onClick={onClick}
      className="group"
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text} flex-shrink-0`}
          >
            <StatusIcon className="w-3 h-3" />
            {displayStatus}
          </span>
          <span className="font-semibold text-gray-900 flex-shrink-0">#{shipment.load_id}</span>
          <span className="text-gray-400 flex-shrink-0">-</span>
          {shipment.origin_city && shipment.origin_state ? (
            <span className="text-gray-700 truncate">
              {shipment.origin_city}, {shipment.origin_state} → {shipment.destination_city}, {shipment.destination_state}
            </span>
          ) : (
            <span className="text-gray-400 truncate">Route not available</span>
          )}
        </div>
        <span className="text-sm text-gray-500 flex-shrink-0 ml-3">
          {formatDate(shipment.pickup_date) || '—'}
        </span>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center gap-2 truncate">
          {shipment.carrier_name && <span className="truncate">{shipment.carrier_name}</span>}
          {mode && (
            <>
              <span className="text-gray-300">-</span>
              <span>{mode}</span>
            </>
          )}
          {shipment.po_reference && (
            <>
              <span className="text-gray-300">-</span>
              <span>PO: {shipment.po_reference}</span>
            </>
          )}
          {shipment.reference_number && !shipment.po_reference && (
            <>
              <span className="text-gray-300">-</span>
              <span>Ref: {shipment.reference_number}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {showFinancials && shipment.customer_charge && (
            <span className="font-medium text-gray-900">${shipment.customer_charge.toLocaleString()}</span>
          )}
          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
        </div>
      </div>
    </Card>
  );
}
