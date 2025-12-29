import { DollarSign, Package, TrendingUp, Truck } from 'lucide-react';
import { ComparisonMetricCard } from './ComparisonMetricCard';

interface StatsData {
  totalSpend: number;
  shipmentCount: number;
  avgCostPerShipment: number;
  inTransit: number;
}

interface ComparisonMetricsProps {
  currentStats: StatsData;
  comparisonStats: StatsData;
  dateRangeLabel: string;
  comparisonLabel: string;
}

export function ComparisonMetrics({
  currentStats,
  comparisonStats,
  dateRangeLabel,
  comparisonLabel,
}: ComparisonMetricsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <ComparisonMetricCard
        title="Total Spend"
        currentValue={currentStats.totalSpend}
        currentLabel={dateRangeLabel}
        comparisonValue={comparisonStats.totalSpend}
        comparisonLabel={comparisonLabel}
        format="currency"
        positiveDirection="up"
        icon={<DollarSign className="w-4 h-4" />}
      />
      <ComparisonMetricCard
        title="Shipments"
        currentValue={currentStats.shipmentCount}
        currentLabel={dateRangeLabel}
        comparisonValue={comparisonStats.shipmentCount}
        comparisonLabel={comparisonLabel}
        format="number"
        positiveDirection="up"
        icon={<Package className="w-4 h-4" />}
      />
      <ComparisonMetricCard
        title="Avg Cost/Shipment"
        currentValue={currentStats.avgCostPerShipment}
        currentLabel={dateRangeLabel}
        comparisonValue={comparisonStats.avgCostPerShipment}
        comparisonLabel={comparisonLabel}
        format="currency"
        positiveDirection="down"
        icon={<TrendingUp className="w-4 h-4" />}
      />
      <ComparisonMetricCard
        title="In Transit"
        currentValue={currentStats.inTransit}
        currentLabel={dateRangeLabel}
        comparisonValue={comparisonStats.inTransit}
        comparisonLabel={comparisonLabel}
        format="number"
        positiveDirection="up"
        icon={<Truck className="w-4 h-4" />}
      />
    </div>
  );
}
