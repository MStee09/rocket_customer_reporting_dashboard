import { useState, useEffect } from 'react';
import { Clock, Package, Truck, CheckCircle, AlertTriangle, ArrowRight, Activity } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDistanceToNow } from 'date-fns';

interface RecentActivityFeedProps {
  customerId: string;
  maxItems?: number;
  onViewDetails?: (item: ActivityItem) => void;
}

interface ActivityItem {
  id: string;
  type: 'shipment' | 'delivery' | 'pickup' | 'alert';
  title: string;
  description: string;
  timestamp: Date;
  icon: 'package' | 'truck' | 'check' | 'alert';
  metadata?: {
    loadId?: string;
    carrierName?: string;
    status?: string;
  };
}

function getActivityIcon(icon: ActivityItem['icon']) {
  switch (icon) {
    case 'package':
      return <Package className="w-4 h-4" />;
    case 'truck':
      return <Truck className="w-4 h-4" />;
    case 'check':
      return <CheckCircle className="w-4 h-4" />;
    case 'alert':
      return <AlertTriangle className="w-4 h-4" />;
    default:
      return <Package className="w-4 h-4" />;
  }
}

function getIconStyles(icon: ActivityItem['icon']) {
  switch (icon) {
    case 'package':
      return 'bg-blue-100 text-blue-600';
    case 'truck':
      return 'bg-amber-100 text-amber-600';
    case 'check':
      return 'bg-emerald-100 text-emerald-600';
    case 'alert':
      return 'bg-red-100 text-red-600';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

export function RecentActivityFeed({ customerId, maxItems = 5, onViewDetails }: RecentActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadRecentActivity() {
      setIsLoading(true);
      try {
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        const { data: shipments, error } = await supabase
          .from('shipment')
          .select(`
            load_id,
            reference_number,
            pickup_date,
            delivery_date,
            created_date,
            retail,
            rate_carrier_id,
            status_id
          `)
          .eq('customer_id', parseInt(customerId))
          .or(`created_date.gte.${twentyFourHoursAgo.toISOString()},delivery_date.gte.${twentyFourHoursAgo.toISOString()},pickup_date.gte.${twentyFourHoursAgo.toISOString()}`)
          .order('created_date', { ascending: false })
          .limit(maxItems * 2);

        if (error) {
          console.error('Error loading activity:', error);
          setActivities([]);
          return;
        }

        if (!shipments || shipments.length === 0) {
          setActivities([]);
          return;
        }

        const carrierIds = [...new Set(shipments.map(s => s.rate_carrier_id).filter(Boolean))];
        let carrierMap: Record<number, string> = {};
        if (carrierIds.length > 0) {
          const { data: carriers } = await supabase
            .from('carrier')
            .select('carrier_id, carrier_name')
            .in('carrier_id', carrierIds);
          if (carriers) {
            carrierMap = Object.fromEntries(carriers.map(c => [c.carrier_id, c.carrier_name]));
          }
        }

        const statusIds = [...new Set(shipments.map(s => s.status_id).filter(Boolean))];
        let statusMap: Record<number, { description: string; isCompleted: boolean }> = {};
        if (statusIds.length > 0) {
          const { data: statuses } = await supabase
            .from('shipment_status')
            .select('status_id, status_description, is_completed')
            .in('status_id', statusIds);
          if (statuses) {
            statusMap = Object.fromEntries(
              statuses.map(s => [s.status_id, { description: s.status_description || '', isCompleted: s.is_completed || false }])
            );
          }
        }

        const activityItems: ActivityItem[] = [];

        for (const shipment of shipments) {
          const carrierName = carrierMap[shipment.rate_carrier_id] || 'Unknown';
          const statusInfo = statusMap[shipment.status_id] || { description: 'Unknown', isCompleted: false };
          const statusDesc = statusInfo.description;
          const isCompleted = statusInfo.isCompleted;

          if (shipment.delivery_date && new Date(shipment.delivery_date) >= twentyFourHoursAgo) {
            activityItems.push({
              id: `delivery-${shipment.load_id}`,
              type: 'delivery',
              title: 'Shipment Delivered',
              description: `${shipment.reference_number || shipment.load_id} delivered via ${carrierName}`,
              timestamp: new Date(shipment.delivery_date),
              icon: 'check',
              metadata: {
                loadId: shipment.load_id,
                carrierName,
                status: statusDesc,
              },
            });
          } else if (shipment.pickup_date && new Date(shipment.pickup_date) >= twentyFourHoursAgo && !isCompleted) {
            activityItems.push({
              id: `pickup-${shipment.load_id}`,
              type: 'pickup',
              title: 'Shipment Picked Up',
              description: `${shipment.reference_number || shipment.load_id} in transit with ${carrierName}`,
              timestamp: new Date(shipment.pickup_date),
              icon: 'truck',
              metadata: {
                loadId: shipment.load_id,
                carrierName,
                status: statusDesc,
              },
            });
          } else if (shipment.created_date && new Date(shipment.created_date) >= twentyFourHoursAgo) {
            activityItems.push({
              id: `created-${shipment.load_id}`,
              type: 'shipment',
              title: 'New Shipment Created',
              description: `${shipment.reference_number || shipment.load_id} - ${carrierName}`,
              timestamp: new Date(shipment.created_date),
              icon: 'package',
              metadata: {
                loadId: shipment.load_id,
                carrierName,
                status: statusDesc,
              },
            });
          }
        }

        activityItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        setActivities(activityItems.slice(0, maxItems));
      } catch (err) {
        console.error('Error:', err);
        setActivities([]);
      } finally {
        setIsLoading(false);
      }
    }

    if (customerId) {
      loadRecentActivity();
    }
  }, [customerId, maxItems]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-slate-100 rounded-xl animate-pulse" />
          <div>
            <div className="h-5 bg-slate-100 rounded w-32 mb-1 animate-pulse" />
            <div className="h-4 bg-slate-100 rounded w-24 animate-pulse" />
          </div>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-3">
              <div className="w-8 h-8 bg-slate-100 rounded-lg animate-pulse" />
              <div className="flex-1">
                <div className="h-4 bg-slate-100 rounded w-40 mb-2 animate-pulse" />
                <div className="h-3 bg-slate-100 rounded w-56 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
            <Activity className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Recent Activity</h3>
            <p className="text-sm text-slate-500">Last 24 hours</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-slate-400">
          <Clock className="w-4 h-4" />
          <span className="text-xs">Live</span>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl">
          No recent activity in the last 24 hours
        </div>
      ) : (
        <div className="space-y-1">
          {activities.map((activity) => (
            <button
              key={activity.id}
              onClick={() => onViewDetails?.(activity)}
              className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors w-full text-left group"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${getIconStyles(activity.icon)}`}>
                {getActivityIcon(activity.icon)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-900 text-sm">{activity.title}</span>
                  <span className="text-xs text-slate-400 flex-shrink-0">
                    {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-slate-500 truncate mt-0.5">{activity.description}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0 mt-1" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
