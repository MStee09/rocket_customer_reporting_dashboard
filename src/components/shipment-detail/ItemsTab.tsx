import { Package } from 'lucide-react';
import { ShipmentItem } from './types';
import { EmptyState, InfoRow } from './helpers';

interface ItemsTabProps {
  items: ShipmentItem[];
}

export function ItemsTab({ items }: ItemsTabProps) {
  if (!items?.length) {
    return <EmptyState icon={Package} message="No items on this shipment" />;
  }

  const totalWeight = items.reduce((sum, i) => sum + (i.weight || 0), 0);
  const totalPackages = items.reduce((sum, i) => sum + (i.number_of_packages || 0), 0);
  const totalQuantity = items.reduce((sum, i) => sum + (i.quantity || 0), 0);

  return (
    <div className="p-6">
      <div className="space-y-4">
        {items.map((item, i) => (
          <div key={item.shipment_item_id} className="border border-slate-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className="text-sm text-slate-500">Item {i + 1}</span>
                <h4 className="font-medium text-slate-800">
                  {item.description || item.commodity || 'Freight'}
                </h4>
              </div>
              {item.is_hazmat && (
                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
                  HAZMAT
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <InfoRow label="Quantity" value={item.quantity} />
              <InfoRow
                label="Weight"
                value={
                  item.weight
                    ? `${item.weight.toLocaleString()} ${item.weight_unit || 'lbs'}`
                    : null
                }
              />
              <InfoRow label="Class" value={item.freight_class} />
              <InfoRow label="NMFC" value={item.nmfc_code} />
              <InfoRow
                label="Dimensions"
                value={
                  item.length && item.width && item.height
                    ? `${item.length}x${item.width}x${item.height} ${item.dimension_unit || 'in'}`
                    : null
                }
              />
              <InfoRow label="Package Type" value={item.package_type} />
              <InfoRow label="# Packages" value={item.number_of_packages} />
              <InfoRow label="Stackable" value={item.is_stackable ? 'Yes' : 'No'} />
              {item.sku && <InfoRow label="SKU" value={item.sku} />}
              {item.item_number && <InfoRow label="Item #" value={item.item_number} />}
              {item.declared_value && (
                <InfoRow label="Declared Value" value={`$${item.declared_value.toLocaleString()}`} />
              )}
              {item.is_hazmat && (
                <>
                  <InfoRow label="Hazmat Class" value={item.hazmat_class} />
                  <InfoRow label="UN Number" value={item.hazmat_un_number} />
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-200 flex flex-wrap gap-6 text-sm">
        <span className="text-slate-600">
          <strong className="text-slate-800">Total Items:</strong> {items.length}
        </span>
        <span className="text-slate-600">
          <strong className="text-slate-800">Total Quantity:</strong> {totalQuantity.toLocaleString()}
        </span>
        <span className="text-slate-600">
          <strong className="text-slate-800">Total Weight:</strong> {totalWeight.toLocaleString()} lbs
        </span>
        <span className="text-slate-600">
          <strong className="text-slate-800">Total Packages:</strong> {totalPackages.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
