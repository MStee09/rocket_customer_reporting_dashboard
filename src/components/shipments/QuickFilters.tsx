import {
  Truck,
  CheckCircle,
  Clock,
  AlertTriangle,
  Calendar,
  DollarSign,
  Zap,
} from 'lucide-react';

interface Shipment {
  is_completed: boolean;
  is_cancelled: boolean;
  status: string;
  pickup_date: string | null;
  customer_charge: number;
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

export const quickFilters: QuickFilter[] = [
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

interface QuickFiltersProps {
  shipments: Shipment[];
  activeFilters: string[];
  onToggleFilter: (filterId: string) => void;
  onClearFilters: () => void;
}

export function QuickFilters({
  shipments,
  activeFilters,
  onToggleFilter,
  onClearFilters,
}: QuickFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <Zap className="w-4 h-4 text-gray-400" />
      {quickFilters.map(filter => {
        const isActive = activeFilters.includes(filter.id);
        const count = shipments.filter(filter.filter).length;
        const FilterIcon = filter.icon;

        return (
          <button
            key={filter.id}
            onClick={() => onToggleFilter(filter.id)}
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

      {activeFilters.length > 0 && (
        <button
          onClick={onClearFilters}
          className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
