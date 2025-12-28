import { ArrowLeft, Download, Trash2, RefreshCw, MoreVertical, Edit2, Share2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export interface ReportContainerProps {
  title: string;
  description?: string;
  onBack?: () => void;
  onExport?: () => void;
  onDelete?: () => void;
  onRefresh?: () => void;
  onEdit?: () => void;
  onShare?: () => void;
  isLoading?: boolean;
  lastUpdated?: Date;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export function ReportContainer({
  title,
  description,
  onBack,
  onExport,
  onDelete,
  onRefresh,
  onEdit,
  onShare,
  isLoading,
  lastUpdated,
  children,
  actions,
}: ReportContainerProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasMenuItems = onEdit || onShare || onDelete;

  return (
    <div className="min-h-full bg-gray-50">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              {onBack && (
                <button
                  onClick={onBack}
                  className="flex-shrink-0 p-2 -ml-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-gray-900 truncate">{title}</h1>
                {description && (
                  <p className="text-sm text-gray-500 truncate">{description}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {lastUpdated && (
                <span className="hidden sm:block text-xs text-gray-400">
                  Updated {lastUpdated.toLocaleString()}
                </span>
              )}

              {actions}

              {onRefresh && (
                <button
                  onClick={onRefresh}
                  disabled={isLoading}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                  title="Refresh data"
                >
                  <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              )}

              {onExport && (
                <button
                  onClick={onExport}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export CSV</span>
                </button>
              )}

              {hasMenuItems && (
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>

                  {showMenu && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                      {onEdit && (
                        <button
                          onClick={() => {
                            setShowMenu(false);
                            onEdit();
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit Report
                        </button>
                      )}
                      {onShare && (
                        <button
                          onClick={() => {
                            setShowMenu(false);
                            onShare();
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Share2 className="w-4 h-4" />
                          Share
                        </button>
                      )}
                      {onDelete && (
                        <>
                          <div className="my-1 border-t border-gray-100" />
                          <button
                            onClick={() => {
                              setShowMenu(false);
                              onDelete();
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete Report
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
}

export interface ReportSectionProps {
  children: React.ReactNode;
  className?: string;
}

export function ReportSection({ children, className = '' }: ReportSectionProps) {
  return <div className={`space-y-4 ${className}`}>{children}</div>;
}

export interface ReportGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3;
  gap?: 'sm' | 'md' | 'lg';
}

const gridColumns = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 lg:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
};

const gridGaps = {
  sm: 'gap-4',
  md: 'gap-6',
  lg: 'gap-8',
};

export function ReportGrid({ children, columns = 2, gap = 'md' }: ReportGridProps) {
  return (
    <div className={`grid ${gridColumns[columns]} ${gridGaps[gap]}`}>
      {children}
    </div>
  );
}
