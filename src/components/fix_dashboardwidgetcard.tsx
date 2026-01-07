// =====================================================
// FIX: DashboardWidgetCard.tsx - Add Click to Navigate
// =====================================================
// 
// INSTRUCTIONS:
// 1. Open src/components/DashboardWidgetCard.tsx
// 2. Find line 75-76 (after useAuth and useLookupTables)
// 3. Add the handleWidgetClick function below
// 4. Find line 557-558 (the return statement with the outer div)
// 5. Replace that div with the updated version below
//
// =====================================================

// STEP 1: Add this function after line 76 (after "const { lookups } = useLookupTables();")
// -------

  // Handle click to navigate to raw data view
  const handleWidgetClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on buttons or interactive elements
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('[role="button"]')
    ) {
      return;
    }
    
    // Don't navigate for custom widgets, AI widgets, or map widgets
    if (isCustomWidget || widget.type === 'ai_report' || widget.type === 'map') {
      return;
    }
    
    // Navigate to raw data view
    navigate(`/widgets/${widget.id}/data`);
  };

  // Check if widget should be clickable
  const isClickable = !isCustomWidget && widget.type !== 'ai_report' && widget.type !== 'map';


// =====================================================
// STEP 2: Replace the outer div in the return statement
// =====================================================
// 
// Find this (around line 557-558):
//
//   return (
//     <div className={`bg-white rounded-2xl shadow-md border border-slate-200 flex flex-col relative ${getWidgetMinHeight()}`}>
//
// Replace with:

  return (
    <div 
      className={`bg-white rounded-2xl shadow-md border border-slate-200 flex flex-col relative ${getWidgetMinHeight()} ${isClickable ? 'cursor-pointer hover:shadow-lg hover:border-slate-300 transition-all' : ''}`}
      onClick={isClickable ? handleWidgetClick : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleWidgetClick(e as unknown as React.MouseEvent);
        }
      } : undefined}
    >

// =====================================================
// FULL REPLACEMENT SECTION (lines 557-623)
// =====================================================
// If you prefer, replace the entire return statement with this:

  return (
    <div 
      className={`bg-white rounded-2xl shadow-md border border-slate-200 flex flex-col relative ${getWidgetMinHeight()} ${isClickable ? 'cursor-pointer hover:shadow-lg hover:border-slate-300 transition-all' : ''}`}
      onClick={isClickable ? handleWidgetClick : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleWidgetClick(e as unknown as React.MouseEvent);
        }
      } : undefined}
    >
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 flex-shrink-0">
        <div className={`${isHeroWidget ? 'w-10 h-10' : 'w-8 h-8'} rounded-xl ${widget.iconColor} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`${isHeroWidget ? 'w-5 h-5' : 'w-4 h-4'} text-white`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`${isHeroWidget ? 'text-base' : 'text-sm'} font-semibold text-slate-900 truncate`}>{widget.name}</h3>
            {isStaticWidget && (
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded"
                title={widget.snapshotDate ? `Snapshot from ${formatSnapshotDate(widget.snapshotDate)}` : 'Static snapshot'}
              >
                <Camera className="w-3 h-3" />
              </span>
            )}
            <WidgetAlertBadge widgetKey={widget.id} />
          </div>
          {isHeroWidget && <p className="text-xs text-slate-500 truncate">{widget.description}</p>}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {!isLoading && !error && data && customerId && (
            <AskAIButton
              context={{
                type: 'widget',
                title: widget.name,
                data: data,
                dateRange: {
                  start: dateRange.start || '',
                  end: dateRange.end || '',
                },
                customerId: parseInt(customerId),
              }}
              suggestedPrompt={`Analyze my ${widget.name} data and provide insights`}
              variant="icon"
              size="sm"
            />
          )}
          {hasSourceReport && (
            <button
              onClick={handleViewSourceReport}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-emerald-600 transition-colors"
              title="View full report"
            >
              <FileText className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      <div className={`${widget.type === 'map' ? '' : 'p-4'} flex-1 flex flex-col`}>
        <div className="flex-1">
          <WidgetErrorBoundary widgetName={widget.name}>
            {renderContent()}
          </WidgetErrorBoundary>
        </div>

        {data && (data.type === 'kpi' || widget.type === 'kpi' || widget.type === 'featured_kpi') && (
          <WidgetContextFooter
            recordCount={data.metadata?.recordCount}
            dateRange={data.metadata?.dateRange || { start: dateRange.start, end: dateRange.end }}
            tooltip={widget.tooltip}
            dataDefinition={widget.dataDefinition}
          />
        )}
      </div>
    </div>
  );
