import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ReportConfig, CustomerReportsData } from '../types/reports';
import { useAuth } from '../contexts/AuthContext';
import { validateReportConfig, filterAdminOnlyColumns, filterAdminOnlyColumnIds } from '../utils/reportFilters';

interface ReportUpdates {
  name?: string;
  description?: string;
  simpleReport?: {
    columns: any[];
    isSummary: boolean;
    groupBy: string[];
    visualization: string;
    filters?: any[];
    sorts?: any[];
  };
}

interface UseCustomerReportsResult {
  reports: ReportConfig[];
  isLoading: boolean;
  error: string | null;
  saveReport: (report: ReportConfig) => Promise<void>;
  updateReport: (reportId: string, updates: ReportUpdates) => Promise<void>;
  deleteReport: (reportId: string) => Promise<void>;
  refreshReports: () => Promise<void>;
}

export function useCustomerReports(customerId?: number): UseCustomerReportsResult {
  const { effectiveCustomerIds, isAdmin, isViewingAsCustomer } = useAuth();
  const [reports, setReports] = useState<ReportConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const targetCustomerId = customerId || (effectiveCustomerIds && effectiveCustomerIds.length > 0 ? effectiveCustomerIds[0] : null);

  const loadReports = async () => {
    if (!targetCustomerId) {
      setReports([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const filePath = `${targetCustomerId}.json`;

      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('customer-reports')
        .createSignedUrl(filePath, 60);

      if (signedUrlError || !signedUrlData?.signedUrl) {
        setReports([]);
        setIsLoading(false);
        return;
      }

      const cacheBustUrl = `${signedUrlData.signedUrl}&_cb=${Date.now()}`;
      const response = await fetch(cacheBustUrl, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (!response.ok) {
        if (response.status === 404) {
          setReports([]);
        } else {
          throw new Error(`Failed to load reports: ${response.status}`);
        }
      } else {
        const text = await response.text();
        const reportsData: CustomerReportsData = JSON.parse(text);
        setReports(reportsData.reports || []);
      }
    } catch (err) {
      console.error('Error loading reports:', err);
      setError(err instanceof Error ? err.message : 'Failed to load reports');
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveReport = async (report: ReportConfig) => {
    if (!targetCustomerId) {
      throw new Error('No customer ID available');
    }

    try {
      let processedReport = { ...report };

      if ((report as any).simpleReport) {
        const simpleReport = (report as any).simpleReport;
        const isCustomerReport = isViewingAsCustomer || !isAdmin;

        const validation = validateReportConfig(
          simpleReport.columns || [],
          simpleReport.groupBy || [],
          isCustomerReport
        );

        if (!validation.isValid) {
          console.warn('Report contains admin-only columns, filtering them out:', validation.errors);

          const filteredColumns = filterAdminOnlyColumns(simpleReport.columns || []);
          const filteredGroupBy = filterAdminOnlyColumnIds(simpleReport.groupBy || []);

          (processedReport as any).simpleReport = {
            ...simpleReport,
            columns: filteredColumns,
            groupBy: filteredGroupBy
          };

          console.log('Filtered admin-only columns before saving:', {
            originalColumns: simpleReport.columns?.length || 0,
            filteredColumns: filteredColumns.length,
            originalGroupBy: simpleReport.groupBy?.length || 0,
            filteredGroupBy: filteredGroupBy.length
          });
        }
      }

      const existingReportIndex = reports.findIndex(r => r.id === processedReport.id);
      let updatedReports: ReportConfig[];

      if (existingReportIndex >= 0) {
        updatedReports = [...reports];
        updatedReports[existingReportIndex] = {
          ...processedReport,
          updatedAt: new Date().toISOString(),
        };
      } else {
        updatedReports = [...reports, processedReport];
      }

      const reportsData: CustomerReportsData = {
        reports: updatedReports,
      };

      const blob = new Blob([JSON.stringify(reportsData, null, 2)], {
        type: 'application/json',
      });

      const filePath = `${targetCustomerId}.json`;

      const { error: uploadError } = await supabase.storage
        .from('customer-reports')
        .upload(filePath, blob, {
          upsert: true,
          contentType: 'application/json',
        });

      if (uploadError) {
        throw uploadError;
      }

      setReports(updatedReports);
    } catch (err) {
      console.error('Error saving report:', err);
      throw err;
    }
  };

  const deleteReport = async (reportId: string) => {
    if (!targetCustomerId) {
      throw new Error('No customer ID available');
    }

    try {
      const updatedReports = reports.filter(r => r.id !== reportId);

      const reportsData: CustomerReportsData = {
        reports: updatedReports,
      };

      const blob = new Blob([JSON.stringify(reportsData, null, 2)], {
        type: 'application/json',
      });

      const filePath = `${targetCustomerId}.json`;

      const { error: uploadError } = await supabase.storage
        .from('customer-reports')
        .upload(filePath, blob, {
          upsert: true,
          contentType: 'application/json',
        });

      if (uploadError) {
        throw uploadError;
      }

      setReports(updatedReports);
    } catch (err) {
      console.error('Error deleting report:', err);
      throw err;
    }
  };

  const updateReport = async (reportId: string, updates: ReportUpdates) => {
    if (!targetCustomerId) {
      throw new Error('No customer ID available');
    }

    const existingReport = reports.find(r => r.id === reportId);
    if (!existingReport) {
      throw new Error('Report not found');
    }

    try {
      let processedUpdates = { ...updates };

      if (updates.simpleReport) {
        const simpleReport = updates.simpleReport;
        const isCustomerReport = isViewingAsCustomer || !isAdmin;

        const validation = validateReportConfig(
          simpleReport.columns || [],
          simpleReport.groupBy || [],
          isCustomerReport
        );

        if (!validation.isValid) {
          const filteredColumns = filterAdminOnlyColumns(simpleReport.columns || []);
          const filteredGroupBy = filterAdminOnlyColumnIds(simpleReport.groupBy || []);

          processedUpdates.simpleReport = {
            ...simpleReport,
            columns: filteredColumns,
            groupBy: filteredGroupBy
          };
        }
      }

      const updatedReport: ReportConfig = {
        ...existingReport,
        name: processedUpdates.name ?? existingReport.name,
        description: processedUpdates.description ?? existingReport.description,
        updatedAt: new Date().toISOString(),
      };

      if (processedUpdates.simpleReport) {
        (updatedReport as any).simpleReport = processedUpdates.simpleReport;
      }

      const updatedReports = reports.map(r =>
        r.id === reportId ? updatedReport : r
      );

      const reportsData: CustomerReportsData = {
        reports: updatedReports,
      };

      const blob = new Blob([JSON.stringify(reportsData, null, 2)], {
        type: 'application/json',
      });

      const filePath = `${targetCustomerId}.json`;

      const { error: uploadError } = await supabase.storage
        .from('customer-reports')
        .upload(filePath, blob, {
          upsert: true,
          contentType: 'application/json',
        });

      if (uploadError) {
        throw uploadError;
      }

      setReports(updatedReports);
    } catch (err) {
      console.error('Error updating report:', err);
      throw err;
    }
  };

  useEffect(() => {
    loadReports();
  }, [targetCustomerId]);

  return {
    reports,
    isLoading,
    error,
    saveReport,
    updateReport,
    deleteReport,
    refreshReports: loadReports,
  };
}
