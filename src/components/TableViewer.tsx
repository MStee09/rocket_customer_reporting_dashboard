import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { fetchTableData } from '../lib/database';
import { TableData } from '../types/database';

interface TableViewerProps {
  tableName: string;
  tableType: 'table' | 'view';
}

export function TableViewer({ tableName, tableType }: TableViewerProps) {
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const loadData = async (page: number = 1) => {
    setIsLoading(true);
    setError('');

    const data = await fetchTableData(tableName, page, 10);

    if (data.error) {
      setError(data.error);
      setTableData(null);
    } else {
      setTableData(data);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    loadData(1);
  }, [tableName]);

  const handlePreviousPage = () => {
    if (tableData && tableData.currentPage > 1) {
      loadData(tableData.currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (tableData) {
      const totalPages = Math.ceil(tableData.totalCount / tableData.pageSize);
      if (tableData.currentPage < totalPages) {
        loadData(tableData.currentPage + 1);
      }
    }
  };

  const handleRefresh = () => {
    loadData(tableData?.currentPage || 1);
  };

  if (isLoading && !tableData) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-12">
        <div className="flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-12 h-12 text-rocket-600 animate-spin" />
          <p className="text-slate-600 font-medium">Loading data from {tableName}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-red-200 p-8">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900 mb-2">Error Loading Table</h3>
            <p className="text-red-700 text-sm mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!tableData || tableData.rows.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-12">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-700 mb-2">No Data Available</h3>
          <p className="text-slate-500">This {tableType} doesn't contain any data yet.</p>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(tableData.totalCount / tableData.pageSize);
  const startRow = (tableData.currentPage - 1) * tableData.pageSize + 1;
  const endRow = Math.min(tableData.currentPage * tableData.pageSize, tableData.totalCount);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
      <div className="bg-gradient-to-r from-charcoal-800 to-charcoal-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">{tableName}</h3>
            <p className="text-charcoal-300 text-sm mt-1">
              Showing rows {startRow}-{endRow} of {tableData.totalCount.toLocaleString()} • {tableData.columns.length} columns
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 bg-charcoal-700 hover:bg-charcoal-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh data"
          >
            <RefreshCw className={`w-5 h-5 text-white ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase w-16">
                #
              </th>
              {tableData.columns.map((column) => (
                <th key={column} className="text-left px-4 py-3 font-semibold text-slate-700">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.rows.map((row, idx) => (
              <tr
                key={idx}
                className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                  {startRow + idx}
                </td>
                {tableData.columns.map((column) => {
                  const value = row[column];
                  return (
                    <td key={column} className="px-4 py-3 text-slate-600 max-w-md">
                      {value === null ? (
                        <span className="text-slate-400 italic text-xs">NULL</span>
                      ) : typeof value === 'object' ? (
                        <pre className="text-slate-500 font-mono text-xs overflow-x-auto">
                          {JSON.stringify(value, null, 2)}
                        </pre>
                      ) : typeof value === 'boolean' ? (
                        <span className={`font-medium ${value ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {value.toString()}
                        </span>
                      ) : typeof value === 'number' ? (
                        <span className="font-mono text-slate-700">
                          {value.toLocaleString()}
                        </span>
                      ) : (
                        <span className="break-words">
                          {String(value)}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">
            Page {tableData.currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePreviousPage}
              disabled={tableData.currentPage === 1 || isLoading}
              className="flex items-center gap-1 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-slate-700"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <button
              onClick={handleNextPage}
              disabled={tableData.currentPage >= totalPages || isLoading}
              className="flex items-center gap-1 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-slate-700"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
