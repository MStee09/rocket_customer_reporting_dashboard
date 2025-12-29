import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Printer } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import {
  ShipmentFullData,
  OverviewTab,
  ItemsTab,
  AddressesTab,
  CarrierTab,
  AccessorialsTab,
  FinancialsTab,
  NotesTab,
  HistoryTab,
} from '../components/shipment-detail';
import { Card } from '../components/ui/Card';

interface TabConfig {
  id: string;
  label: string;
  adminOnly?: boolean;
}

const TABS: TabConfig[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'items', label: 'Items' },
  { id: 'addresses', label: 'Addresses' },
  { id: 'carrier', label: 'Carrier' },
  { id: 'accessorials', label: 'Accessorials' },
  { id: 'financials', label: 'Financials', adminOnly: true },
  { id: 'notes', label: 'Notes' },
  { id: 'history', label: 'History' },
];

async function loadShipmentDetails(
  loadId: string,
  useCustomerViews: boolean
): Promise<ShipmentFullData> {
  const shipmentTable = useCustomerViews ? 'shipment_customer_view' : 'shipment';
  const carrierTable = useCustomerViews
    ? 'shipment_carrier_customer_view'
    : 'shipment_carrier';
  const accessorialTable = useCustomerViews
    ? 'shipment_accessorial_customer_view'
    : 'shipment_accessorial';
  const noteTable = useCustomerViews ? 'shipment_note_customer_view' : 'shipment_note';

  const [
    shipmentResult,
    addressesResult,
    itemsResult,
    carrierAssignmentResult,
    accessorialsResult,
    notesResult,
    detailResult,
  ] = await Promise.all([
    supabase.from(shipmentTable).select('*').eq('load_id', loadId).maybeSingle(),
    supabase
      .from('shipment_address')
      .select('*')
      .eq('load_id', loadId)
      .order('stop_number'),
    supabase.from('shipment_item').select('*').eq('load_id', loadId),
    supabase.from(carrierTable).select('*').eq('load_id', loadId),
    supabase.from(accessorialTable).select('*').eq('load_id', loadId),
    supabase
      .from(noteTable)
      .select('*')
      .eq('load_id', loadId)
      .order('created_date', { ascending: false }),
    supabase.from('shipment_detail').select('*').eq('load_id', loadId).maybeSingle(),
  ]);

  let mode = null;
  let status = null;
  let customer = null;
  let rateCarrier = null;
  let equipmentType = null;

  const shipment = shipmentResult.data;

  if (shipment) {
    const lookupPromises: Promise<any>[] = [];

    if (shipment.mode_id) {
      lookupPromises.push(
        supabase
          .from('shipment_mode')
          .select('*')
          .eq('mode_id', shipment.mode_id)
          .maybeSingle()
          .then((r) => ({ type: 'mode', data: r.data }))
      );
    }

    if (shipment.status_id) {
      lookupPromises.push(
        supabase
          .from('shipment_status')
          .select('*')
          .eq('status_id', shipment.status_id)
          .maybeSingle()
          .then((r) => ({ type: 'status', data: r.data }))
      );
    }

    if (shipment.customer_id) {
      lookupPromises.push(
        supabase
          .from('customer')
          .select('*')
          .eq('customer_id', shipment.customer_id)
          .maybeSingle()
          .then((r) => ({ type: 'customer', data: r.data }))
      );
    }

    if (shipment.rate_carrier_id) {
      lookupPromises.push(
        supabase
          .from('carrier')
          .select('*')
          .eq('carrier_id', shipment.rate_carrier_id)
          .maybeSingle()
          .then((r) => ({ type: 'rateCarrier', data: r.data }))
      );
    }

    if (shipment.equipment_type_id) {
      lookupPromises.push(
        supabase
          .from('equipment_type')
          .select('*')
          .eq('equipment_type_id', shipment.equipment_type_id)
          .maybeSingle()
          .then((r) => ({ type: 'equipmentType', data: r.data }))
      );
    }

    const lookupResults = await Promise.all(lookupPromises);

    for (const result of lookupResults) {
      switch (result.type) {
        case 'mode':
          mode = result.data;
          break;
        case 'status':
          status = result.data;
          break;
        case 'customer':
          customer = result.data;
          break;
        case 'rateCarrier':
          rateCarrier = result.data;
          break;
        case 'equipmentType':
          equipmentType = result.data;
          break;
      }
    }
  }

  return {
    shipment,
    addresses: addressesResult.data || [],
    items: itemsResult.data || [],
    carrierAssignment: carrierAssignmentResult.data?.[0] || null,
    accessorials: accessorialsResult.data || [],
    notes: notesResult.data || [],
    detail: detailResult.data,
    mode,
    status,
    customer,
    rateCarrier,
    equipmentType,
  };
}

