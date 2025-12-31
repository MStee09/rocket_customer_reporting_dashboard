# Phase 2-4: UI/UX Improvements
## P1 High Priority Items

---

# Phase 2: Widget Gallery Redesign

## Replace `src/components/dashboard/WidgetGalleryModal.tsx`

```typescript
import { useState, useMemo, useEffect, createElement } from 'react';
import {
  X, Search, Plus, Star, TrendingUp,
  Package, DollarSign, PieChart, BarChart3, Map, Table, Globe,
  ChevronRight, ChevronDown, Sparkles, Lock
} from 'lucide-react';
import { widgetLibrary, WidgetDefinition } from '../../config/widgetLibrary';
import { WidgetSkeleton } from './WidgetSkeleton';
import {
  getWidgetConstraints,
  isValidWidgetSize,
  getSizeLabel,
  WidgetSizeConstraint
} from '../../config/widgetConstraints';

interface WidgetGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWidget: (widgetId: string, size: WidgetSizeConstraint) => void;
  currentWidgets: string[];
  isAdmin: boolean;
}

interface WidgetWithMeta extends WidgetDefinition {
  isNew?: boolean;
  isRecommended?: boolean;
}

const typeIcons: Record<string, typeof Star> = {
  kpi: TrendingUp,
  featured_kpi: Star,
  bar_chart: BarChart3,
  line_chart: TrendingUp,
  pie_chart: PieChart,
  table: Table,
  map: Map,
};

// Configure which widgets are "new" - update these as you add widgets
const NEW_WIDGET_IDS = ['carrier_performance', 'cost_by_state'];

// Configure recommended widgets - could be driven by analytics
const RECOMMENDED_WIDGET_IDS = ['total_shipments', 'total_cost', 'monthly_spend', 'flow_map', 'carrier_mix', 'on_time_pct'];

export function WidgetGalleryModal({
  isOpen,
  onClose,
  onAddWidget,
  currentWidgets,
  isAdmin,
}: WidgetGalleryModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWidget, setSelectedWidget] = useState<WidgetDefinition | null>(null);
  const [selectedSize, setSelectedSize] = useState<WidgetSizeConstraint>(1);
  const [expandedRecommended, setExpandedRecommended] = useState(true);
  const [expandedNew, setExpandedNew] = useState(true);
  const [showAllWidgets, setShowAllWidgets] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedWidget(null);
      setSelectedSize(1);
      setExpandedRecommended(true);
      setExpandedNew(true);
      setShowAllWidgets(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedWidget) {
      const constraints = getWidgetConstraints(selectedWidget.id, selectedWidget.type);
      setSelectedSize(constraints.optimalSize);
    }
  }, [selectedWidget]);

  const allWidgets = useMemo((): WidgetWithMeta[] => {
    return Object.values(widgetLibrary)
      .filter(w => !(w.adminOnly && !isAdmin))
      .map(w => ({
        ...w,
        isNew: NEW_WIDGET_IDS.includes(w.id),
        isRecommended: RECOMMENDED_WIDGET_IDS.includes(w.id),
      }));
  }, [isAdmin]);

  const searchFilteredWidgets = useMemo(() => {
    if (!searchQuery) return allWidgets;
    const query = searchQuery.toLowerCase();
    return allWidgets.filter(w =>
      w.name.toLowerCase().includes(query) ||
      w.description.toLowerCase().includes(query) ||
      w.category.toLowerCase().includes(query)
    );
  }, [allWidgets, searchQuery]);

  const recommendedWidgets = useMemo(() => 
    searchFilteredWidgets.filter(w => w.isRecommended && !currentWidgets.includes(w.id)),
    [searchFilteredWidgets, currentWidgets]
  );

  const newWidgets = useMemo(() => 
    searchFilteredWidgets.filter(w => w.isNew && !currentWidgets.includes(w.id)),
    [searchFilteredWidgets, currentWidgets]
  );

  const handleAdd = () => {
    if (selectedWidget) {
      onAddWidget(selectedWidget.id, selectedSize);
      onClose();
    }
  };

  const renderWidgetCard = (widget: WidgetWithMeta) => {
    const Icon = typeIcons[widget.type] || Package;
    const isOnDashboard = currentWidgets.includes(widget.id);
    const isSelected = selectedWidget?.id === widget.id;

    return (
      <button
        key={widget.id}
        onClick={() => !isOnDashboard && setSelectedWidget(widget)}
        disabled={isOnDashboard}
        className={`
          p-4 rounded-xl border-2 text-left transition-all relative
          ${isOnDashboard
            ? 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'
            : isSelected
              ? 'border-orange-500 bg-orange-50'
              : widget.isNew
                ? 'border-violet-200 bg-violet-50 hover:border-violet-300'
                : widget.isRecommended
                  ? 'border-amber-200 bg-amber-50 hover:border-amber-300'
                  : 'border-slate-200 hover:border-orange-300 hover:bg-slate-50'
          }
        `}
      >
        {widget.isNew && !isOnDashboard && (
          <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-violet-500 text-white text-xs font-bold">
            NEW
          </span>
        )}
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 ${widget.iconColor} rounded-xl flex items-center justify-center flex-shrink-0`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-900 text-sm">{widget.name}</span>
              {isOnDashboard && (
                <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">Added</span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{widget.description}</p>
          </div>
        </div>
      </button>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Widget Gallery</h2>
              <p className="text-sm text-slate-500">Choose widgets to add to your dashboard</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search */}
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search widgets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                />
              </div>
            </div>

            {/* Widget Sections */}
            <div className="flex-1 overflow-auto p-4 space-y-6">
              
              {/* Recommended */}
              {recommendedWidgets.length > 0 && (
                <div>
                  <button
                    onClick={() => setExpandedRecommended(!expandedRecommended)}
                    className="flex items-center gap-2 mb-3 w-full text-left"
                  >
                    <Star className="w-4 h-4 text-amber-500" />
                    <h3 className="text-sm font-semibold text-slate-700">Recommended for You</h3>
                    <span className="text-xs text-slate-400">({recommendedWidgets.length})</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 ml-auto transition-transform ${expandedRecommended ? '' : '-rotate-90'}`} />
                  </button>
                  {expandedRecommended && (
                    <div className="grid grid-cols-2 gap-3">
                      {recommendedWidgets.slice(0, 6).map(renderWidgetCard)}
                    </div>
                  )}
                </div>
              )}

              {/* New Widgets */}
              {newWidgets.length > 0 && (
                <div>
                  <button
                    onClick={() => setExpandedNew(!expandedNew)}
                    className="flex items-center gap-2 mb-3 w-full text-left"
                  >
                    <Sparkles className="w-4 h-4 text-violet-500" />
                    <h3 className="text-sm font-semibold text-slate-700">New Widgets</h3>
                    <span className="px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600 text-xs font-semibold">
                      {newWidgets.length} new
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 ml-auto transition-transform ${expandedNew ? '' : '-rotate-90'}`} />
                  </button>
                  {expandedNew && (
                    <div className="grid grid-cols-2 gap-3">
                      {newWidgets.map(renderWidgetCard)}
                    </div>
                  )}
                </div>
              )}

              {/* All Widgets */}
              <div>
                <button
                  onClick={() => setShowAllWidgets(!showAllWidgets)}
                  className="flex items-center gap-2 mb-3 w-full text-left pt-4 border-t border-slate-200"
                >
                  <Package className="w-4 h-4 text-slate-400" />
                  <h3 className="text-sm font-semibold text-slate-700">All Widgets</h3>
                  <span className="text-xs text-slate-400">({searchFilteredWidgets.length})</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 ml-auto transition-transform ${showAllWidgets ? '' : '-rotate-90'}`} />
                </button>
                {showAllWidgets && (
                  <div className="grid grid-cols-2 gap-3">
                    {searchFilteredWidgets.map(renderWidgetCard)}
                  </div>
                )}
              </div>

              {searchFilteredWidgets.length === 0 && (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No widgets found</p>
                </div>
              )}
            </div>
          </div>

          {/* Preview Panel */}
          <div className="w-80 border-l border-slate-200 p-4 bg-slate-50 flex-shrink-0 flex flex-col">
            {selectedWidget ? (
              <>
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Preview</div>
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
                  <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2">
                    <div className={`w-6 h-6 ${selectedWidget.iconColor} rounded-lg flex items-center justify-center`}>
                      {createElement(typeIcons[selectedWidget.type] || Package, { className: 'w-3 h-3 text-white' })}
                    </div>
                    <span className="text-sm font-medium text-slate-900">{selectedWidget.name}</span>
                  </div>
                  <div className="p-3">
                    <WidgetSkeleton widgetType={selectedWidget.type} size={selectedSize} showHeader={false} />
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-xs font-medium text-slate-500 mb-2">Size</div>
                  <div className="flex gap-2">
                    {([1, 2, 3] as WidgetSizeConstraint[]).map((size) => {
                      const isValid = isValidWidgetSize(size, selectedWidget.id, selectedWidget.type);
                      const isActive = selectedSize === size;
                      const constraints = getWidgetConstraints(selectedWidget.id, selectedWidget.type);
                      const isOptimal = size === constraints.optimalSize;

                      return (
                        <button
                          key={size}
                          onClick={() => isValid && setSelectedSize(size)}
                          disabled={!isValid}
                          className={`
                            flex-1 py-2.5 rounded-lg text-sm font-medium transition-all relative
                            ${isActive ? 'bg-orange-500 text-white' : isValid ? 'bg-white border border-slate-200 text-slate-600 hover:border-orange-300' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}
                          `}
                        >
                          {!isValid && <Lock className="w-3 h-3 absolute top-1 right-1 text-slate-400" />}
                          {getSizeLabel(size)}
                          {isOptimal && isValid && !isActive && <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="text-sm text-slate-600 mb-4">{selectedWidget.description}</div>

                <button
                  onClick={handleAdd}
                  className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors mt-auto"
                >
                  <Plus className="w-4 h-4" />
                  Add to Dashboard
                </button>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <ChevronRight className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-500 font-medium">Select a widget</p>
                  <p className="text-sm text-slate-400 mt-1">Click any widget to preview</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

# Phase 3: Date Range Simplification

## Create `src/components/dashboard/DateRangeSelector.tsx`

```typescript
import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

