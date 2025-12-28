import { useEffect, useState, useCallback } from 'react';
import {
  loadLookupTables,
  getLookupDisplayValue,
  formatFieldValue,
  LookupData,
} from '../services/lookupService';

export const useLookupTables = () => {
  const [lookups, setLookups] = useState<LookupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    loadLookupTables()
      .then((data) => {
        if (mounted) {
          setLookups(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load lookups');
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const getDisplayValue = useCallback(
    (field: string, value: unknown): string => {
      return getLookupDisplayValue(lookups, field, value);
    },
    [lookups]
  );

  const formatValue = useCallback(
    (fieldId: string, value: unknown): string => {
      return formatFieldValue(lookups, fieldId, value);
    },
    [lookups]
  );

  const getModeDisplay = useCallback(
    (modeId: number | null | undefined): string => {
      if (modeId === null || modeId === undefined) return '-';
      return lookups?.modes.get(modeId)?.code || lookups?.modes.get(modeId)?.name || String(modeId);
    },
    [lookups]
  );

  const getStatusDisplay = useCallback(
    (statusId: number | null | undefined): string => {
      if (statusId === null || statusId === undefined) return '-';
      return lookups?.statuses.get(statusId)?.code || lookups?.statuses.get(statusId)?.name || String(statusId);
    },
    [lookups]
  );

  const getEquipmentDisplay = useCallback(
    (equipmentId: number | null | undefined): string => {
      if (equipmentId === null || equipmentId === undefined) return '-';
      return lookups?.equipmentTypes.get(equipmentId)?.code || lookups?.equipmentTypes.get(equipmentId)?.name || String(equipmentId);
    },
    [lookups]
  );

  const getCarrierDisplay = useCallback(
    (carrierId: number | null | undefined): string => {
      if (carrierId === null || carrierId === undefined) return '-';
      return lookups?.carriers.get(carrierId)?.name || String(carrierId);
    },
    [lookups]
  );

  return {
    lookups,
    loading,
    error,
    ready: !loading && lookups !== null,
    getDisplayValue,
    formatValue,
    getModeDisplay,
    getStatusDisplay,
    getEquipmentDisplay,
    getCarrierDisplay,
  };
};
