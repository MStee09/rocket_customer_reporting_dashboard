import type { SupabaseClient } from '@supabase/supabase-js';
import type { DateRange } from '../../types/report';

export type WidgetFetcherResult = {
  rows: Record<string, unknown>[];
  columns: { key: string; label: string; type: string }[];
};

export type WidgetFetcher = () => Promise<WidgetFetcherResult>;

export type WidgetFetcherParams = {
  customerFilter: number[];
  dateRange: DateRange;
  carrierFilter: number | null;
  filters?: Record<string, string | number>;
};

export type FetcherContext = {
  customerFilter: number[];
  dateRange: DateRange;
  carrierFilter: number | null;
  filters?: Record<string, string | number>;
  supabase: SupabaseClient;
};
