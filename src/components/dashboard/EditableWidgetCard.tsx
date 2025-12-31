import { useState, useRef, useEffect, ReactNode } from 'react';
import { GripVertical, X, Lock, ChevronDown, Move } from 'lucide-react';
import {
  getWidgetConstraints,
  isValidWidgetSize,
  getSizeLabel,
  clampWidgetSize,
  isInteractiveWidget,
} from '../../config/widgetConstraints';

type WidgetSizeValue = 1 | 2 | 3;

interface EditableWidgetCardProps {
  children: ReactNode;
  widgetId: string;
  widgetType: string;
  widgetName: string;
  iconColor: string;
  icon: ReactNode;
  currentSize: WidgetSizeValue;
  isEditMode: boolean;
  isSelected: boolean;
  isDragging: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onSizeChange: (size: WidgetSizeValue) => void;
  allowHoverDrag?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export function EditableWidgetCard({
  children,
  widgetId,
  widgetType,
  currentSize,
  isEditMode,
  isSelected,
  isDragging,
  onSelect,
  onRemove,
  onSizeChange,
  allowHoverDrag = true,
  onDragStart,
}: EditableWidgetCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const constraints = getWidgetConstraints(widgetId, widgetType);

  const hasInteractiveContent = isInteractiveWidget(widgetType);

  useEffect(() => {
    if (!showSizeMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setShowSizeMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSizeMenu]);

  useEffect(() => {
    if (!isEditMode) {
      setShowSizeMenu(false);
    }
  }, [isEditMode]);

  const handleSizeSelect = (size: WidgetSizeValue) => {
    const clampedSize = clampWidgetSize(size, widgetId, widgetType);
    onSizeChange(clampedSize);
    setShowSizeMenu(false);
  };

  const showHoverDragHandle = !isEditMode && isHovered && allowHoverDrag && !hasInteractiveContent;
  const showFullControls = isEditMode;

  return (
    <div
      ref={cardRef}
      className={`
        relative bg-white rounded-2xl border overflow-hidden transition-all duration-200
        ${isEditMode ? 'cursor-grab active:cursor-grabbing' : ''}
        ${isSelected && isEditMode ? 'ring-2 ring-orange-500 border-orange-500' : 'border-slate-200'}
        ${isDragging ? 'opacity-50 scale-[0.98] shadow-2xl' : ''}
        ${isEditMode ? 'hover:border-orange-300' : 'hover:shadow-lg hover:border-slate-300'}
      `}
      style={{
        animation: isEditMode && !isDragging ? 'wiggle 0.3s ease-in-out infinite' : undefined,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => isEditMode && onSelect()}
    >
      {showHoverDragHandle && (
        <div
          className="absolute top-3 left-3 z-20 p-2 bg-white/95 rounded-lg shadow-md border border-slate-200 cursor-grab active:cursor-grabbing hover:bg-slate-50 transition-all animate-fade-in"
          onMouseDown={(e) => {
            e.stopPropagation();
            onDragStart?.();
          }}
          title="Drag to reorder"
        >
          <Move className="w-4 h-4 text-slate-500" />
        </div>
      )}

      {showFullControls && (
        <>
          <div
            className="absolute top-3 left-3 z-20 p-2 bg-white rounded-lg shadow-md border border-slate-200 cursor-grab active:cursor-grabbing hover:bg-orange-50 hover:border-orange-300 transition-colors"
            onMouseDown={(e) => {
              e.stopPropagation();
              onDragStart?.();
            }}
            title="Drag to reorder"
          >
            <GripVertical className="w-4 h-4 text-slate-500" />
          </div>

          <button
            className="absolute -top-2 -right-2 z-20 w-7 h-7 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            title="Remove widget"
          >
            <X className="w-4 h-4 text-white" />
          </button>

          <div className="absolute bottom-3 right-3 z-20">
            <button
              className={`
                px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md transition-all
                ${showSizeMenu
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-slate-700 hover:bg-orange-50 hover:text-orange-600 border border-slate-200 hover:border-orange-300'
                }
              `}
              onClick={(e) => {
                e.stopPropagation();
                setShowSizeMenu(!showSizeMenu);
              }}
            >
              {getSizeLabel(currentSize)}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showSizeMenu ? 'rotate-180' : ''}`} />
            </button>

            {showSizeMenu && (
              <div className="absolute bottom-full right-0 mb-2 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden min-w-[160px] animate-scale-in">
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Widget Size</span>
                </div>
                {([1, 2, 3] as WidgetSizeValue[]).map((size) => {
                  const isValid = isValidWidgetSize(size, widgetId, widgetType);
                  const isActive = currentSize === size;
                  const isOptimal = size === constraints.optimalSize;

                  return (
                    <button
                      key={size}
                      className={`
                        w-full px-3 py-2.5 text-left text-sm flex items-center justify-between transition-colors
                        ${isActive ? 'bg-orange-50 text-orange-600 font-medium' : 'text-slate-700'}
                        ${isValid && !isActive ? 'hover:bg-slate-50' : ''}
                        ${!isValid ? 'opacity-40 cursor-not-allowed bg-slate-50' : ''}
                      `}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isValid) handleSizeSelect(size);
                      }}
                      disabled={!isValid}
                    >
                      <span className="flex items-center gap-2">
                        <span className="flex gap-0.5">
                          {[1, 2, 3].map((col) => (
                            <span
                              key={col}
                              className={`w-2 h-3 rounded-sm ${
                                col <= size
                                  ? isActive ? 'bg-orange-500' : 'bg-slate-400'
                                  : 'bg-slate-200'
                              }`}
                            />
                          ))}
                        </span>
                        <span>{getSizeLabel(size)}</span>
                        {!isValid && <Lock className="w-3 h-3 text-slate-400" />}
                      </span>
                      {isOptimal && isValid && (
                        <span className="text-xs text-green-600 font-medium bg-green-50 px-1.5 py-0.5 rounded">
                          Best
                        </span>
                      )}
                    </button>
                  );
                })}

                {(constraints.minSize > 1 || constraints.maxSize < 3) && (
                  <div className="px-3 py-2 bg-amber-50 border-t border-amber-100">
                    <p className="text-xs text-amber-700">
                      {constraints.minSize === 3
                        ? 'Maps need full width to display properly'
                        : constraints.minSize === 2
                          ? 'Charts need medium or larger size'
                          : constraints.maxSize < 3
                            ? 'This widget works best at smaller sizes'
                            : ''
                      }
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {!showSizeMenu && (
            <div className="absolute bottom-3 left-3 z-10">
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">
                {currentSize === 1 ? '1 col' : currentSize === 2 ? '2 cols' : '3 cols'}
              </span>
            </div>
          )}
        </>
      )}

      {isEditMode && isSelected && (
        <div className="absolute inset-0 pointer-events-none border-2 border-orange-500 rounded-2xl" />
      )}

      <div className={isEditMode ? 'pointer-events-none' : ''}>
        {children}
      </div>
    </div>
  );
}
