import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

interface CustomerVolumeData {
  name: string;
  count: number;
}

interface CarrierVolumeData {
  name: string;
  count: number;
}

interface ModeDistributionData {
  name: string;
  value: number;
}

interface StatusDistributionData {
  name: string;
  value: number;
}

interface ShipmentWithCustomer {
  load_id: string;
  customer_id: number;
  customer: { company_name: string } | null;
  pickup_date: string;
}

interface ShipmentWithCarrier {
  load_id: string;
  customer_id: number;
  carrier: { carrier_name: string } | null;
  pickup_date: string;
}

interface ShipmentWithMode {
  load_id: string;
  customer_id: number;
  shipment_mode: { mode_name: string } | null;
  pickup_date: string;
}

interface ShipmentWithStatus {
  load_id: string;
  customer_id: number;
  shipment_status: { status_name: string } | null;
  pickup_date: string;
}

export function useReportCharts(
  effectiveCustomerIds: number[],
  isAdmin: boolean,
  isViewingAsCustomer: boolean,
  startDate: string,
  endDate: string
) {
  const { data: customerVolumeData, isLoading: customerVolumeLoading } = useQuery({
    queryKey: ['report-customer-volume', effectiveCustomerIds, isAdmin, isViewingAsCustomer, startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from('shipment')
        .select(`
          load_id,
          customer_id,
          customer:customer_id(company_name),
          pickup_date
        `)
        .gte('pickup_date', startDate)
        .lte('pickup_date', endDate);

      if (!isAdmin || isViewingAsCustomer) {
        query = query.in('customer_id', effectiveCustomerIds);
      }

      const { data: shipments } = await query;

      if (!shipments) return [];

      const customerCounts: { [key: string]: number } = {};
      shipments.forEach((s: ShipmentWithCustomer) => {
        const customerName = s.customer?.company_name || 'Unknown';
        customerCounts[customerName] = (customerCounts[customerName] || 0) + 1;
      });

      const result: CustomerVolumeData[] = Object.entries(customerCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return result;
    },
    enabled: isAdmin && !isViewingAsCustomer,
  });

  const { data: carrierVolumeData, isLoading: carrierVolumeLoading } = useQuery({
    queryKey: ['report-carrier-volume', effectiveCustomerIds, isAdmin, isViewingAsCustomer, startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from('shipment')
        .select(`
          load_id,
          customer_id,
          carrier:rate_carrier_id(carrier_name),
          pickup_date
        `)
        .gte('pickup_date', startDate)
        .lte('pickup_date', endDate);

      if (!isAdmin || isViewingAsCustomer) {
        query = query.in('customer_id', effectiveCustomerIds);
      }

      const { data: shipments } = await query;

      if (!shipments) return [];

      const carrierCounts: { [key: string]: number } = {};
      shipments.forEach((s: ShipmentWithCarrier) => {
        const carrierName = s.carrier?.carrier_name || 'Unknown';
        carrierCounts[carrierName] = (carrierCounts[carrierName] || 0) + 1;
      });

      const result: CarrierVolumeData[] = Object.entries(carrierCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return result;
    },
  });

  const { data: modeDistributionData, isLoading: modeDistributionLoading } = useQuery({
    queryKey: ['report-mode-distribution', effectiveCustomerIds, isAdmin, isViewingAsCustomer, startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from('shipment')
        .select(`
          load_id,
          customer_id,
          shipment_mode:mode_id(mode_name),
          pickup_date
        `)
        .gte('pickup_date', startDate)
        .lte('pickup_date', endDate);

      if (!isAdmin || isViewingAsCustomer) {
        query = query.in('customer_id', effectiveCustomerIds);
      }

      const { data: shipments } = await query;

      if (!shipments) return [];

      const modeCounts: { [key: string]: number } = {};
      shipments.forEach((s: ShipmentWithMode) => {
        const modeName = s.shipment_mode?.mode_name || 'Unknown';
        modeCounts[modeName] = (modeCounts[modeName] || 0) + 1;
      });

      const result: ModeDistributionData[] = Object.entries(modeCounts).map(([name, value]) => ({
        name,
        value,
      }));

      return result;
    },
  });

  const { data: statusDistributionData, isLoading: statusDistributionLoading } = useQuery({
    queryKey: ['report-status-distribution', effectiveCustomerIds, isAdmin, isViewingAsCustomer, startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from('shipment')
        .select(`
          load_id,
          customer_id,
          shipment_status:status_id(status_name),
          pickup_date
        `)
        .gte('pickup_date', startDate)
        .lte('pickup_date', endDate);

      if (!isAdmin || isViewingAsCustomer) {
        query = query.in('customer_id', effectiveCustomerIds);
      }

      const { data: shipments } = await query;

      if (!shipments) return [];

      const statusCounts: { [key: string]: number } = {};
      shipments.forEach((s: ShipmentWithStatus) => {
        const statusName = s.shipment_status?.status_name || 'Unknown';
        statusCounts[statusName] = (statusCounts[statusName] || 0) + 1;
      });

      const result: StatusDistributionData[] = Object.entries(statusCounts).map(([name, value]) => ({
        name,
        value,
      }));

      return result;
    },
  });

  return {
    customerVolumeData: customerVolumeData || [],
    customerVolumeLoading,
    carrierVolumeData: carrierVolumeData || [],
    carrierVolumeLoading,
    modeDistributionData: modeDistributionData || [],
    modeDistributionLoading,
    statusDistributionData: statusDistributionData || [],
    statusDistributionLoading,
  };
}