export function ShipmentDetailPage() {
  const { loadId } = useParams();
  const navigate = useNavigate();
  const { isAdmin, isViewingAsCustomer, isCustomer } = useAuth();
  const showFinancials = isAdmin() && !isViewingAsCustomer;
  const useCustomerViews = isCustomer() || isViewingAsCustomer;

  const [data, setData] = useState<ShipmentFullData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (loadId) {
      setIsLoading(true);
      loadShipmentDetails(loadId, useCustomerViews)
        .then(setData)
        .finally(() => setIsLoading(false));
    }
  }, [loadId, useCustomerViews]);

  const visibleTabs = TABS.filter((tab) => {
    if (tab.adminOnly && !showFinancials) return false;
    return true;
  });

  const getTabLabel = (tab: TabConfig): string => {
    if (!data) return tab.label;
    switch (tab.id) {
      case 'items':
        return `Items (${data.items.length})`;
      case 'addresses':
        return `Addresses (${data.addresses.length})`;
      case 'accessorials':
        return `Accessorials (${data.accessorials.length})`;
      case 'notes':
        return `Notes (${data.notes.length})`;
      default:
        return tab.label;
    }
  };

  const originAddress = data?.addresses.find(
    (a) => a.address_type === 1 || a.address_type === 'origin' || a.address_type === 'pickup'
  );
  const destAddress = data?.addresses.find(
    (a) => a.address_type === 2 || a.address_type === 'destination' || a.address_type === 'delivery'
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!data?.shipment) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Shipment Not Found</h2>
          <button
            onClick={() => navigate('/shipments')}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
          >
            Back to Shipments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <button
        onClick={() => navigate('/shipments')}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-4 print:hidden"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Shipments
      </button>

      <Card variant="default" padding="lg" className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-slate-800">
                Load #{data.shipment.load_id}
              </h1>
              {data.status && (
                <StatusBadge
                  statusName={data.status.status_name || '—'}
                  isCompleted={data.status.is_completed || false}
                  isCancelled={data.status.is_cancelled || false}
                />
              )}
            </div>
            {data.customer?.company_name && (
              <p className="text-slate-600 mb-1">{data.customer.company_name}</p>
            )}
            {(originAddress || destAddress) && (
              <p className="text-lg text-slate-700">
                {originAddress ? `${originAddress.city}, ${originAddress.state}` : '—'}
                {' → '}
                {destAddress ? `${destAddress.city}, ${destAddress.state}` : '—'}
              </p>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 flex-wrap">
              {data.shipment.bol_number && <span>BOL: {data.shipment.bol_number}</span>}
              {data.shipment.po_reference && <span>PO: {data.shipment.po_reference}</span>}
              {data.shipment.reference_number && (
                <span>Ref: {data.shipment.reference_number}</span>
              )}
              {data.mode?.mode_name && <span>{data.mode.mode_name}</span>}
              {data.rateCarrier?.carrier_name && (
                <span>Carrier: {data.rateCarrier.carrier_name}</span>
              )}
            </div>
          </div>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2 print:hidden shrink-0"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </Card>

      <div className="border-b border-slate-200 mb-6 print:hidden">
        <div className="flex gap-1 overflow-x-auto pb-px">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {getTabLabel(tab)}
            </button>
          ))}
        </div>
      </div>

      <Card variant="default" padding="none">
        {activeTab === 'overview' && (
          <OverviewTab data={data} showFinancials={showFinancials} />
        )}
        {activeTab === 'items' && <ItemsTab items={data.items} />}
        {activeTab === 'addresses' && <AddressesTab addresses={data.addresses} />}
        {activeTab === 'carrier' && (
          <CarrierTab
            carrierAssignment={data.carrierAssignment}
            rateCarrier={data.rateCarrier}
            showFinancials={showFinancials}
          />
        )}
        {activeTab === 'accessorials' && (
          <AccessorialsTab accessorials={data.accessorials} showFinancials={showFinancials} />
        )}
        {activeTab === 'financials' && (
          <FinancialsTab shipment={data.shipment} accessorials={data.accessorials} />
        )}
        {activeTab === 'notes' && <NotesTab notes={data.notes} />}
        {activeTab === 'history' && (
          <HistoryTab shipment={data.shipment} detail={data.detail} />
        )}
      </Card>
    </div>
  );
}
