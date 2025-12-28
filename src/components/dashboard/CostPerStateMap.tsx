import { useMemo, useState } from 'react';
import { ComposableMap, Geographies, Geography, Annotation, ZoomableGroup } from 'react-simple-maps';
import { Loader2, AlertTriangle, Plus, Minus, RotateCcw } from 'lucide-react';
import { StateData } from '../../hooks/useDashboardData';

interface CostPerStateMapProps {
  data: StateData[];
  isLoading?: boolean;
}

const geoUrl = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

const STATE_NAMES: { [key: string]: string } = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

const NAME_TO_CODE: { [key: string]: string } = Object.entries(STATE_NAMES).reduce(
  (acc, [code, name]) => {
    acc[name] = code;
    return acc;
  },
  {} as { [key: string]: string }
);

const STATE_COORDINATES: { [key: string]: [number, number] } = {
  AL: [-86.9023, 32.8067], AK: [-152.4044, 61.3707], AZ: [-111.0937, 34.0489],
  AR: [-92.3731, 34.7465], CA: [-119.4179, 36.7783], CO: [-105.5511, 39.1130],
  CT: [-72.7554, 41.6032], DE: [-75.5071, 38.9108], FL: [-81.5158, 27.6648],
  GA: [-82.9071, 32.1656], HI: [-155.5828, 19.8968], ID: [-114.7420, 44.0682],
  IL: [-89.3985, 40.6331], IN: [-86.1349, 40.2672], IA: [-93.0977, 41.8780],
  KS: [-98.4842, 39.0119], KY: [-84.2700, 37.8393], LA: [-91.9623, 30.9843],
  ME: [-69.4455, 45.2538], MD: [-76.6413, 39.0458], MA: [-71.3824, 42.4072],
  MI: [-84.5555, 44.3148], MN: [-94.6859, 46.7296], MS: [-89.3985, 32.3547],
  MO: [-92.6038, 37.9643], MT: [-110.3626, 46.8797], NE: [-99.9018, 41.4925],
  NV: [-116.4194, 38.8026], NH: [-71.5724, 43.1939], NJ: [-74.4057, 40.0583],
  NM: [-106.2371, 34.5199], NY: [-75.5268, 43.2994], NC: [-79.0193, 35.7596],
  ND: [-101.0020, 47.5515], OH: [-82.9071, 40.4173], OK: [-97.0929, 35.4676],
  OR: [-120.5542, 43.8041], PA: [-77.1945, 41.2033], RI: [-71.4774, 41.5801],
  SC: [-81.1637, 33.8361], SD: [-99.9018, 43.9695], TN: [-86.5804, 35.5175],
  TX: [-99.9018, 31.9686], UT: [-111.0937, 39.3210], VT: [-72.5778, 44.5588],
  VA: [-78.6569, 37.4316], WA: [-120.7401, 47.7511], WV: [-80.4549, 38.5976],
  WI: [-89.6165, 43.7844], WY: [-107.2903, 43.0760],
};

