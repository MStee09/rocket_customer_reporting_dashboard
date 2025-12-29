import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  Package,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  ChevronRight,
  Loader2,
  X,
  Bookmark,
  Mail,
  AlertTriangle,
  Calendar,
  DollarSign,
  Zap,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useSavedViews } from '../hooks/useSavedViews';
import { SaveViewModal } from '../components/shipments/SaveViewModal';
import { ExportMenu } from '../components/ui/ExportMenu';
import { ColumnConfig } from '../services/exportService';
import { EmailReportModal } from '../components/reports/EmailReportModal';

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

interface QuickFilter {
  id: string;
  label: string;
  icon: typeof Clock;
  filter: (shipment: Shipment) => boolean;
  activeClass: string;
  inactiveClass: string;
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getEndOfWeek(date: Date): Date {
  const d = getStartOfWeek(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

const quickFilters: QuickFilter[] = [
  {
    id: 'in-transit',
    label: 'In Transit',
    icon: Truck,
    filter: (s) => !s.is_completed && !s.is_cancelled && s.status?.toLowerCase().includes('transit'),
    activeClass: 'bg-blue-600 text-white border-blue-600',
    inactiveClass: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
  },
  {
    id: 'delivered',
    label: 'Delivered',
    icon: CheckCircle,
    filter: (s) => s.is_completed === true,
    activeClass: 'bg-green-600 text-white border-green-600',
    inactiveClass: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
  },
  {
    id: 'pending',
    label: 'Pending',
    icon: Clock,
    filter: (s) => {
      const statusLower = s.status?.toLowerCase() || '';
      return !s.is_completed && !s.is_cancelled && (
        statusLower.includes('pending') ||
        statusLower.includes('booked') ||
        statusLower.includes('dispatch')
      );
    },
    activeClass: 'bg-amber-500 text-white border-amber-500',
    inactiveClass: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
  },
  {
    id: 'exceptions',
    label: 'Exceptions',
    icon: AlertTriangle,
    filter: (s) => {
      const statusLower = s.status?.toLowerCase() || '';
      return statusLower.includes('exception') || statusLower.includes('delay') || statusLower.includes('hold');
    },
    activeClass: 'bg-red-600 text-white border-red-600',
    inactiveClass: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
  },
  {
    id: 'this-week',
    label: 'This Week',
    icon: Calendar,
    filter: (s) => {
      if (!s.pickup_date) return false;
      const pickupDate = new Date(s.pickup_date);
      const now = new Date();
      const startOfWeek = getStartOfWeek(now);
      const endOfWeek = getEndOfWeek(now);
      return pickupDate >= startOfWeek && pickupDate <= endOfWeek;
    },
    activeClass: 'bg-sky-600 text-white border-sky-600',
    inactiveClass: 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100',
  },
  {
    id: 'high-value',
    label: 'High Value',
    icon: DollarSign,
    filter: (s) => (s.customer_charge || 0) > 500,
    activeClass: 'bg-emerald-600 text-white border-emerald-600',
    inactiveClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
  },
];

export function ShipmentsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, effectiveCustomerIds, isViewingAsCustomer } = useAuth();
  const { saveView } = useSavedViews();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatus, setActiveStatus] = useState<string>('all');
  const [activeQuickFilters, setActiveQuickFilters] = useState<string[]>([]);
  const [showSaveViewModal, setShowSaveViewModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  const hasActiveFilters = searchQuery.trim() !== '' || activeStatus !== 'all' || activeQuickFilters.length > 0;

  const toggleQuickFilter = (filterId: string) => {
    setActiveQuickFilters(prev =>
      prev.includes(filterId)
        ? prev.filter(f => f !== filterId)
        : [...prev, filterId]
    );
  };

  useEffect(() => {
    const savedView = location.state?.savedView;
    if (savedView) {
      if (savedView.searchQuery !== undefined) {
        setSearchQuery(savedView.searchQuery);
      }
      if (savedView.activeStatus !== undefined) {
        setActiveStatus(savedView.activeStatus);
      }
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleSaveView = async (name: string, description: string, pin: boolean) => {
    await saveView({
      name,
      description: description || undefined,
      viewType: 'shipments',
      viewConfig: {
        searchQuery,
        activeStatus,
      },
      isPinned: pin,
    });
  };

  useEffect(() => {
    if (effectiveCustomerIds.length > 0) {
      loadShipments();
    }
  }, [effectiveCustomerIds]);

  const loadShipments = async () => {
    setLoading(true);

    let query = supabase
      .from('shipment_secure')
      .select(`
        load_id,
        pickup_date,
        delivery_date,
        expected_delivery_date,
        reference_number,
        bol_number,
        po_reference,
        retail,
        miles,
        number_of_pallets,
        linear_feet,
        shipment_value,
        priority,
        is_stackable,
        is_palletized,
        created_date,
        shipment_status:status_id(status_id, status_name, status_description, is_completed, is_cancelled),
        carrier:rate_carrier_id(carrier_id, carrier_name),
        shipment_mode:mode_id(mode_name),
        equipment:equipment_type_id(equipment_name),
        addresses:shipment_address(
          stop_number,
          address_type,
          company_name,
          city,
          state,
          postal_code,
          country,
          contact_name,
          contact_phone
        ),
        carrier_info:shipment_carrier(
          carrier_name,
          pro_number,
          driver_name,
          driver_phone,
          truck_number,
          trailer_number
        ),
        items:shipment_item(
          description,
          commodity,
          freight_class,
          quantity,
          weight,
          package_type,
          number_of_packages,
          is_hazmat
        )
      `);

    if (!isAdmin() || isViewingAsCustomer) {
      query = query.in('customer_id', effectiveCustomerIds);
    }

    const { data, error } = await query.order('pickup_date', { ascending: false }).limit(500);

    if (error) {
      console.error('Error loading shipments:', error);
      setLoading(false);
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

      setShipments(enrichedData);
    }

    setLoading(false);
  };

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    shipments.forEach((s) => {
      let statusKey = s.status;
      if (s.is_cancelled) statusKey = 'Cancelled';
      else if (s.is_completed) statusKey = 'Completed';
      counts[statusKey] = (counts[statusKey] || 0) + 1;
    });
    return counts;
  }, [shipments]);

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
      { key: 'origin_contact', header: 'Origin Contact', format: 'text', width: 20 },
      { key: 'origin_phone', header: 'Origin Phone', format: 'text', width: 15 },
      { key: 'destination_company', header: 'Dest Company', format: 'text', width: 25 },
      { key: 'destination_city', header: 'Dest City', format: 'text', width: 15 },
      { key: 'destination_state', header: 'Dest State', format: 'text', width: 8 },
      { key: 'destination_zip', header: 'Dest ZIP', format: 'text', width: 10 },
      { key: 'destination_country', header: 'Dest Country', format: 'text', width: 8 },
      { key: 'destination_contact', header: 'Dest Contact', format: 'text', width: 20 },
      { key: 'destination_phone', header: 'Dest Phone', format: 'text', width: 15 },
      { key: 'carrier_name', header: 'Carrier', format: 'text', width: 25 },
      { key: 'mode_name', header: 'Mode', format: 'text', width: 15 },
      { key: 'equipment_name', header: 'Equipment Type', format: 'text', width: 15 },
      { key: 'driver_name', header: 'Driver', format: 'text', width: 20 },
      { key: 'driver_phone', header: 'Driver Phone', format: 'text', width: 15 },
      { key: 'truck_number', header: 'Truck #', format: 'text', width: 12 },
      { key: 'trailer_number', header: 'Trailer #', format: 'text', width: 12 },
      { key: 'status', header: 'Status', format: 'text', width: 15 },
      { key: 'total_weight', header: 'Weight (lbs)', format: 'number', width: 12 },
      { key: 'total_pieces', header: 'Pieces', format: 'number', width: 8 },
      { key: 'total_packages', header: 'Packages', format: 'number', width: 10 },
      { key: 'number_of_pallets', header: 'Pallets', format: 'number', width: 8 },
      { key: 'linear_feet', header: 'Linear Feet', format: 'number', width: 10 },
      { key: 'miles', header: 'Miles', format: 'number', width: 8 },
      { key: 'freight_classes', header: 'Freight Class', format: 'text', width: 12 },
      { key: 'commodities', header: 'Commodity', format: 'text', width: 20 },
      { key: 'item_descriptions', header: 'Item Descriptions', format: 'text', width: 40 },
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
    return shipments.filter((s) => {
      let statusKey = s.status;
      if (s.is_cancelled) statusKey = 'Cancelled';
      else if (s.is_completed) statusKey = 'Completed';

      const matchesStatus = activeStatus === 'all' || statusKey === activeStatus;

      if (!matchesStatus) return false;

      if (activeQuickFilters.length > 0) {
        const matchesQuickFilter = activeQuickFilters.some(filterId => {
          const filter = quickFilters.find(f => f.id === filterId);
          return filter?.filter(s);
        });
        if (!matchesQuickFilter) return false;
      }

      if (!searchQuery) return true;

      const query = searchQuery.toLowerCase().trim();
      const searchTerms = query.split(/\s+/).filter(Boolean);

      const searchableFields = [
        s.load_id.toString(),
        s.pro_number,
        s.po_reference,
        s.bol_number,
        s.reference_number,
        s.origin_city,
        s.origin_state,
        s.origin_company,
        s.destination_city,
        s.destination_state,
        s.destination_company,
        s.carrier_name,
        s.mode_name,
        statusKey,
        s.origin_city && s.origin_state ? `${s.origin_city}, ${s.origin_state}` : null,
        s.destination_city && s.destination_state ? `${s.destination_city}, ${s.destination_state}` : null,
      ].filter(Boolean).map(f => f!.toLowerCase());

      const combinedText = searchableFields.join(' ');

      return searchTerms.every(term => combinedText.includes(term));
    });
  }, [shipments, searchQuery, activeStatus, activeQuickFilters]);

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
      origin_contact: s.origin_contact,
      origin_phone: s.origin_phone,
      destination_company: s.destination_company,
      destination_city: s.destination_city,
      destination_state: s.destination_state,
      destination_zip: s.destination_zip,
      destination_country: s.destination_country,
      destination_contact: s.destination_contact,
      destination_phone: s.destination_phone,
      carrier_name: s.carrier_name,
      mode_name: s.mode_name,
      equipment_name: s.equipment_name,
      driver_name: s.driver_name,
      driver_phone: s.driver_phone,
      truck_number: s.truck_number,
      trailer_number: s.trailer_number,
      status: s.is_cancelled ? 'Cancelled' : s.is_completed ? 'Completed' : s.status,
      total_weight: s.total_weight,
      total_pieces: s.total_pieces,
      total_packages: s.total_packages,
      number_of_pallets: s.number_of_pallets,
      linear_feet: s.linear_feet,
      miles: s.miles,
      freight_classes: s.freight_classes,
      commodities: s.commodities,
      item_descriptions: s.item_descriptions,
      has_hazmat: s.has_hazmat ? 'Yes' : 'No',
      created_date: s.created_date,
      customer_charge: s.customer_charge,
      shipment_value: s.shipment_value,
    }));
  }, [filteredShipments]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatMode = (mode: string | null) => {
    if (!mode) return null;
    const m = mode.toLowerCase();
    if (m.includes('less than truckload')) return 'LTL';
    if (m.includes('full truckload')) return 'FTL';
    if (m.includes('partial')) return 'PTL';
    return mode;
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return null;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  const showFinancials = isAdmin() && !isViewingAsCustomer;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Shipments</h1>
        <p className="text-gray-500 mt-1">Track and manage your shipments</p>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by Load ID, PRO#, Reference, City, Carrier, Company..."
          className="w-full pl-12 pr-12 py-4 text-lg border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
          autoFocus
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Zap className="w-4 h-4 text-gray-400" />
        {quickFilters.map(filter => {
          const isActive = activeQuickFilters.includes(filter.id);
          const count = shipments.filter(filter.filter).length;
          const FilterIcon = filter.icon;

          return (
            <button
              key={filter.id}
              onClick={() => toggleQuickFilter(filter.id)}
              className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all
                ${isActive ? filter.activeClass : filter.inactiveClass}
              `}
            >
              <FilterIcon className="w-3.5 h-3.5" />
              {filter.label}
              <span className={`ml-0.5 ${isActive ? 'opacity-80' : 'opacity-60'}`}>
                ({count})
              </span>
            </button>
          );
        })}

        {activeQuickFilters.length > 0 && (
          <button
            onClick={() => setActiveQuickFilters([])}
            className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <StatusTab
            label="All"
            count={shipments.length}
            active={activeStatus === 'all'}
            onClick={() => setActiveStatus('all')}
          />
          <StatusTab
            label="In Transit"
            count={statusCounts['In Transit'] || 0}
            active={activeStatus === 'In Transit'}
            onClick={() => setActiveStatus('In Transit')}
            color="blue"
          />
          <StatusTab
            label="Pending Pickup"
            count={statusCounts['Pending Pickup'] || 0}
            active={activeStatus === 'Pending Pickup'}
            onClick={() => setActiveStatus('Pending Pickup')}
            color="orange"
          />
          <StatusTab
            label="Delivered"
            count={statusCounts['Delivered'] || 0}
            active={activeStatus === 'Delivered'}
            onClick={() => setActiveStatus('Delivered')}
            color="green"
          />
          <StatusTab
            label="Completed"
            count={statusCounts['Completed'] || 0}
            active={activeStatus === 'Completed'}
            onClick={() => setActiveStatus('Completed')}
            color="green"
          />
          {(statusCounts['Cancelled'] || 0) > 0 && (
            <StatusTab
              label="Cancelled"
              count={statusCounts['Cancelled'] || 0}
              active={activeStatus === 'Cancelled'}
              onClick={() => setActiveStatus('Cancelled')}
              color="red"
            />
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          <ExportMenu
            data={shipmentExportData}
            columns={shipmentExportColumns}
            filename="shipments"
            title="Shipment Export"
            disabled={filteredShipments.length === 0}
          />
          <button
            onClick={() => setShowEmailModal(true)}
            disabled={filteredShipments.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <Mail className="w-4 h-4" />
            Email
          </button>
          {hasActiveFilters && (
            <button
              onClick={() => setShowSaveViewModal(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors"
            >
              <Bookmark className="w-4 h-4" />
              Save View
            </button>
          )}
        </div>
      </div>

      <div className="text-sm text-gray-500 mb-4">
        {filteredShipments.length} shipment{filteredShipments.length !== 1 ? 's' : ''}
        {searchQuery && ` matching "${searchQuery}"`}
      </div>

      <div className="space-y-2">
        {filteredShipments.map((shipment) => {
          const statusConfig = getStatusConfig(shipment.status, shipment.is_completed, shipment.is_cancelled);
          const StatusIcon = statusConfig.icon;
          const displayStatus = shipment.is_cancelled ? 'Cancelled' : shipment.is_completed ? 'Completed' : shipment.status;
          const mode = formatMode(shipment.mode_name);

          return (
            <div
              key={shipment.load_id}
              onClick={() => navigate(`/shipments/${shipment.load_id}`)}
              className="bg-white border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer group"
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
                  <span className="text-gray-400 flex-shrink-0">•</span>
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
                      <span className="text-gray-300">•</span>
                      <span>{mode}</span>
                    </>
                  )}
                  {shipment.po_reference && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span>PO: {shipment.po_reference}</span>
                    </>
                  )}
                  {shipment.reference_number && !shipment.po_reference && (
                    <>
                      <span className="text-gray-300">•</span>
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
            </div>
          );
        })}

        {filteredShipments.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No shipments found</p>
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-blue-600 hover:underline mt-2">
                Clear search
              </button>
            )}
          </div>
        )}
      </div>

      <SaveViewModal
        isOpen={showSaveViewModal}
        onClose={() => setShowSaveViewModal(false)}
        onSave={handleSaveView}
        filterSummary={{ searchQuery, activeStatus }}
      />

      <EmailReportModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        reportName="Shipments Export"
        reportData={shipmentExportData}
        reportType="shipments"
      />
    </div>
  );
}

function StatusTab({
  label,
  count,
  active,
  onClick,
  color = 'gray',
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  color?: 'gray' | 'blue' | 'orange' | 'green' | 'red';
}) {
  const colorClasses: Record<string, string> = {
    gray: active ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    blue: active ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100',
    orange: active ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-700 hover:bg-orange-100',
    green: active ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100',
    red: active ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100',
  };

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-colors ${colorClasses[color]}`}
    >
      {label}
      <span className={`ml-2 ${active ? 'opacity-80' : 'opacity-60'}`}>{count}</span>
    </button>
  );
}