interface DateRangeSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const primaryOptions = [
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'thisQuarter', label: 'This Quarter' },
  { value: 'thisYear', label: 'This Year' },
];

const moreOptions = [
  { value: 'last7', label: 'Last 7 Days' },
  { value: 'last90', label: 'Last 90 Days' },
  { value: 'last6months', label: 'Last 6 Months' },
  { value: 'lastyear', label: 'Last Year' },
  { value: 'thisMonth', label: 'This Month' },
];

export function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  const [showMore, setShowMore] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowMore(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isPrimarySelected = primaryOptions.some(opt => opt.value === value);
  const selectedOption = [...primaryOptions, ...moreOptions].find(opt => opt.value === value);

  return (
    <div className="flex items-center gap-2">
      {/* Primary Pills */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
        {primaryOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${value === option.value
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }
            `}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* More Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowMore(!showMore)}
          className={`
            px-4 py-2 rounded-xl text-sm font-medium border transition-all flex items-center gap-2
            ${!isPrimarySelected
              ? 'bg-orange-50 border-orange-200 text-orange-700'
              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
            }
          `}
        >
          {!isPrimarySelected && selectedOption ? selectedOption.label : 'More'}
          <ChevronDown className={`w-4 h-4 transition-transform ${showMore ? 'rotate-180' : ''}`} />
        </button>

        {showMore && (
          <div className="absolute top-full mt-2 right-0 bg-white rounded-xl shadow-lg border border-slate-200 py-2 min-w-[180px] z-50">
            {moreOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setShowMore(false);
                }}
                className={`
                  w-full px-4 py-2 text-left text-sm transition-colors
                  ${value === option.value ? 'bg-orange-50 text-orange-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}
                `}
              >
                {option.label}
              </button>
            ))}
            <div className="border-t border-slate-100 mt-2 pt-2">
              <button className="w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Custom Range...
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Update `src/components/dashboard/DashboardHeader.tsx`

```typescript
import { ReactNode } from 'react';
import { DateRangeSelector } from './DateRangeSelector';

interface DashboardHeaderProps {
  userName: string;
  isViewingAsCustomer: boolean;
  dateRange: string;
  onDateRangeChange: (range: string) => void;
  customizeButton?: ReactNode;
}

export function DashboardHeader({
  userName,
  isViewingAsCustomer,
  dateRange,
  onDateRangeChange,
  customizeButton,
}: DashboardHeaderProps) {
  return (
    <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 mb-2">
          Welcome back, {userName}!
        </h1>
        <p className="text-slate-600">
          {isViewingAsCustomer ? 'Viewing customer dashboard' : 'Your logistics dashboard'}
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <DateRangeSelector value={dateRange} onChange={onDateRangeChange} />
        {customizeButton}
      </div>
    </div>
  );
}
```

---

## Update `src/components/dashboard/index.ts`

Add export:

```typescript
export { DateRangeSelector } from './DateRangeSelector';
```

---

# Phase 4: Shipments Performance

## Update `src/pages/ShipmentsPage.tsx`

Key changes:
1. Remove QuickFilters import and component
2. Change limit from 500 to 50
3. Add "Load More" button
4. Server-side search

```typescript
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Package, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useSavedViews } from '../hooks/useSavedViews';
import { SaveViewModal } from '../components/shipments/SaveViewModal';
import { EmailReportModal } from '../components/reports/EmailReportModal';
import { ShipmentDetailDrawer } from '../components/shipments/ShipmentDetailDrawer';
import { StatusTabs } from '../components/shipments/StatusTabs';
import { ShipmentsToolbar } from '../components/shipments/ShipmentsToolbar';
import { ShipmentRow } from '../components/shipments/ShipmentRow';
import { ColumnConfig } from '../services/exportService';

// ... (keep all the interface definitions the same)

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
  const [activeStatus, setActiveStatus] = useState<string>('all');
  const [showSaveViewModal, setShowSaveViewModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);

  const hasActiveFilters = searchQuery.trim() !== '' || activeStatus !== 'all';

  // Load initial shipments
  const loadShipments = async (offset = 0, append = false) => {
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
      // ... (keep the enrichment logic the same)
      const enrichedData = data.map((shipment: any) => {
        // ... enrichment code stays the same
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
  };

  const handleLoadMore = () => {
    loadShipments(shipments.length, true);
  };

  useEffect(() => {
    if (effectiveCustomerIds.length > 0) {
      loadShipments();
    }
  }, [effectiveCustomerIds]);

  // ... (keep the rest of the component logic)

  // In the render, remove QuickFilters and add Load More button:
  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Shipments</h1>
        <p className="text-gray-500 mt-1">Track and manage your shipments</p>
      </div>

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

      {/* REMOVED: QuickFilters component */}

      <div className="flex items-center justify-between mb-6">
        <StatusTabs
          statusCounts={statusCounts}
          activeStatus={activeStatus}
          onStatusChange={setActiveStatus}
          totalCount={shipments.length}
        />
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
            onClick={() => setSelectedShipment(shipment)}
            showFinancials={showFinancials}
          />
        ))}

        {filteredShipments.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No shipments found</p>
          </div>
        )}
      </div>

      {/* Load More Button */}
      {hasMore && !loading && (
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

      {/* ... rest of modals */}
    </div>
  );
}
```

---

# Testing Checklist for Phases 2-4

## Phase 2: Widget Gallery
- [ ] Gallery opens from dashboard
- [ ] "Recommended" section shows 6 widgets
- [ ] "New" section shows widgets with NEW badge
- [ ] "All Widgets" is collapsed by default
- [ ] Search filters across all sections
- [ ] Preview panel shows selected widget
- [ ] Size selector works correctly
- [ ] "Add to Dashboard" adds widget

## Phase 3: Date Range
- [ ] Three primary pills visible (30 Days, Quarter, Year)
- [ ] Selected pill has white background
- [ ] "More" dropdown shows additional options
- [ ] Non-primary selection shows in "More" button
- [ ] Dropdown closes on outside click

## Phase 4: Shipments
- [ ] Initial load shows 50 shipments
- [ ] "Load More" button appears if more available
- [ ] QuickFilters are removed
- [ ] Search still works (client-side for now)
- [ ] Status tabs still work
