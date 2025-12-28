import { DollarSign, Check, Minus } from 'lucide-react';
import { ShipmentAccessorial } from './types';
import { EmptyState } from './helpers';

interface AccessorialsTabProps {
  accessorials: ShipmentAccessorial[];
  showFinancials: boolean;
}

export function AccessorialsTab({ accessorials, showFinancials }: AccessorialsTabProps) {
  if (!accessorials?.length) {
    return <EmptyState icon={DollarSign} message="No accessorials on this shipment" />;
  }

  const totalCharge = accessorials.reduce((sum, a) => sum + (a.charge_amount || 0), 0);
  const totalCost = accessorials.reduce((sum, a) => sum + (a.cost_amount || 0), 0);

  return (
    <div className="p-6">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th className="pb-3 font-medium text-slate-600">Code</th>
              <th className="pb-3 font-medium text-slate-600">Description</th>
              <th className="pb-3 font-medium text-slate-600">Quantity</th>
              {showFinancials && (
                <th className="pb-3 font-medium text-slate-600 text-right">Charge</th>
              )}
              {showFinancials && (
                <th className="pb-3 font-medium text-slate-600 text-right">Cost</th>
              )}
              <th className="pb-3 font-medium text-slate-600 text-center">Billable</th>
              <th className="pb-3 font-medium text-slate-600 text-center">Approved</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {accessorials.map((acc) => (
              <tr key={acc.shipment_accessorial_id}>
                <td className="py-3 font-medium text-slate-800">
                  {acc.accessorial_code || '—'}
                </td>
                <td className="py-3 text-slate-700">
                  {acc.description || acc.accessorial_type || '—'}
                </td>
                <td className="py-3 text-slate-700">
                  {acc.quantity || '—'} {acc.unit_type || ''}
                </td>
                {showFinancials && (
                  <td className="py-3 text-right text-slate-800">
                    ${(acc.charge_amount || 0).toFixed(2)}
                  </td>
                )}
                {showFinancials && (
                  <td className="py-3 text-right text-slate-800">
                    ${(acc.cost_amount || 0).toFixed(2)}
                  </td>
                )}
                <td className="py-3 text-center">
                  {acc.is_billable ? (
                    <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                  ) : (
                    <Minus className="w-4 h-4 text-slate-300 mx-auto" />
                  )}
                </td>
                <td className="py-3 text-center">
                  {acc.is_approved ? (
                    <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                  ) : (
                    <Minus className="w-4 h-4 text-slate-300 mx-auto" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          {showFinancials && (
            <tfoot className="border-t-2 border-slate-200 font-medium">
              <tr>
                <td colSpan={3} className="py-3 text-slate-800">
                  Total
                </td>
                <td className="py-3 text-right text-slate-800">${totalCharge.toFixed(2)}</td>
                <td className="py-3 text-right text-slate-800">${totalCost.toFixed(2)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
