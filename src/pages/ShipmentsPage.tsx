import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Package, Loader2, SlidersHorizontal } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useSavedViews } from '../hooks/useSavedViews';
import { SaveViewModal } from '../components/shipments/SaveViewModal';
import { EmailReportModal } from '../components/reports/EmailReportModal';
import { ShipmentsToolbar } from '../components/shipments/ShipmentsToolbar';
import { ShipmentRow } from '../components/shipments/ShipmentRow';
import { ShipmentsFilterPanel, FilterState, defaultFilters } from '../components/shipments/ShipmentsFilterPanel';
import { ColumnConfig } from '../services/exportService';

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

const INITIAL_LOAD_COUNT = 50;
const LOAD_MORE_COUNT = 50;

export function ShipmentsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, effectiveCustomerIds, isViewingAsCustomer } = useAuth();
  const { saveView } = useSavedViews();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSaveViewModal, setShowSaveViewModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  const hasActiveFilters = searchQuery.trim() !== '' ||
    filters.statuses.length > 0 ||
    filters.carriers.length > 0 ||
    filters.modes.length > 0 ||
    filters.originStates.length > 0 ||
    filters.destStates.length > 0 ||
    filters.dateRange !== null;

  useEffect(() => {
    const savedView = location.state?.savedView;
    if (savedView) {
      if (savedView.searchQuery !== undefined) {
        setSearchQuery(savedView.searchQuery);
      }
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleSaveView = async (name: string, description: string, pin: boolean) => {
    await saveView({
      name,
      description: description || undefined,
      viewType: 'shipments',
      viewConfig: { searchQuery },
      isPinned: pin,
    });
  };

  const loadShipments = useCallback(async (offset = 0, append = false) => {
    if (offset === 0) setLoading(true);
    else setLoadingMore(true);

    let query = supabase
      .from('shipment_secure')
      .select(`
        load_id, pickup_date, delivery_date, expected_delivery_date,
        reference_number, bol_number, po_reference, retail, miles,
        number_of_pallets, linear_feet, shipment_value, priority,
        is_stackable, is_palletized, created_date,
        shipment_status:status_id(status_id, status_name, status_description, is_completed, is_cancelled),
        carrier:rate_carrier_id(carrier_id, carrier_name),
        shipment_mode:mode_id(mode_name),
        equipment:equipment_type_id(equipment_name),
        addresses:shipment_address(stop_number, address_type, company_name, city, state, postal_code, country, contact_name, contact_phone),
        carrier_info:shipment_carrier(carrier_name, pro_number, driver_name, driver_phone, truck_number, trailer_number),
        items:shipment_item(description, commodity, freight_class, quantity, weight, package_type, number_of_packages, is_hazmat)
      `);

    if (!isAdmin() || isViewingAsCustomer) {
      query = query.in('customer_id', effectiveCustomerIds);
    }

    const { data, error } = await query
      .order('pickup_date', { ascending: false })
      .range(offset, offset + LOAD_MORE_COUNT - 1);

    if (error) {
      console.error('Error loading shipments:', error);
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    if (data) {
      const enrichedData: Shipment[] = data.map((shipment: any) => {
        const pickup = shipment.addresses?.find((a: any) => a.address_type === 1) || shipment.addresses?.[0];
        const delivery = shipment.addresses?.find((a: any) => a.address_type === 2) || shipment.addresses?.[shipment.addresses?.length - 1];
        const carrierInfo = shipment.carrier_info?.[0];
        const items = shipment.items || [];

        const totalWeight = items.reduce((sum: number, item: any) => sum + (item.weight || 0), 0);
        const totalPieces = items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
        const totalPackages = items.reduce((sum: number, item: any) => sum + (item.number_of_packages || 0), 0);
        const itemDescriptions = items.map((i: any) => i.description).filter(Boolean).join('; ');
        const commodities = [...new Set(items.map((i: any) => i.commodity).filter(Boolean))].join(', ');
        const freightClasses = [...new Set(items.map((i: any) => i.freight_class).filter(Boolean))].join(', ');
        const hasHazmat = items.some((i: any) => i.is_hazmat);

        return {
          load_id: shipment.load_id,
          pro_number: carrierInfo?.pro_number || '',
          pickup_date: shipment.pickup_date,
          delivery_date: shipment.delivery_date,
          expected_delivery_date: shipment.expected_delivery_date,
          reference_number: shipment.reference_number,
          bol_number: shipment.bol_number,
          po_reference: shipment.po_reference,
          origin_company: pickup?.company_name || '',
          origin_city: pickup?.city || '',
          origin_state: pickup?.state || '',
          origin_zip: pickup?.postal_code || '',
          origin_country: pickup?.country || '',
          origin_contact: pickup?.contact_name || '',
          origin_phone: pickup?.contact_phone || '',
          destination_company: delivery?.company_name || '',
          destination_city: delivery?.city || '',
          destination_state: delivery?.state || '',
          destination_zip: delivery?.postal_code || '',
          destination_country: delivery?.country || '',
          destination_contact: delivery?.contact_name || '',
          destination_phone: delivery?.contact_phone || '',
          carrier_name: carrierInfo?.carrier_name || shipment.carrier?.carrier_name || '',
          driver_name: carrierInfo?.driver_name || '',
          driver_phone: carrierInfo?.driver_phone || '',
          truck_number: carrierInfo?.truck_number || '',
          trailer_number: carrierInfo?.trailer_number || '',
          mode_name: shipment.shipment_mode?.mode_name || '',
          equipment_name: shipment.equipment?.equipment_name || '',
          status: shipment.shipment_status?.status_name || 'Unknown',
          status_id: shipment.shipment_status?.status_id,
          status_description: shipment.shipment_status?.status_description || '',
          is_completed: shipment.shipment_status?.is_completed || false,
          is_cancelled: shipment.shipment_status?.is_cancelled || false,
          total_weight: totalWeight,
          total_pieces: totalPieces,
          total_packages: totalPackages,
          number_of_pallets: shipment.number_of_pallets || 0,
          linear_feet: shipment.linear_feet || 0,
          miles: shipment.miles || 0,
          is_stackable: shipment.is_stackable || false,
          is_palletized: shipment.is_palletized || false,
          has_hazmat: hasHazmat,
          item_descriptions: itemDescriptions,
          commodities: commodities,
          freight_classes: freightClasses,
          customer_charge: shipment.retail || 0,
          shipment_value: shipment.shipment_value || 0,
          created_date: shipment.created_date,
          priority: shipment.priority || 0,
        };
      });

      if (append) {
        setShipments(prev => [...prev, ...enrichedData]);
      } else {
        setShipments(enrichedData);
      }

      setHasMore(data.length === LOAD_MORE_COUNT);
    }

    setLoading(false);
    setLoadingMore(false);
  }, [effectiveCustomerIds, isAdmin, isViewingAsCustomer]);

  const handleLoadMore = () => {
    loadShipments(shipments.length, true);
  };

  useEffect(() => {
    if (effectiveCustomerIds.length > 0) {
      loadShipments();
    }
  }, [effectiveCustomerIds, loadShipments]);

  const shipmentExportColumns: ColumnConfig[] = useMemo(() => {
    const baseColumns: ColumnConfig[] = [
      { key: 'load_id', header: 'Load ID', format: 'text', width: 12 },
      { key: 'pro_number', header: 'PRO Number', format: 'text', width: 15 },
      { key: 'reference_number', header: 'Reference #', format: 'text', width: 15 },
      { key: 'bol_number', header: 'BOL #', format: 'text', width: 15 },
      { key: 'po_reference', header: 'PO Reference', format: 'text', width: 15 },
      { key: 'pickup_date', header: 'Pickup Date', format: 'date', width: 12 },
      { key: 'delivery_date', header: 'Delivery Date', format: 'date', width: 12 },
      { key: 'expected_delivery_date', header: 'Expected Delivery', format: 'date', width: 12 },
      { key: 'origin_company', header: 'Origin Company', format: 'text', width: 25 },
      { key: 'origin_city', header: 'Origin City', format: 'text', width: 15 },
      { key: 'origin_state', header: 'Origin State', format: 'text', width: 8 },
      { key: 'origin_zip', header: 'Origin ZIP', format: 'text', width: 10 },
      { key: 'origin_country', header: 'Origin Country', format: 'text', width: 8 },
      { key: 'destination_company', header: 'Dest Company', format: 'text', width: 25 },
      { key: 'destination_city', header: 'Dest City', format: 'text', width: 15 },
      { key: 'destination_state', header: 'Dest State', format: 'text', width: 8 },
      { key: 'destination_zip', header: 'Dest ZIP', format: 'text', width: 10 },
      { key: 'destination_country', header: 'Dest Country', format: 'text', width: 8 },
      { key: 'carrier_name', header: 'Carrier', format: 'text', width: 25 },
      { key: 'mode_name', header: 'Mode', format: 'text', width: 15 },
      { key: 'equipment_name', header: 'Equipment Type', format: 'text', width: 15 },
      { key: 'status', header: 'Status', format: 'text', width: 15 },
      { key: 'total_weight', header: 'Weight (lbs)', format: 'number', width: 12 },
      { key: 'total_pieces', header: 'Pieces', format: 'number', width: 8 },
      { key: 'miles', header: 'Miles', format: 'number', width: 8 },
      { key: 'freight_classes', header: 'Freight Class', format: 'text', width: 12 },
      { key: 'commodities', header: 'Commodity', format: 'text', width: 20 },
      { key: 'has_hazmat', header: 'Hazmat', format: 'text', width: 8 },
      { key: 'created_date', header: 'Created Date', format: 'date', width: 12 },
    ];

    if (isAdmin() && !isViewingAsCustomer) {
      baseColumns.push(
        { key: 'customer_charge', header: 'Customer Charge', format: 'currency', width: 15 },
        { key: 'shipment_value', header: 'Declared Value', format: 'currency', width: 15 }
      );
    }

    return baseColumns;
  }, [isAdmin, isViewingAsCustomer]);

  const filteredShipments = useMemo(() => {
    let result = shipments;

    if (filters.statuses.length > 0) {
      result = result.filter(s => {
        const status = s.is_cancelled ? 'Cancelled' : s.is_completed ? 'Completed' : s.status;
        return filters.statuses.includes(status);
      });
    }

    if (filters.carriers.length > 0) {
      result = result.filter(s => filters.carriers.includes(s.carrier_name));
    }

    if (filters.modes.length > 0) {
      result = result.filter(s => filters.modes.includes(s.mode_name));
    }

    if (filters.originStates.length > 0) {
      result = result.filter(s => filters.originStates.includes(s.origin_state));
    }

    if (filters.destStates.length > 0) {
      result = result.filter(s => filters.destStates.includes(s.destination_state));
    }

    if (filters.dateRange) {
      result = result.filter(s => {
        if (!s.pickup_date) return false;
        const pickupDate = s.pickup_date.substring(0, 10);
        return (!filters.dateRange!.start || pickupDate >= filters.dateRange!.start) &&
               (!filters.dateRange!.end || pickupDate <= filters.dateRange!.end);
      });
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase().trim();
      const searchTerms = query.split(/\s+/).filter(Boolean);

      result = result.filter((s) => {
        const statusKey = s.is_cancelled ? 'Cancelled' : s.is_completed ? 'Completed' : s.status;

        const searchableFields = [
          s.load_id.toString(), s.pro_number, s.po_reference, s.bol_number, s.reference_number,
          s.origin_city, s.origin_state, s.origin_company,
          s.destination_city, s.destination_state, s.destination_company,
          s.carrier_name, s.mode_name, statusKey,
          s.origin_city && s.origin_state ? `${s.origin_city}, ${s.origin_state}` : null,
          s.destination_city && s.destination_state ? `${s.destination_city}, ${s.destination_state}` : null,
        ].filter(Boolean).map(f => f!.toLowerCase());

        const combinedText = searchableFields.join(' ');
        return searchTerms.every(term => combinedText.includes(term));
      });
    }

    return result;
  }, [shipments, searchQuery, filters]);

  const shipmentExportData = useMemo(() => {
    return filteredShipments.map(s => ({
      load_id: s.load_id,
      pro_number: s.pro_number,
      reference_number: s.reference_number || '',
      bol_number: s.bol_number || '',
      po_reference: s.po_reference || '',
      pickup_date: s.pickup_date,
      delivery_date: s.delivery_date,
      expected_delivery_date: s.expected_delivery_date,
      origin_company: s.origin_company,
      origin_city: s.origin_city,
      origin_state: s.origin_state,
      origin_zip: s.origin_zip,
      origin_country: s.origin_country,
      destination_company: s.destination_company,
      destination_city: s.destination_city,
      destination_state: s.destination_state,
      destination_zip: s.destination_zip,
      destination_country: s.destination_country,
      carrier_name: s.carrier_name,
      mode_name: s.mode_name,
      equipment_name: s.equipment_name,
      status: s.is_cancelled ? 'Cancelled' : s.is_completed ? 'Completed' : s.status,
      total_weight: s.total_weight,
      total_pieces: s.total_pieces,
      miles: s.miles,
      freight_classes: s.freight_classes,
      commodities: s.commodities,
      has_hazmat: s.has_hazmat ? 'Yes' : 'No',
      created_date: s.created_date,
      customer_charge: s.customer_charge,
      shipment_value: s.shipment_value,
    }));
  }, [filteredShipments]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-rocket-600 animate-spin" />
        </div>
      </div>
    );
  }

  const showFinancials = isAdmin() && !isViewingAsCustomer;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Shipments</h1>
        <p className="text-gray-500 mt-1">Track and manage your shipments</p>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1">
          <ShipmentsToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            hasActiveFilters={hasActiveFilters}
            onSaveView={() => setShowSaveViewModal(true)}
            onEmailReport={() => setShowEmailModal(true)}
            exportData={shipmentExportData}
            exportColumns={shipmentExportColumns}
            filteredCount={filteredShipments.length}
          />
        </div>
        <button
          onClick={() => setShowFilterPanel(true)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-colors ${
            hasActiveFilters
              ? 'bg-rocket-50 border-rocket-200 text-rocket-700'
              : 'bg-white border-slate-200 text-gray-700 hover:bg-slate-50'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="font-medium">Filters</span>
          {hasActiveFilters && (
            <span className="w-2 h-2 bg-rocket-500 rounded-full" />
          )}
        </button>
      </div>

      <div className="text-sm text-gray-500 mb-4">
        Showing {filteredShipments.length} of {shipments.length} shipments
        {searchQuery && ` matching "${searchQuery}"`}
      </div>

      <div className="space-y-2">
        {filteredShipments.map((shipment) => (
          <ShipmentRow
            key={shipment.load_id}
            shipment={shipment}
            onClick={() => navigate(`/shipments/${shipment.load_id}`)}
            showFinancials={showFinancials}
          />
        ))}

        {filteredShipments.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No shipments found</p>
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-rocket-600 hover:underline mt-2">
                Clear search
              </button>
            )}
          </div>
        )}
      </div>

      {hasMore && !loading && filteredShipments.length > 0 && (
        <div className="mt-6 text-center">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {loadingMore ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </span>
            ) : (
              'Load More Shipments'
            )}
          </button>
        </div>
      )}

      <SaveViewModal
        isOpen={showSaveViewModal}
        onClose={() => setShowSaveViewModal(false)}
        onSave={handleSaveView}
        filterSummary={{ searchQuery }}
      />

      <EmailReportModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        reportName="Shipments Export"
        reportData={shipmentExportData}
        reportType="shipments"
      />

      <ShipmentsFilterPanel
        isOpen={showFilterPanel}
        onClose={() => setShowFilterPanel(false)}
        filters={filters}
        onApply={setFilters}
      />
    </div>
  );
}
