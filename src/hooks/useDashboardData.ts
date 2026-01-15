import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { getSecureTable, getSelectFields } from '../utils/getSecureTable';
import { logger } from '../utils/logger';

export interface DashboardStats {
  totalShipments: number;
  inTransit: number;
  deliveredThisMonth: number;
  totalCost: number;
  totalMargin?: number;
  avgCostPerShipment: number;
}

export interface MonthlyDataPoint {
  month: string;
  totalCost: number;
  shipmentCount: number;
}

export interface ModeData {
  name: string;
  value: number;
}

export interface CarrierData {
  name: string;
  value: number;
}

export interface LaneData {
  origin: string;
  destination: string;
  shipmentCount: number;
  avgCost: number;
  totalCost: number;
}

export interface CustomerData {
  customerId: number;
  customerName: string;
  shipmentCount: number;
  totalSpend: number;
  avgCostPerShipment: number;
}

export interface PerformanceData {
  onTimePercentage?: number;
  avgTransitDays?: number;
}

export function useDashboardStats(
  effectiveCustomerIds: number[],
  isAdmin: boolean,
  isViewingAsCustomer: boolean,
  startDate: string,
  endDate: string
) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [effectiveCustomerIds, isAdmin, isViewingAsCustomer, startDate, endDate]);

  const loadStats = async () => {
    if (!isAdmin && effectiveCustomerIds.length === 0) {
      logger.log('[Dashboard] No customer IDs available, skipping query');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      logger.log('[Dashboard] Loading stats with:', {
        effectiveCustomerIds,
        isAdmin,
        isViewingAsCustomer,
        startDate,
        endDate
      });

      const table = getSecureTable('shipment', isAdmin, isViewingAsCustomer);
      const selectFields = getSelectFields(
        'load_id, retail, cost, delivery_date, status_id, shipment_status:status_id(status_id, is_completed, is_cancelled)',
        isAdmin,
        isViewingAsCustomer
      );

      let query = supabase
        .from(table)
        .select(selectFields);

      if (!isAdmin || isViewingAsCustomer) {
        logger.log('[Dashboard] Filtering by customer_id IN:', effectiveCustomerIds);
        query = query.in('customer_id', effectiveCustomerIds);
      } else {
        logger.log('[Dashboard] Admin mode - no customer_id filter');
      }

      const { data: shipments, error } = await query
        .gte('pickup_date', startDate)
        .lte('pickup_date', endDate);

      logger.log('[Dashboard] Query result:', {
        table,
        count: shipments?.length,
        error,
        customerIds: effectiveCustomerIds,
        sample: shipments?.slice(0, 2)
      });

      if (shipments) {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const totalShipments = shipments.length;
        const inTransit = shipments.filter(
          (s: any) => s.shipment_status && !s.shipment_status.is_completed && !s.shipment_status.is_cancelled
        ).length;
        const deliveredThisMonth = shipments.filter(
          (s: any) =>
            s.shipment_status?.is_completed &&
            s.delivery_date &&
            new Date(s.delivery_date) >= firstDayOfMonth
        ).length;
        const totalCost = shipments.reduce(
          (sum: number, s: any) => sum + (parseFloat(s.retail) || 0),
          0
        );
        const avgCostPerShipment = totalShipments > 0 ? totalCost / totalShipments : 0;

        const statsData: DashboardStats = {
          totalShipments,
          inTransit,
          deliveredThisMonth,
          totalCost,
          avgCostPerShipment,
        };

        if (isAdmin && !isViewingAsCustomer) {
          const totalCarrierCost = shipments.reduce(
            (sum: number, s: any) => sum + (parseFloat(s.cost) || 0),
            0
          );
          statsData.totalMargin = totalCost - totalCarrierCost;
        }

        setStats(statsData);
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { stats, isLoading, reload: loadStats };
}

export function useMonthlyTrend(
  effectiveCustomerIds: number[],
  isAdmin: boolean,
  isViewingAsCustomer: boolean,
  startDate: string,
  endDate: string
) {
  const [data, setData] = useState<MonthlyDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [effectiveCustomerIds, isAdmin, isViewingAsCustomer, startDate, endDate]);

  const loadData = async () => {
    if (!isAdmin && effectiveCustomerIds.length === 0) {
      logger.log('[Dashboard] No customer IDs available, skipping query');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const table = getSecureTable('shipment', isAdmin, isViewingAsCustomer);
      logger.log('[Monthly Trend] Using table:', table, 'customer_ids:', effectiveCustomerIds);

      let query = supabase
        .from(table)
        .select('load_id, retail, pickup_date, shipment_status:status_id(status_name)');

      if (!isAdmin || isViewingAsCustomer) {
        query = query.in('customer_id', effectiveCustomerIds);
      }

      const { data: shipments, error } = await query
        .gte('pickup_date', startDate)
        .lte('pickup_date', endDate);

      logger.log('[Monthly Trend] Query result:', { count: shipments?.length, error });

      if (shipments) {
        const filteredShipments = shipments.filter(
          (s: any) =>
            s.shipment_status?.status_name &&
            s.shipment_status.status_name.toLowerCase() !== 'cancelled' &&
            s.shipment_status.status_name.toLowerCase() !== 'quoted'
        );

        const monthlyMetrics: { [key: string]: { cost: number; count: number } } = {};

        filteredShipments.forEach((shipment: any) => {
          if (!shipment.retail || !shipment.pickup_date) return;

          const monthKey = format(new Date(shipment.pickup_date), 'yyyy-MM');

          if (!monthlyMetrics[monthKey]) {
            monthlyMetrics[monthKey] = { cost: 0, count: 0 };
          }

          monthlyMetrics[monthKey].cost += parseFloat(shipment.retail);
          monthlyMetrics[monthKey].count += 1;
        });

        const monthlyDataArray: MonthlyDataPoint[] = Object.entries(monthlyMetrics)
          .map(([month, metrics]) => ({
            month: format(new Date(month + '-01'), 'MMM yyyy'),
            totalCost: metrics.cost,
            shipmentCount: metrics.count,
          }))
          .sort((a, b) => {
            const dateA = new Date(a.month);
            const dateB = new Date(b.month);
            return dateA.getTime() - dateB.getTime();
          });

        setData(monthlyDataArray);
      }
    } catch (error) {
      console.error('Error loading monthly trend:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { data, isLoading };
}

export function useShipmentModes(
  effectiveCustomerIds: number[],
  isAdmin: boolean,
  isViewingAsCustomer: boolean,
  startDate: string,
  endDate: string
) {
  const [data, setData] = useState<ModeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [effectiveCustomerIds, isAdmin, isViewingAsCustomer, startDate, endDate]);

  const loadData = async () => {
    if (!isAdmin && effectiveCustomerIds.length === 0) {
      logger.log('[Dashboard] No customer IDs available, skipping query');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const table = getSecureTable('shipment', isAdmin, isViewingAsCustomer);

      let query = supabase
        .from(table)
        .select('load_id, mode_id, shipment_mode:mode_id(mode_name)');

      if (!isAdmin || isViewingAsCustomer) {
        query = query.in('customer_id', effectiveCustomerIds);
      }

      const { data: shipments } = await query
        .gte('pickup_date', startDate)
        .lte('pickup_date', endDate);

      if (shipments) {
        const modeCounts: { [key: string]: number } = {};

        shipments.forEach((s: any) => {
          const modeName = s.shipment_mode?.mode_name || 'Unknown';
          modeCounts[modeName] = (modeCounts[modeName] || 0) + 1;
        });

        const modeData: ModeData[] = Object.entries(modeCounts).map(([name, value]) => ({
          name,
          value,
        }));

        setData(modeData);
      }
    } catch (error) {
      console.error('Error loading shipment modes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { data, isLoading };
}

export function useCarrierMix(
  effectiveCustomerIds: number[],
  isAdmin: boolean,
  isViewingAsCustomer: boolean,
  startDate: string,
  endDate: string
) {
  const [data, setData] = useState<CarrierData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [effectiveCustomerIds, isAdmin, isViewingAsCustomer, startDate, endDate]);

  const loadData = async () => {
    if (!isAdmin && effectiveCustomerIds.length === 0) {
      logger.log('[Dashboard] No customer IDs available, skipping query');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const table = getSecureTable('shipment', isAdmin, isViewingAsCustomer);

      let shipmentQuery = supabase
        .from(table)
        .select('load_id, rate_carrier_id');

      if (!isAdmin || isViewingAsCustomer) {
        shipmentQuery = shipmentQuery.in('customer_id', effectiveCustomerIds);
      }

      const { data: shipments } = await shipmentQuery
        .gte('pickup_date', startDate)
        .lte('pickup_date', endDate);

      if (shipments && shipments.length > 0) {
        const carrierIds = shipments
          .map((s: any) => s.rate_carrier_id)
          .filter((id: number) => id != null);

        if (carrierIds.length > 0) {
          const uniqueCarrierIds = [...new Set(carrierIds)];

          const { data: carriers } = await supabase
            .from('carrier')
            .select('carrier_id, carrier_name')
            .in('carrier_id', uniqueCarrierIds);

          if (carriers) {
            const carrierMap = new Map(carriers.map((c: any) => [c.carrier_id, c.carrier_name]));
            const carrierCounts: { [key: string]: number } = {};

            carrierIds.forEach((carrierId: number) => {
              const carrierName = carrierMap.get(carrierId) || 'Unknown';
              carrierCounts[carrierName] = (carrierCounts[carrierName] || 0) + 1;
            });

            const carrierData: CarrierData[] = Object.entries(carrierCounts)
              .map(([name, value]) => ({ name, value }))
              .sort((a, b) => b.value - a.value)
              .slice(0, 10);

            setData(carrierData);
          }
        }
      }
    } catch (error) {
      console.error('Error loading carrier mix:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { data, isLoading };
}

export function useTopLanes(
  effectiveCustomerIds: number[],
  isAdmin: boolean,
  isViewingAsCustomer: boolean,
  startDate: string,
  endDate: string
) {
  const [data, setData] = useState<LaneData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [effectiveCustomerIds, isAdmin, isViewingAsCustomer, startDate, endDate]);

  const loadData = async () => {
    if (!isAdmin && effectiveCustomerIds.length === 0) {
      logger.log('[Dashboard] No customer IDs available, skipping query');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const shipmentTable = getSecureTable('shipment', isAdmin, isViewingAsCustomer);
      const addressTable = getSecureTable('shipment_address', isAdmin, isViewingAsCustomer);

      let shipmentQuery = supabase
        .from(shipmentTable)
        .select('load_id, retail');

      if (!isAdmin || isViewingAsCustomer) {
        shipmentQuery = shipmentQuery.in('customer_id', effectiveCustomerIds);
      }

      const { data: shipments } = await shipmentQuery
        .gte('pickup_date', startDate)
        .lte('pickup_date', endDate);

      if (shipments && shipments.length > 0) {
        const loadIds = shipments.map((s: any) => s.load_id);

        const { data: addresses } = await supabase
          .from(addressTable)
          .select('load_id, state, address_type')
          .in('load_id', loadIds)
          .in('address_type', [1, 2]);

        if (addresses) {
          const shipmentMap = new Map(shipments.map((s: any) => [s.load_id, parseFloat(s.retail) || 0]));

          const lanes: { [key: string]: { count: number; totalCost: number } } = {};

          const addressByLoadId: { [key: number]: { origin?: string; dest?: string } } = {};
          addresses.forEach((addr: any) => {
            if (!addressByLoadId[addr.load_id]) {
              addressByLoadId[addr.load_id] = {};
            }
            if (addr.address_type === 1) {
              addressByLoadId[addr.load_id].origin = addr.state || 'Unknown';
            } else if (addr.address_type === 2) {
              addressByLoadId[addr.load_id].dest = addr.state || 'Unknown';
            }
          });

          Object.entries(addressByLoadId).forEach(([loadId, addrs]) => {
            if (addrs.origin && addrs.dest) {
              const laneKey = `${addrs.origin} → ${addrs.dest}`;
              if (!lanes[laneKey]) {
                lanes[laneKey] = { count: 0, totalCost: 0 };
              }
              lanes[laneKey].count += 1;
              lanes[laneKey].totalCost += shipmentMap.get(Number(loadId)) || 0;
            }
          });

          const laneData: LaneData[] = Object.entries(lanes)
            .map(([lane, data]) => {
              const [origin, destination] = lane.split(' → ');
              return {
                origin,
                destination,
                shipmentCount: data.count,
                totalCost: data.totalCost,
                avgCost: data.totalCost / data.count,
              };
            })
            .sort((a, b) => b.shipmentCount - a.shipmentCount)
            .slice(0, 10);

          setData(laneData);
        }
      }
    } catch (error) {
      console.error('Error loading top lanes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { data, isLoading };
}

export function usePerformanceMetrics(
  effectiveCustomerIds: number[],
  isAdmin: boolean,
  isViewingAsCustomer: boolean,
  startDate: string,
  endDate: string
) {
  const [data, setData] = useState<PerformanceData>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [effectiveCustomerIds, isAdmin, isViewingAsCustomer, startDate, endDate]);

  const loadData = async () => {
    if (!isAdmin && effectiveCustomerIds.length === 0) {
      logger.log('[Dashboard] No customer IDs available, skipping query');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const table = getSecureTable('shipment', isAdmin, isViewingAsCustomer);

      let query = supabase
        .from(table)
        .select('pickup_date, delivery_date, expected_delivery_date, shipment_status:status_id(is_completed)')
        .not('delivery_date', 'is', null);

      if (!isAdmin || isViewingAsCustomer) {
        query = query.in('customer_id', effectiveCustomerIds);
      }

      const { data: shipments } = await query
        .gte('pickup_date', startDate)
        .lte('pickup_date', endDate);

      if (shipments && shipments.length > 0) {
        const completedShipments = shipments.filter((s: any) => s.shipment_status?.is_completed);

        let onTimeCount = 0;
        let totalTransitDays = 0;
        let transitDaysCount = 0;

        completedShipments.forEach((s: any) => {
          if (s.expected_delivery_date && s.delivery_date) {
            const expectedDate = new Date(s.expected_delivery_date);
            const actualDate = new Date(s.delivery_date);
            if (actualDate <= expectedDate) {
              onTimeCount++;
            }
          }

          if (s.pickup_date && s.delivery_date) {
            const pickupDate = new Date(s.pickup_date);
            const deliveryDate = new Date(s.delivery_date);
            const transitDays = (deliveryDate.getTime() - pickupDate.getTime()) / (1000 * 60 * 60 * 24);
            if (transitDays >= 0) {
              totalTransitDays += transitDays;
              transitDaysCount++;
            }
          }
        });

        const performanceData: PerformanceData = {};

        if (completedShipments.length > 0) {
          performanceData.onTimePercentage = (onTimeCount / completedShipments.length) * 100;
        }

        if (transitDaysCount > 0) {
          performanceData.avgTransitDays = totalTransitDays / transitDaysCount;
        }

        setData(performanceData);
      }
    } catch (error) {
      console.error('Error loading performance metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { data, isLoading };
}

export interface StateData {
  stateCode: string;
  avgCost: number;
  shipmentCount: number;
  isOutlier: boolean;
}

export function useCostPerStateData(
  effectiveCustomerIds: number[],
  isAdmin: boolean,
  isViewingAsCustomer: boolean,
  startDate: string,
  endDate: string
) {
  const [data, setData] = useState<StateData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [effectiveCustomerIds, isAdmin, isViewingAsCustomer, startDate, endDate]);

  const loadData = async () => {
    if (!isAdmin && effectiveCustomerIds.length === 0) {
      logger.log('[Dashboard] No customer IDs available, skipping query');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const shipmentTable = getSecureTable('shipment', isAdmin, isViewingAsCustomer);
      const addressTable = getSecureTable('shipment_address', isAdmin, isViewingAsCustomer);

      let shipmentQuery = supabase
        .from(shipmentTable)
        .select('load_id, retail');

      if (!isAdmin || isViewingAsCustomer) {
        shipmentQuery = shipmentQuery.in('customer_id', effectiveCustomerIds);
      }

      const { data: shipments } = await shipmentQuery
        .gte('pickup_date', startDate)
        .lte('pickup_date', endDate);

      if (shipments && shipments.length > 0) {
        const loadIds = shipments.map((s: any) => s.load_id);

        const { data: addresses } = await supabase
          .from(addressTable)
          .select('load_id, state, address_type')
          .in('load_id', loadIds)
          .eq('address_type', 2);

        if (addresses) {
          const shipmentMap = new Map(shipments.map((s: any) => [s.load_id, parseFloat(s.retail) || 0]));

          const stateMetrics: { [key: string]: { totalCost: number; count: number } } = {};

          addresses.forEach((addr: any) => {
            if (addr.state) {
              const cost = shipmentMap.get(addr.load_id) || 0;
              if (!stateMetrics[addr.state]) {
                stateMetrics[addr.state] = { totalCost: 0, count: 0 };
              }
              stateMetrics[addr.state].totalCost += cost;
              stateMetrics[addr.state].count += 1;
            }
          });

          const stateData: StateData[] = Object.entries(stateMetrics).map(([stateCode, metrics]) => ({
            stateCode,
            avgCost: metrics.totalCost / metrics.count,
            shipmentCount: metrics.count,
            isOutlier: false,
          }));

          const avgCosts = stateData.map(s => s.avgCost).sort((a, b) => a - b);
          if (avgCosts.length >= 4) {
            const q1Index = Math.floor(avgCosts.length * 0.25);
            const q3Index = Math.floor(avgCosts.length * 0.75);
            const q1 = avgCosts[q1Index];
            const q3 = avgCosts[q3Index];
            const iqr = q3 - q1;
            const upperBound = q3 + 1.5 * iqr;

            stateData.forEach(state => {
              if (state.avgCost > upperBound) {
                state.isOutlier = true;
              }
            });
          }

          setData(stateData);
        }
      }
    } catch (error) {
      console.error('Error loading cost per state data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { data, isLoading };
}

export function useTopCustomers(
  isAdmin: boolean,
  startDate: string,
  endDate: string
) {
  const [data, setData] = useState<CustomerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      setData([]);
      setIsLoading(false);
      return;
    }
    loadData();
  }, [isAdmin, startDate, endDate]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const table = getSecureTable('shipment', isAdmin, false);

      const { data: shipments } = await supabase
        .from(table)
        .select('load_id, customer_id, retail')
        .gte('pickup_date', startDate)
        .lte('pickup_date', endDate);

      if (shipments && shipments.length > 0) {
        const customerIds = [...new Set(shipments.map((s: any) => s.customer_id).filter((id: number) => id != null))];

        if (customerIds.length > 0) {
          const { data: customers } = await supabase
            .from('customer')
            .select('customer_id, company_name')
            .in('customer_id', customerIds);

          if (customers) {
            const customerMap = new Map(customers.map((c: any) => [c.customer_id, c.company_name]));
            const customerMetrics: { [key: number]: { count: number; totalSpend: number } } = {};

            shipments.forEach((shipment: any) => {
              const customerId = shipment.customer_id;
              if (customerId) {
                if (!customerMetrics[customerId]) {
                  customerMetrics[customerId] = { count: 0, totalSpend: 0 };
                }
                customerMetrics[customerId].count += 1;
                customerMetrics[customerId].totalSpend += parseFloat(shipment.retail) || 0;
              }
            });

            const customerData: CustomerData[] = Object.entries(customerMetrics)
              .map(([customerId, metrics]) => ({
                customerId: Number(customerId),
                customerName: customerMap.get(Number(customerId)) || 'Unknown',
                shipmentCount: metrics.count,
                totalSpend: metrics.totalSpend,
                avgCostPerShipment: metrics.totalSpend / metrics.count,
              }))
              .sort((a, b) => b.totalSpend - a.totalSpend)
              .slice(0, 10);

            setData(customerData);
          }
        }
      }
    } catch (error) {
      console.error('Error loading top customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { data, isLoading };
}
