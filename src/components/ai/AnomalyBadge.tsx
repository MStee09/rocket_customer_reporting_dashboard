import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AnomalyBadgeProps {
  customerId: string;
  onClick?: () => void;
}

export function AnomalyBadge({ customerId, onClick }: AnomalyBadgeProps) {
  const [count, setCount] = useState(0);
  const [hasCritical, setHasCritical] = useState(false);

  useEffect(() => {
    const fetchCount = async () => {
      if (!customerId) return;

      const { data } = await supabase.rpc('get_customer_anomalies', {
        p_customer_id: customerId,
        p_status: 'new',
        p_limit: 50
      });

      if (data) {
        setCount(data.length);
        setHasCritical(data.some((a: { severity: string }) => a.severity === 'critical'));
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, [customerId]);

  if (count === 0) return null;

  return (
    <button
      onClick={onClick}
      className={`relative p-2 rounded-lg transition-colors ${
        hasCritical
          ? 'text-red-600 hover:bg-red-50'
          : 'text-amber-600 hover:bg-amber-50'
      }`}
      title={`${count} anomalies detected`}
    >
      <AlertTriangle className="w-5 h-5" />
      <span className={`absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-xs font-bold text-white rounded-full ${
        hasCritical ? 'bg-red-500' : 'bg-amber-500'
      }`}>
        {count > 9 ? '9+' : count}
      </span>
    </button>
  );
}
