import { useNavigate } from 'react-router-dom';
import { Sparkles, FileText, Truck, TrendingUp, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface QuickActionsProps {
  customerId?: string;
}

export function QuickActions({ customerId }: QuickActionsProps) {
  const navigate = useNavigate();
  const [anomalyCount, setAnomalyCount] = useState(0);

  useEffect(() => {
    if (!customerId) return;

    const loadAnomalyCount = async () => {
      const { count } = await supabase
        .from('widget_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', parseInt(customerId, 10))
        .eq('status', 'active');

      setAnomalyCount(count || 0);
    };

    loadAnomalyCount();
  }, [customerId]);

  const actions = [
    {
      icon: Sparkles,
      label: 'Ask AI',
      description: 'Get instant answers',
      onClick: () => navigate('/ai-studio'),
      color: 'rocket',
    },
    {
      icon: FileText,
      label: 'New Report',
      description: 'Build custom report',
      onClick: () => navigate('/ai-studio?mode=report'),
      color: 'blue',
    },
    {
      icon: Truck,
      label: 'Track Shipment',
      description: 'Find by PRO or ID',
      onClick: () => navigate('/shipments'),
      color: 'emerald',
    },
    {
      icon: TrendingUp,
      label: 'Analytics',
      description: 'Explore your data',
      onClick: () => navigate('/analytics'),
      color: 'amber',
    },
  ];

  const colorClasses: Record<string, { bg: string; icon: string; hover: string }> = {
    rocket: { bg: 'bg-rocket-50', icon: 'text-rocket-600', hover: 'hover:bg-rocket-100' },
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600', hover: 'hover:bg-blue-100' },
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', hover: 'hover:bg-emerald-100' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-600', hover: 'hover:bg-amber-100' },
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Quick Actions</h3>
        {anomalyCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-sm font-medium">
            <AlertTriangle className="w-4 h-4" />
            {anomalyCount} {anomalyCount === 1 ? 'Alert' : 'Alerts'}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {actions.map((action) => {
          const colors = colorClasses[action.color];
          return (
            <button
              key={action.label}
              onClick={action.onClick}
              className={`p-4 rounded-xl ${colors.bg} ${colors.hover} transition-colors text-left group`}
            >
              <action.icon className={`w-6 h-6 ${colors.icon} mb-2`} />
              <div className="font-medium text-gray-900 text-sm">{action.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{action.description}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
