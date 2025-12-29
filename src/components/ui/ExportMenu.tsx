import { useState, useRef, useEffect } from 'react';
import { Download, FileText, FileSpreadsheet, File, ChevronDown } from 'lucide-react';
import { exportToCSV, exportToExcel, exportTableToPDF, ColumnConfig, ExportOptions } from '../../services/exportService';

interface ExportMenuProps {
  data: Record<string, unknown>[];
  columns: ColumnConfig[];
  filename: string;
  title?: string;
  disabled?: boolean;
  formats?: ('csv' | 'excel' | 'pdf')[];
  variant?: 'button' | 'icon';
  onExportStart?: () => void;
  onExportComplete?: (format: string) => void;
}

export function ExportMenu({
  data,
  columns,
  filename,
  title,
  disabled = false,
  formats = ['csv', 'excel', 'pdf'],
  variant = 'button',
  onExportStart,
  onExportComplete
}: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    setExporting(format);
    onExportStart?.();

    try {
      const options: ExportOptions = { filename, title, includeTimestamp: true };

      switch (format) {
        case 'csv':
          exportToCSV(data, columns, options);
          break;
        case 'excel':
          exportToExcel(data, columns, { ...options, sheetName: title || 'Data' });
          break;
        case 'pdf':
          await exportTableToPDF(data, columns, options);
          break;
      }

      onExportComplete?.(format);
    } catch (error) {
      console.error(`Export to ${format} failed:`, error);
    } finally {
      setExporting(null);
      setIsOpen(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatConfig = {
    csv: { icon: FileText, label: 'CSV', color: 'text-green-600' },
    excel: { icon: FileSpreadsheet, label: 'Excel', color: 'text-emerald-600' },
    pdf: { icon: File, label: 'PDF', color: 'text-red-600' }
  };

  return (
    <div className="relative" ref={menuRef}>
      {variant === 'button' ? (
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled || data.length === 0}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          Export
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled || data.length === 0}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50"
          title="Export"
        >
          <Download className="w-5 h-5" />
        </button>
      )}

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="py-1">
            {formats.map(format => {
              const config = formatConfig[format];
              const Icon = config.icon;

              return (
                <button
                  key={format}
                  onClick={() => handleExport(format)}
                  disabled={exporting !== null}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <Icon className={`w-4 h-4 ${config.color}`} />
                  <span>{exporting === format ? 'Exporting...' : `Export as ${config.label}`}</span>
                </button>
              );
            })}
          </div>

          {data.length === 0 && (
            <div className="px-4 py-2 text-xs text-gray-500 border-t">
              No data to export
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ExportMenu;
