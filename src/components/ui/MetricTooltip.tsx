import { useState, useRef, useEffect, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Info, ExternalLink, Calculator, CheckCircle2, XCircle } from 'lucide-react';

export interface MetricDefinition {
  name: string;
  description: string;
  formula?: string;
  includes?: string[];
  excludes?: string[];
  drillDownPath?: string;
  drillDownLabel?: string;
}

interface MetricTooltipProps {
  metric: MetricDefinition;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function MetricTooltip({ metric, children, position = 'bottom' }: MetricTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const calculatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 12;

    let x = 0;
    let y = 0;

    switch (position) {
      case 'top':
        x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        y = triggerRect.top - tooltipRect.height - padding;
        break;
      case 'bottom':
        x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        y = triggerRect.bottom + padding;
        break;
      case 'left':
        x = triggerRect.left - tooltipRect.width - padding;
        y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        break;
      case 'right':
        x = triggerRect.right + padding;
        y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        break;
    }

    if (x < padding) x = padding;
    if (x + tooltipRect.width > viewportWidth - padding) {
      x = viewportWidth - tooltipRect.width - padding;
    }
    if (y < padding) y = padding;
    if (y + tooltipRect.height > viewportHeight - padding) {
      y = viewportHeight - tooltipRect.height - padding;
    }

    setTooltipPosition({ x, y });
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsOpen(true);
      setTimeout(calculatePosition, 0);
    }, 300);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  const handleTooltipMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const handleTooltipMouseLeave = () => {
    setIsOpen(false);
  };

  return (
    <>
      <div
        ref={triggerRef}
        className="inline-flex items-center gap-1.5 cursor-help group"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
        <Info className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
      </div>

      {isOpen && (
        <div
          ref={tooltipRef}
          className="fixed z-[60] w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          style={{ left: tooltipPosition.x, top: tooltipPosition.y }}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
        >
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <h4 className="font-semibold text-slate-900">{metric.name}</h4>
          </div>

          <div className="px-4 py-3 space-y-3">
            <p className="text-sm text-slate-600 leading-relaxed">{metric.description}</p>

            {metric.formula && (
              <div className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-lg">
                <Calculator className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                <div>
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Formula</span>
                  <p className="text-sm text-slate-700 font-mono mt-0.5">{metric.formula}</p>
                </div>
              </div>
            )}

            {metric.includes && metric.includes.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Includes</span>
                </div>
                <ul className="text-sm text-slate-600 space-y-1 pl-5">
                  {metric.includes.map((item, i) => (
                    <li key={i} className="list-disc">{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {metric.excludes && metric.excludes.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-red-700">
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Excludes</span>
                </div>
                <ul className="text-sm text-slate-600 space-y-1 pl-5">
                  {metric.excludes.map((item, i) => (
                    <li key={i} className="list-disc">{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {metric.drillDownPath && metric.drillDownLabel && (
              <Link
                to={metric.drillDownPath}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium pt-3 border-t border-slate-100"
              >
                {metric.drillDownLabel}
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export const METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  totalShipments: {
    name: 'Total Shipments',
    description: 'The count of all shipments created during the selected time period.',
    formula: 'COUNT(shipments)',
    includes: ['All shipment statuses', 'All modes (LTL, FTL, Parcel)'],
    excludes: ['Cancelled shipments', 'Test shipments'],
    drillDownPath: '/shipments',
    drillDownLabel: 'View all shipments',
  },
  totalSpend: {
    name: 'Total Spend',
    description: 'The sum of all shipping costs (retail rates) during the selected time period.',
    formula: 'SUM(retail)',
    includes: ['Base rates', 'Accessorial charges', 'Fuel surcharges'],
    excludes: ['Disputed charges', 'Credits/refunds'],
    drillDownPath: '/analytics',
    drillDownLabel: 'View cost breakdown',
  },
  onTimePercentage: {
    name: 'On-Time Delivery %',
    description: 'The percentage of shipments delivered on or before the scheduled delivery date.',
    formula: '(On-Time Deliveries / Total Deliveries) x 100',
    includes: ['Delivered shipments only'],
    excludes: ['In-transit shipments', 'Shipments without delivery date'],
    drillDownPath: '/analytics',
    drillDownLabel: 'View delivery performance',
  },
  activeCarriers: {
    name: 'Active Carriers',
    description: 'The number of unique carriers that handled shipments during the selected time period.',
    formula: 'COUNT(DISTINCT carrier_id)',
    includes: ['All carriers with at least 1 shipment'],
    drillDownPath: '/analytics',
    drillDownLabel: 'View carrier analytics',
  },
  avgCostPerShipment: {
    name: 'Avg Cost per Shipment',
    description: 'The average shipping cost across all shipments in the period.',
    formula: 'Total Spend / Total Shipments',
    includes: ['All shipped orders'],
    excludes: ['Cancelled shipments'],
  },
  avgTransitDays: {
    name: 'Avg Transit Days',
    description: 'The average number of days between ship date and delivery date.',
    formula: 'AVG(delivered_date - shipped_date)',
    includes: ['Delivered shipments only'],
    excludes: ['Shipments without delivery date'],
  },
};

export function getMetricDefinition(key: string): MetricDefinition | undefined {
  return METRIC_DEFINITIONS[key];
}
