import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getSecureTable } from '../utils/getSecureTable';

export interface ComparisonStats {
  totalSpend: number;
  shipmentCount: number;
  avgCostPerShipment: number;
  inTransit: number;
}

interface UseComparisonStatsResult {
  currentStats: ComparisonStats | null;
  comparisonStats: ComparisonStats | null;
  isLoading: boolean;
}

export function useComparisonStats(
  effectiveCustomerIds: number[],
  isAdmin: boolean,
  isViewingAsCustomer: boolean,
  currentStart: string,
  currentEnd: string,
  comparisonStart: string | null,
  comparisonEnd: string | null
): UseComparisonStatsResult {
  const [currentStats, setCurrentStats] = useState<ComparisonStats | null>(null);
  const [comparisonStats, setComparisonStats] = useState<ComparisonStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [effectiveCustomerIds, isAdmin, isViewingAsCustomer, currentStart, currentEnd, comparisonStart, comparisonEnd]);

  const fetchStatsForPeriod = async (startDate: string, endDate: string): Promise<ComparisonStats> => {
    const table = getSecureTable('shipment', isAdmin, isViewingAsCustomer);

    let query = supabase
      .from(table)
      .select('load_id, retail, shipment_status:status_id(is_completed, is_cancelled)');

    if (!isAdmin || isViewingAsCustomer) {
      query = query.in('customer_id', effectiveCustomerIds);
    }

    const { data: shipments } = await query
      .gte('pickup_date', startDate)
      .lte('pickup_date', endDate);

    if (!shipments || shipments.length === 0) {
      return {
        totalSpend: 0,
        shipmentCount: 0,
        avgCostPerShipment: 0,
        inTransit: 0,
      };
    }

    const totalSpend = shipments.reduce(
      (sum: number, s: any) => sum + (parseFloat(s.retail) || 0),
      0
    );

    const inTransit = shipments.filter(
      (s: any) => s.shipment_status && !s.shipment_status.is_completed && !s.shipment_status.is_cancelled
    ).length;

    return {
      totalSpend,
      shipmentCount: shipments.length,
      avgCostPerShipment: shipments.length > 0 ? totalSpend / shipments.length : 0,
      inTransit,
    };
  };

  const loadStats = async () => {
    if (effectiveCustomerIds.length === 0) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const current = await fetchStatsForPeriod(currentStart, currentEnd);
      setCurrentStats(current);

      if (comparisonStart && comparisonEnd) {
        const comparison = await fetchStatsForPeriod(comparisonStart, comparisonEnd);
        setComparisonStats(comparison);
      } else {
        setComparisonStats(null);
      }
    } catch (error) {
      console.error('Error loading comparison stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { currentStats, comparisonStats, isLoading };
}