export function CostPerStateMap({ data, isLoading }: CostPerStateMapProps) {
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<[number, number]>([-96, 38]);

  const stateDataMap = useMemo(() => {
    return new Map(data.map(d => [d.stateCode, d]));
  }, [data]);

  const { colorScale, minCost, maxCost, outliers } = useMemo(() => {
    if (data.length === 0) {
      return { colorScale: () => '#e2e8f0', minCost: 0, maxCost: 0, outliers: [] };
    }

    const costs = data.map(d => d.avgCost).sort((a, b) => a - b);
    const min = costs[0];
    const max = costs[costs.length - 1];

    const p20 = costs[Math.floor(costs.length * 0.2)];
    const p40 = costs[Math.floor(costs.length * 0.4)];
    const p60 = costs[Math.floor(costs.length * 0.6)];
    const p80 = costs[Math.floor(costs.length * 0.8)];

    const getColor = (cost: number) => {
      if (cost <= p20) return '#10b981';
      if (cost <= p40) return '#84cc16';
      if (cost <= p60) return '#eab308';
      if (cost <= p80) return '#f97316';
      return '#ef4444';
    };

    const outlierStates = data.filter(d => d.isOutlier);

    return {
      colorScale: getColor,
      minCost: min,
      maxCost: max,
      outliers: outlierStates,
    };
  }, [data]);

  const dataPercentage = useMemo(() => {
    if (data.length === 0) return 0;
    const totalStates = 51;
    return Math.round((data.length / totalStates) * 100);
  }, [data]);

  const hoveredStateData = hoveredState ? stateDataMap.get(hoveredState) : null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    setTooltipPos({ x: event.clientX, y: event.clientY });
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-500">
        No state data available
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {outliers.length > 0 && (
        <div className="flex-shrink-0 px-4 py-2 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-800 flex-shrink-0" />
          <div className="text-xs text-amber-800">
            <span className="font-semibold">{outliers.length} outlier{outliers.length > 1 ? 's' : ''}:</span>{' '}
            {outliers.map((o, idx) => (
              <span key={o.stateCode}>
                {o.stateCode} ({formatCurrency(o.avgCost)})
                {idx < outliers.length - 1 ? ', ' : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 relative min-h-0" onMouseMove={handleMouseMove}>
        <ComposableMap projection="geoAlbersUsa" style={{ width: '100%', height: '100%' }}>
          <ZoomableGroup
            zoom={zoom}
            center={center}
            onMoveEnd={({ coordinates, zoom: newZoom }) => {
              setCenter(coordinates);
              setZoom(newZoom);
            }}
            minZoom={0.8}
            maxZoom={4}
          >
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const stateName = geo.properties.name;
                  const stateCode = NAME_TO_CODE[stateName];
                  const stateData = stateCode ? stateDataMap.get(stateCode) : null;
                  const fillColor = stateData ? colorScale(stateData.avgCost) : '#e2e8f0';

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={fillColor}
                      stroke="#ffffff"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: 'none' },
                        hover: {
                          fill: stateData ? fillColor : '#e2e8f0',
                          outline: 'none',
                          opacity: stateData ? 0.8 : 1,
                          cursor: stateData ? 'pointer' : 'default',
                        },
                        pressed: { outline: 'none' },
                      }}
                      onMouseEnter={() => {
                        if (stateData && stateCode) {
                          setHoveredState(stateCode);
                        }
                      }}
                      onMouseLeave={() => {
                        setHoveredState(null);
                      }}
                    />
                  );
                })
              }
            </Geographies>
            {Object.entries(STATE_COORDINATES).map(([code, coordinates]) => {
              const stateData = stateDataMap.get(code);
              return (
                <Annotation
                  key={code}
                  subject={coordinates}
                  dx={0}
                  dy={0}
                >
                  <text
                    textAnchor="middle"
                    fontSize={8}
                    fontWeight="600"
                    fill={stateData ? '#ffffff' : '#94a3b8'}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {code}
                  </text>
                </Annotation>
              );
            })}
          </ZoomableGroup>
        </ComposableMap>

        {hoveredStateData && (
          <div
            className="fixed bg-white px-3 py-2 rounded-lg shadow-lg border border-slate-200 pointer-events-none z-50"
            style={{
              left: `${tooltipPos.x + 10}px`,
              top: `${tooltipPos.y + 10}px`,
            }}
          >
            <div className="font-semibold text-slate-800 text-sm">
              {STATE_NAMES[hoveredStateData.stateCode] || hoveredStateData.stateCode}
            </div>
            <div className="text-base font-bold text-slate-900">
              {formatCurrency(hoveredStateData.avgCost)}
            </div>
            <div className="text-xs text-slate-600">
              Shipments: {hoveredStateData.shipmentCount}
            </div>
          </div>
        )}

        <div className="absolute bottom-4 right-4 flex flex-col gap-1 z-10">
          <button
            onClick={() => setZoom((z) => Math.min(z * 1.5, 4))}
            className="w-8 h-8 bg-white shadow-lg rounded flex items-center justify-center hover:bg-slate-50 border border-slate-200 transition-colors"
            title="Zoom In"
          >
            <Plus className="w-4 h-4 text-slate-700" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(z / 1.5, 0.8))}
            className="w-8 h-8 bg-white shadow-lg rounded flex items-center justify-center hover:bg-slate-50 border border-slate-200 transition-colors"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4 text-slate-700" />
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setCenter([-96, 38]);
            }}
            className="w-8 h-8 bg-white shadow-lg rounded flex items-center justify-center hover:bg-slate-50 border border-slate-200 transition-colors"
            title="Reset View"
          >
            <RotateCcw className="w-4 h-4 text-slate-700" />
          </button>
        </div>
      </div>

      <div className="flex-shrink-0 px-4 py-3 border-t border-slate-200 bg-white">
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs text-slate-600 font-medium">Low</div>
          <div className="text-xs text-slate-600 font-medium">High</div>
        </div>
        <div className="h-2 rounded-full bg-gradient-to-r from-[#10b981] via-[#84cc16] via-[#eab308] via-[#f97316] to-[#ef4444]" />
        <div className="mt-1 text-center text-xs text-slate-500">
          {formatCurrency(minCost)} - {formatCurrency(maxCost)}
        </div>
      </div>
    </div>
  );
}
