import { Building2, Edit2, History, Plus, Loader2, Package, MapPin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { CustomerIntelligenceProfile } from '../../types/customerIntelligence';

interface CustomerProfileCardProps {
  customer: { customer_id: number; customer_name: string };
  profile: CustomerIntelligenceProfile | null;
  onEdit: () => void;
  onViewHistory: () => void;
  onSetup: () => void;
  isSettingUp?: boolean;
}

export function CustomerProfileCard({
  customer,
  profile,
  onEdit,
  onViewHistory,
  onSetup,
  isSettingUp = false,
}: CustomerProfileCardProps) {
  const priorityList = profile?.priorities?.slice(0, 3).map((p) => p.name).join(', ') || '';
  const hasMorePriorities = (profile?.priorities?.length || 0) > 3;

  const productCount = profile?.products?.length || 0;
  const marketCount = profile?.keyMarkets?.length || 0;

  const updatedAgo = profile?.updatedAt
    ? formatDistanceToNow(new Date(profile.updatedAt), { addSuffix: true })
    : '';

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-gray-900 text-lg truncate">
              {customer.customer_name}
            </h4>

            {profile ? (
              <>
                {priorityList && (
                  <p className="text-sm text-gray-600 mt-1 truncate">
                    {priorityList}
                    {hasMorePriorities && '...'}
                  </p>
                )}

                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  {productCount > 0 && (
                    <span className="flex items-center gap-1">
                      <Package className="w-3.5 h-3.5" />
                      {productCount} product{productCount !== 1 ? 's' : ''}
                    </span>
                  )}
                  {marketCount > 0 && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {marketCount} market{marketCount !== 1 ? 's' : ''}
                    </span>
                  )}
                  {updatedAgo && (
                    <span className="text-gray-400">
                      Updated {updatedAgo}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400 italic mt-1">No profile yet</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {profile ? (
            <>
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit
              </button>
              <button
                onClick={onViewHistory}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                <History className="w-3.5 h-3.5" />
                History
              </button>
            </>
          ) : (
            <button
              onClick={onSetup}
              disabled={isSettingUp}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {isSettingUp ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  Setup
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default CustomerProfileCard;
