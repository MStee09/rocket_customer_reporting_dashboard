import { useState } from 'react';
import { Play, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface RunAnomalyDetectionProps {
  customerId?: number | string;
}

export function RunAnomalyDetection({ customerId }: RunAnomalyDetectionProps) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ success: boolean; count?: number; error?: string } | null>(null);

  const runDetection = async () => {
    setRunning(true);
    setResult(null);

    try {
      if (customerId) {
        const customerIdNum = typeof customerId === 'string' ? parseInt(customerId, 10) : customerId;
        const { data, error } = await supabase.rpc('run_anomaly_detection', {
          p_customer_id: customerIdNum
        });

        if (error) throw error;
        setResult({ success: true, count: data });
      } else {
        const { data, error } = await supabase.rpc('run_anomaly_detection_all');

        if (error) throw error;
        const totalCount = data?.reduce((sum: number, r: { anomalies_found: number }) => sum + r.anomalies_found, 0) || 0;
        setResult({ success: true, count: totalCount });
      }
    } catch (err) {
      setResult({
        success: false,
        error: err instanceof Error ? err.message : 'Detection failed'
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={runDetection}
        disabled={running}
        className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
      >
        {running ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Play className="w-4 h-4" />
        )}
        {customerId ? 'Run Detection' : 'Run All Customers'}
      </button>

      {result && (
        <div className={`flex items-center gap-2 text-sm ${result.success ? 'text-green-600' : 'text-red-600'}`}>
          {result.success ? (
            <>
              <CheckCircle className="w-4 h-4" />
              Found {result.count} anomalies
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4" />
              {result.error}
            </>
          )}
        </div>
      )}
    </div>
  );
}
