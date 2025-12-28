import { ShipmentData, ShipmentAccessorial } from './types';
import { InfoRow } from './helpers';

interface FinancialsTabProps {
  shipment: ShipmentData | null;
  accessorials: ShipmentAccessorial[];
}

export function FinancialsTab({ shipment, accessorials }: FinancialsTabProps) {
  const baseRevenue = shipment?.retail || 0;
  const baseCost = shipment?.cost || 0;
  const accessorialRevenue = accessorials?.reduce((sum, a) => sum + (a.charge_amount || 0), 0) || 0;
  const accessorialCost = accessorials?.reduce((sum, a) => sum + (a.cost_amount || 0), 0) || 0;
  const totalRevenue = baseRevenue + accessorialRevenue;
  const totalCost = baseCost + accessorialCost;
  const margin = totalRevenue - totalCost;
  const marginPct = totalRevenue > 0 ? (margin / totalRevenue) * 100 : 0;

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="border border-emerald-200 rounded-lg p-4 bg-emerald-50">
          <p className="text-sm text-emerald-600 font-medium">Total Revenue</p>
          <p className="text-3xl font-bold text-emerald-700">${totalRevenue.toFixed(2)}</p>
          <div className="mt-2 text-sm text-emerald-600 space-y-1">
            <p>Base: ${baseRevenue.toFixed(2)}</p>
            <p>Accessorials: ${accessorialRevenue.toFixed(2)}</p>
          </div>
        </div>

        <div className="border border-red-200 rounded-lg p-4 bg-red-50">
          <p className="text-sm text-red-600 font-medium">Total Cost</p>
          <p className="text-3xl font-bold text-red-700">${totalCost.toFixed(2)}</p>
          <div className="mt-2 text-sm text-red-600 space-y-1">
            <p>Base: ${baseCost.toFixed(2)}</p>
            <p>Accessorials: ${accessorialCost.toFixed(2)}</p>
          </div>
        </div>

        <div
          className={`border rounded-lg p-4 ${
            margin >= 0
              ? 'border-blue-200 bg-blue-50'
              : 'border-amber-200 bg-amber-50'
          }`}
        >
          <p
            className={`text-sm font-medium ${
              margin >= 0 ? 'text-blue-600' : 'text-amber-600'
            }`}
          >
            Margin
          </p>
          <p
            className={`text-3xl font-bold ${
              margin >= 0 ? 'text-blue-700' : 'text-amber-700'
            }`}
          >
            ${margin.toFixed(2)}
          </p>
          <p
            className={`text-sm mt-2 ${
              margin >= 0 ? 'text-blue-600' : 'text-amber-600'
            }`}
          >
            {marginPct.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="border border-slate-200 rounded-lg p-4">
        <h3 className="font-semibold mb-4 text-slate-800">Additional Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <InfoRow
            label="Target Rate"
            value={shipment?.target_rate ? `$${shipment.target_rate.toFixed(2)}` : null}
          />
          <InfoRow
            label="Shipment Value"
            value={
              shipment?.shipment_value ? `$${shipment.shipment_value.toLocaleString()}` : null
            }
          />
          <InfoRow
            label="Cost (no tax)"
            value={
              shipment?.cost_without_tax ? `$${shipment.cost_without_tax.toFixed(2)}` : null
            }
          />
          <InfoRow
            label="Retail (no tax)"
            value={
              shipment?.retail_without_tax ? `$${shipment.retail_without_tax.toFixed(2)}` : null
            }
          />
        </div>
      </div>

      <div className="mt-6 border border-slate-200 rounded-lg p-4">
        <h3 className="font-semibold mb-4 text-slate-800">Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="pb-2 text-left font-medium text-slate-600">Category</th>
                <th className="pb-2 text-right font-medium text-slate-600">Revenue</th>
                <th className="pb-2 text-right font-medium text-slate-600">Cost</th>
                <th className="pb-2 text-right font-medium text-slate-600">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-2 text-slate-800">Base Freight</td>
                <td className="py-2 text-right text-slate-800">${baseRevenue.toFixed(2)}</td>
                <td className="py-2 text-right text-slate-800">${baseCost.toFixed(2)}</td>
                <td className="py-2 text-right text-slate-800">
                  ${(baseRevenue - baseCost).toFixed(2)}
                </td>
              </tr>
              <tr>
                <td className="py-2 text-slate-800">Accessorials</td>
                <td className="py-2 text-right text-slate-800">
                  ${accessorialRevenue.toFixed(2)}
                </td>
                <td className="py-2 text-right text-slate-800">${accessorialCost.toFixed(2)}</td>
                <td className="py-2 text-right text-slate-800">
                  ${(accessorialRevenue - accessorialCost).toFixed(2)}
                </td>
              </tr>
            </tbody>
            <tfoot className="border-t-2 border-slate-200 font-semibold">
              <tr>
                <td className="py-2 text-slate-800">Total</td>
                <td className="py-2 text-right text-emerald-700">${totalRevenue.toFixed(2)}</td>
                <td className="py-2 text-right text-red-700">${totalCost.toFixed(2)}</td>
                <td
                  className={`py-2 text-right ${
                    margin >= 0 ? 'text-blue-700' : 'text-amber-700'
                  }`}
                >
                  ${margin.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
