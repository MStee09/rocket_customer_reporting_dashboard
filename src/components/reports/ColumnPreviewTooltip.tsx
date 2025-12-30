import { useEffect, useState } from 'react';
import { Loader2, Info } from 'lucide-react';
import { fetchColumnSamples, canShowSamples } from '../../services/columnSampleService';
import { getColumnById } from '../../config/reportColumns';

interface ColumnPreviewTooltipProps {
  columnId: string;
  customerId: string;
  position: { top: number; left: number };
  onClose: () => void;
}

export function ColumnPreviewTooltip({
  columnId,
  customerId,
  position,
  onClose
}: ColumnPreviewTooltipProps) {
  const [samples, setSamples] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const columnDef = getColumnById(columnId);
  const hasSampleSupport = canShowSamples(columnId);

  useEffect(() => {
    let isMounted = true;

    const loadSamples = async () => {
      if (!hasSampleSupport) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchColumnSamples(columnId, customerId);
        if (isMounted) {
          setSamples(data);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('[ColumnPreviewTooltip] Error loading samples:', err);
        if (isMounted) {
          const errorMessage = err instanceof Error ? err.message : 'Unable to load sample data';
          setError(errorMessage);
          setIsLoading(false);
        }
      }
    };

    loadSamples();

    return () => {
      isMounted = false;
    };
  }, [columnId, customerId, hasSampleSupport]);

  if (!columnDef) return null;

  const adjustedPosition = {
    top: position.top,
    left: Math.min(position.left, window.innerWidth - 320)
  };

  return (
    <div
      className="fixed z-50 animate-in fade-in duration-200"
      style={{
        top: `${adjustedPosition.top}px`,
        left: `${adjustedPosition.left}px`,
      }}
    >
      <div className="relative">
        <div className="absolute left-0 top-3 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 border-r-white -translate-x-2 drop-shadow-lg" />

        <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-72 ml-2">
          <div className={hasSampleSupport ? 'mb-3' : ''}>
            <h4 className="font-semibold text-gray-900 text-sm mb-1">
              {columnDef.label}
            </h4>
            {columnDef.description && (
              <p className="text-xs text-gray-500">
                {columnDef.description}
              </p>
            )}
          </div>

          {hasSampleSupport && (
            <>
              <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-3">
                <Info className="w-3.5 h-3.5" />
                <span>Sample value from your data</span>
              </div>
              <div className="border-t border-gray-100 pt-3">
                {isLoading ? (
                  <div className="flex items-center justify-center py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-rocket-600" />
                    <span className="ml-2 text-sm text-gray-500">Loading...</span>
                  </div>
                ) : error ? (
                  <div className="py-2 text-center">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                ) : samples.length === 0 ? (
                  <div className="py-2 text-center">
                    <p className="text-sm text-gray-500">No data available</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {samples.map((sample, idx) => (
                      <div
                        key={idx}
                        className="px-2.5 py-1.5 bg-gray-50 rounded text-sm text-gray-700 font-mono break-words border border-gray-100"
                      >
                        {sample}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
