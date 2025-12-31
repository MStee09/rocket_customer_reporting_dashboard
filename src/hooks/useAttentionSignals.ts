import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { detectAttentionSignals, AttentionSignalsResponse } from '../services/attentionSignalService';

interface UseAttentionSignalsParams {
  dateRange: { start: string; end: string };
}

export function useAttentionSignals({ dateRange }: UseAttentionSignalsParams) {
  const { effectiveCustomerId, isAdmin, isViewingAsCustomer } = useAuth();
  const [data, setData] = useState<AttentionSignalsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSignals = useCallback(async () => {
    if (!effectiveCustomerId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await detectAttentionSignals({
        supabase,
        customerId: effectiveCustomerId,
        isAdmin: isAdmin(),
        isViewingAsCustomer,
        dateRange,
      });
      setData(response);
    } catch (err) {
      console.error('Error fetching attention signals:', err);
      setError('Unable to analyze data for attention signals');
    } finally {
      setIsLoading(false);
    }
  }, [effectiveCustomerId, isAdmin, isViewingAsCustomer, dateRange.start, dateRange.end]);

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  return {
    signals: data?.signals || [],
    allClear: data?.allClear ?? true,
    analyzedAt: data?.analyzedAt,
    isLoading,
    error,
    refresh: fetchSignals,
  };
}
