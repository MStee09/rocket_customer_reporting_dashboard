import { Eye, Camera, RefreshCw, AlertCircle } from 'lucide-react';
import { WidgetConfig, buildWhatItShows } from './saveAsWidgetUtils';
import { SimpleReportConfig } from '../../types/reports';
import { ColumnFilter } from '../../types/filters';
import FilterSummary from './FilterSummary';

interface WhatItShowsColumn {
  name: string;
  description: string;
}

export interface PreviewStepProps {
  config: WidgetConfig;
  report: SimpleReportConfig & { id: string };
  error: string | null;
}

export function PreviewStep({ config, report, error }: PreviewStepProps) {
  const whatItShows = buildWhatItShows(config, report);
  const activeFilters = report.filters?.filter((f: ColumnFilter) => f.enabled) || [];

  return (
    <div className="space-y-6">
      <div className="p-4 bg-rocket-50 border border-rocket-200 rounded-xl">
        <h3 className="font-medium text-rocket-900 mb-2 flex items-center gap-2">
          <Eye className="w-4 h-4" />
          What This Widget Will Show
        </h3>
        <p className="text-sm text-rocket-800 mb-3">{whatItShows.summary}</p>

        {whatItShows.columns.length > 0 && (
          <div className="mb-3">
            <span className="text-xs font-semibold text-rocket-700 uppercase">Data Displayed</span>
            <ul className="mt-1 space-y-1">
              {whatItShows.columns.map((col: WhatItShowsColumn, i: number) => (
                <li key={i} className="text-sm text-rocket-800 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-rocket-500 rounded-full" />
                  <strong>{col.name}</strong> — {col.description}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-rocket-700">
          {config.dataMode === 'static' ? (
            <>
              <Camera className="w-3 h-3" />
              Snapshot frozen at creation time
            </>
          ) : (
            <>
              <RefreshCw className="w-3 h-3" />
              Updates automatically with new data
            </>
          )}
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-2">Inherited Filters</h4>
          <FilterSummary filters={report.filters} />
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}
    </div>
  );
}
