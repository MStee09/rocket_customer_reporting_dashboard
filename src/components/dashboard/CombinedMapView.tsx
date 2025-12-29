import { useState } from 'react';
import { ShipmentFlowMap } from './ShipmentFlowMap';
import { CostPerStateMap } from './CostPerStateMap';
import { StateData } from '../../hooks/useDashboardData';

interface CombinedMapViewProps {
  effectiveCustomerIds: number[];
  isAdmin: boolean;
  isViewingAsCustomer: boolean;
  startDate: string;
  endDate: string;
  stateData: StateData[];
  stateLoading: boolean;
}

type MapView = 'flow' | 'cost';

export function CombinedMapView({
  effectiveCustomerIds,
  isAdmin,
  isViewingAsCustomer,
  startDate,
  endDate,
  stateData,
  stateLoading,
}: CombinedMapViewProps) {
  const [activeView, setActiveView] = useState<MapView>('flow');

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
      <div className="border-b border-slate-200">
        <div className="flex">
          <button
            onClick={() => setActiveView('flow')}
            className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
              activeView === 'flow'
                ? 'bg-rocket-600 text-white'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Shipment Flow Map
          </button>
          <button
            onClick={() => setActiveView('cost')}
            className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
              activeView === 'cost'
                ? 'bg-rocket-600 text-white'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Cost per Shipment by State
          </button>
        </div>
      </div>

      <div className="p-6">
        {activeView === 'flow' ? (
          <ShipmentFlowMap
            effectiveCustomerIds={effectiveCustomerIds}
            isAdmin={isAdmin}
            isViewingAsCustomer={isViewingAsCustomer}
            startDate={startDate}
            endDate={endDate}
          />
        ) : (
          <CostPerStateMap data={stateData} isLoading={stateLoading} />
        )}
      </div>
    </div>
  );
}
