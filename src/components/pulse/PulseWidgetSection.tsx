import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings2, Plus, X, Loader2 } from 'lucide-react';
import { DashboardWidgetCard } from '../DashboardWidgetCard';
import { AIWidgetRenderer } from '../dashboard/AIWidgetRenderer';
import { PulseWidgetGalleryModal } from './PulseWidgetGalleryModal';
import { usePulseWidgetLayout } from '../../hooks/usePulseWidgetLayout';
import { widgetLibrary } from '../../config/widgetLibrary';
import { loadAllCustomWidgets } from '../../config/widgets/customWidgetStorage';
import { CustomWidgetDefinition } from '../../config/widgets/customWidgetTypes';
import { supabase } from '../../lib/supabase';
import { getSizeColSpan, clampWidgetSize } from '../../config/widgetConstraints';

interface PulseWidgetSectionProps {
  customerId: number;
  startDate: string;
  endDate: string;
  isAdmin: boolean;
}

export function PulseWidgetSection({
  customerId,
  startDate,
  endDate,
  isAdmin,
}: PulseWidgetSectionProps) {
  const navigate = useNavigate();
  const [isEditMode, setIsEditMode] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [customWidgets, setCustomWidgets] = useState<Record<string, CustomWidgetDefinition>>({});
  const [isLoadingCustomWidgets, setIsLoadingCustomWidgets] = useState(true);

  const {
    widgets,
    widgetSizes,
    isLoading,
    addWidget,
    removeWidget,
    updateWidgetSize,
  } = usePulseWidgetLayout(customerId);

  useEffect(() => {
    async function loadCustom() {
      setIsLoadingCustomWidgets(true);
      try {
        const loaded = await loadAllCustomWidgets(supabase, isAdmin, customerId);
        const map: Record<string, CustomWidgetDefinition> = {};
        for (const w of loaded) {
          map[w.id] = w;
        }
        setCustomWidgets(map);
      } catch (err) {
        console.error('Failed to load custom widgets:', err);
      } finally {
        setIsLoadingCustomWidgets(false);
      }
    }
    loadCustom();
  }, [customerId, isAdmin]);

  const handleAddWidget = async (widgetId: string) => {
    await addWidget(widgetId);
  };

  const handleRemoveWidget = async (widgetId: string) => {
    await removeWidget(widgetId);
  };

  const handleWidgetClick = (widgetId: string) => {
    if (!isEditMode) {
      navigate(`/widgets/${widgetId}/data`);
    }
  };

  const getColSpan = (widgetId: string): string => {
    const widget = widgetLibrary[widgetId] || customWidgets[widgetId];
    if (!widget) return 'col-span-1 sm:col-span-1 lg:col-span-1';

    const widgetType = 'type' in widget ? widget.type : 'kpi';
    const currentSize = widgetSizes[widgetId] || 2;
    const effectiveSize = clampWidgetSize(currentSize, widgetId, widgetType);
    return getSizeColSpan(effectiveSize);
  };

  const renderWidgetContent = (widgetId: string) => {
    let widget = widgetLibrary[widgetId];
    let isCustom = false;

    if (!widget) {
      const customWidget = customWidgets[widgetId];
      if (customWidget) {
        widget = {
          id: customWidget.id,
          name: customWidget.name,
          description: customWidget.description,
          type: customWidget.type,
          category: customWidget.category,
          iconColor: customWidget.display?.iconColor || 'bg-slate-500',
          gradient: customWidget.display?.gradient,
          source: customWidget.source,
          dataSource: customWidget.dataSource,
          visualization: customWidget.visualization,
        } as typeof widget;
        isCustom = true;
      }
    }

    if (!widget) {
      return (
        <div className="p-6 text-center text-slate-400">
          Widget not found: {widgetId}
        </div>
      );
    }

    const isAIWidget = widget.type === 'ai_report' || (widget as { source?: string }).source === 'ai';

    if (isAIWidget) {
      return (
        <AIWidgetRenderer
          widget={widget}
          onDelete={() => handleRemoveWidget(widgetId)}
          compact
        />
      );
    }

    return (
      <DashboardWidgetCard
        widget={widget}
        customerId={customerId.toString()}
        dateRange={{ start: startDate, end: endDate }}
        isEditing={false}
        isCustomWidget={isCustom}
        sizeLevel="default"
        scaleFactor={1}
        onRemove={() => {}}
      />
    );
  };

  if (isLoading || isLoadingCustomWidgets) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8">
        <div className="flex items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading widgets...</span>
        </div>
      </div>
    );
  }

  // Filter out widgets that don't have valid definitions
  const validWidgets = widgets.filter(widgetId => {
    const isValid = widgetLibrary[widgetId] || customWidgets[widgetId];
    if (!isValid) {
      console.warn(`Widget ${widgetId} not found in library or custom widgets, skipping`);
    }
    return isValid;
  });

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-900">My Widgets</h2>
            {validWidgets.length > 0 && (
              <span className="text-sm text-slate-500">
                {validWidgets.length} widget{validWidgets.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <button
            onClick={() => isEditMode ? setIsEditMode(false) : setShowGallery(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isEditMode
                ? 'bg-slate-900 text-white hover:bg-slate-800'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {isEditMode ? (
              <>
                <span>Done</span>
              </>
            ) : (
              <>
                <Settings2 className="w-4 h-4" />
                <span>Customize</span>
              </>
            )}
          </button>
        </div>

        {validWidgets.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Add Your First Widget
              </h3>
              <p className="text-slate-500 mb-6 max-w-md mx-auto">
                Customize your dashboard by adding widgets that matter most to you.
              </p>
              <button
                onClick={() => setShowGallery(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add Widget
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-auto">
            {validWidgets.map((widgetId) => {
              const widget = widgetLibrary[widgetId] || customWidgets[widgetId];
              const widgetType = widget ? ('type' in widget ? widget.type : 'kpi') : 'kpi';
              const isCustom = !widgetLibrary[widgetId];
              const isClickable = !isEditMode && !isCustom && widgetType !== 'ai_report';

              return (
                <div
                  key={widgetId}
                  className={`relative ${getColSpan(widgetId)}`}
                >
                  {isEditMode && (
                    <button
                      className="absolute -top-2 -right-2 z-30 w-7 h-7 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110"
                      onClick={() => handleRemoveWidget(widgetId)}
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  )}

                  <div
                    className={`bg-white rounded-2xl border overflow-hidden transition-all h-full ${
                      isEditMode
                        ? 'border-orange-300 ring-2 ring-orange-100'
                        : 'border-slate-200 hover:shadow-lg hover:border-slate-300'
                    } ${isClickable ? 'cursor-pointer' : ''}`}
                    style={{
                      animation: isEditMode ? 'wiggle 0.3s ease-in-out infinite' : undefined,
                    }}
                    onClick={isClickable ? () => handleWidgetClick(widgetId) : undefined}
                    role={isClickable ? 'button' : undefined}
                    tabIndex={isClickable ? 0 : undefined}
                    onKeyDown={isClickable ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleWidgetClick(widgetId);
                      }
                    } : undefined}
                  >
                    {renderWidgetContent(widgetId)}
                  </div>
                </div>
              );
            })}

            {isEditMode && (
              <div className="col-span-1">
                <button
                  onClick={() => setShowGallery(true)}
                  className="w-full h-full min-h-[200px] rounded-2xl border-2 border-dashed border-slate-300 hover:border-orange-400 hover:bg-orange-50 transition-all flex flex-col items-center justify-center gap-3 text-slate-400 hover:text-orange-500"
                >
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                    <Plus className="w-6 h-6" />
                  </div>
                  <span className="font-medium">Add Widget</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <PulseWidgetGalleryModal
        isOpen={showGallery}
        onClose={() => {
          setShowGallery(false);
          if (validWidgets.length > 0) {
            setIsEditMode(true);
          }
        }}
        onAddWidget={handleAddWidget}
        currentWidgets={validWidgets}
        customerId={customerId}
        isAdmin={isAdmin}
      />

      <style>{`
        @keyframes wiggle {
          0%, 100% { transform: rotate(-0.5deg); }
          50% { transform: rotate(0.5deg); }
        }
      `}</style>
    </>
  );
}
