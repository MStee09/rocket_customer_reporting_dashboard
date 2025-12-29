import { useMemo, useState } from 'react';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import { Loader2, AlertTriangle, Plus, Minus, RotateCcw, Settings, Lightbulb, ChevronRight, ChevronDown } from 'lucide-react';
import { StateData } from '../../hooks/useDashboardData';

interface CostPerStateMapProps {
  data: StateData[];
  isLoading?: boolean;
}

const usGeoUrl = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';
const canadaGeoUrl = 'https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/canada.geojson';

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

const CANADIAN_PROVINCES: { [key: string]: string } = {
  AB: 'Alberta',
  BC: 'British Columbia',
  MB: 'Manitoba',
  NB: 'New Brunswick',
  NL: 'Newfoundland and Labrador',
  NS: 'Nova Scotia',
  NT: 'Northwest Territories',
  NU: 'Nunavut',
  ON: 'Ontario',
  PE: 'Prince Edward Island',
  QC: 'Quebec',
  SK: 'Saskatchewan',
  YT: 'Yukon',
};

const CANADA_NAME_TO_CODE: { [key: string]: string } = {
  'Alberta': 'AB',
  'British Columbia': 'BC',
  'Manitoba': 'MB',
  'New Brunswick': 'NB',
  'Newfoundland and Labrador': 'NL',
  'Nova Scotia': 'NS',
  'Northwest Territories': 'NT',
  'Nunavut': 'NU',
  'Ontario': 'ON',
  'Prince Edward Island': 'PE',
  'Quebec': 'QC',
  'Saskatchewan': 'SK',
  'Yukon': 'YT',
  'Yukon Territory': 'YT',
};

const ALL_REGION_NAMES: { [key: string]: string } = { ...STATE_NAMES, ...CANADIAN_PROVINCES };

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

const CANADIAN_PROVINCE_COORDINATES: { [key: string]: [number, number] } = {
  AB: [-114.0, 55.0],
  BC: [-125.0, 54.0],
  MB: [-98.0, 56.0],
  NB: [-66.0, 46.5],
  NL: [-57.0, 53.0],
  NS: [-63.0, 45.0],
  NT: [-119.0, 64.0],
  NU: [-95.0, 70.0],
  ON: [-85.0, 50.0],
  PE: [-63.0, 46.3],
  QC: [-72.0, 52.0],
  SK: [-106.0, 55.0],
  YT: [-135.0, 64.0],
};

const ALL_REGION_COORDINATES: { [key: string]: [number, number] } = {
  ...STATE_COORDINATES,
  ...CANADIAN_PROVINCE_COORDINATES
};

const COLOR_SCALE = ['#10b981', '#84cc16', '#eab308', '#f97316', '#ef4444'];

function generateInsights(data: StateData[], stats: { min: number; max: number; mean: number; outliers: string[] }) {
  const insights: { type: 'warning' | 'info' | 'success'; message: string }[] = [];

  if (stats.outliers.length > 0) {
    const outlierData = data.filter(d => stats.outliers.includes(d.stateCode));
    const avgOutlierCost = outlierData.reduce((sum, d) => sum + d.avgCost, 0) / outlierData.length;
    const percentAbove = ((avgOutlierCost - stats.mean) / stats.mean * 100).toFixed(0);
    insights.push({
      type: 'warning',
      message: `${stats.outliers.length} outlier${stats.outliers.length > 1 ? 's' : ''}: ${stats.outliers.slice(0, 4).join(', ')}${stats.outliers.length > 4 ? '...' : ''} are ${percentAbove}% above average`,
    });
  }

  const westCoast = ['CA', 'OR', 'WA'];
  const eastCoast = ['NY', 'NJ', 'MA', 'FL', 'GA', 'NC', 'VA'];

  const getRegionAvg = (regions: string[]) => {
    const regionData = data.filter(d => regions.includes(d.stateCode));
    if (regionData.length < 2) return null;
    return regionData.reduce((sum, d) => sum + d.avgCost, 0) / regionData.length;
  };

  const westAvg = getRegionAvg(westCoast);
  const eastAvg = getRegionAvg(eastCoast);

  if (westAvg && eastAvg && Math.abs(westAvg - eastAvg) / stats.mean > 0.1) {
    const higher = westAvg > eastAvg ? 'West Coast' : 'East Coast';
    const diff = Math.abs(westAvg - eastAvg);
    insights.push({
      type: 'info',
      message: `Regional pattern: ${higher} $${diff.toFixed(0)} higher avg cost`,
    });
  }

  const canadaData = data.filter(d => CANADIAN_PROVINCES[d.stateCode]);
  const usData = data.filter(d => STATE_NAMES[d.stateCode]);

  if (canadaData.length > 0 && usData.length > 0) {
    const canadaAvg = canadaData.reduce((sum, d) => sum + d.avgCost, 0) / canadaData.length;
    const usAvg = usData.reduce((sum, d) => sum + d.avgCost, 0) / usData.length;
    const diff = ((canadaAvg - usAvg) / usAvg * 100).toFixed(0);
    insights.push({
      type: 'info',
      message: `Canada avg ${Number(diff) >= 0 ? '+' : ''}${diff}% vs US avg`,
    });
  }

  const sorted = [...data].sort((a, b) => b.avgCost - a.avgCost);
  if (sorted.length >= 2) {
    insights.push({
      type: 'warning',
      message: `Highest: ${sorted[0].stateCode} ($${sorted[0].avgCost.toFixed(0)})`,
    });
    insights.push({
      type: 'success',
      message: `Lowest: ${sorted[sorted.length - 1].stateCode} ($${sorted[sorted.length - 1].avgCost.toFixed(0)})`,
    });
  }

  const usCount = data.filter(d => STATE_NAMES[d.stateCode]).length;
  const caCount = data.filter(d => CANADIAN_PROVINCES[d.stateCode]).length;
  if (usCount < 25 || caCount > 0) {
    insights.push({
      type: 'info',
      message: `Coverage: ${usCount}/50 US states${caCount > 0 ? `, ${caCount}/13 provinces` : ''}`,
    });
  }

  return insights;
}

export function CostPerStateMap({ data, isLoading }: CostPerStateMapProps) {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<[number, number]>([-98, 48]);
  const [showSettings, setShowSettings] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [showAIInsights, setShowAIInsights] = useState(true);

  const hasCanadianData = useMemo(() => {
    return data.some(d => CANADIAN_PROVINCES[d.stateCode]);
  }, [data]);

  const regionDataMap = useMemo(() => {
    return new Map(data.map(d => [d.stateCode, d]));
  }, [data]);

  const { colorScale, minCost, maxCost, meanCost, outliers, thresholds } = useMemo(() => {
    if (data.length === 0) {
      return {
        colorScale: () => '#e2e8f0',
        minCost: 0,
        maxCost: 0,
        meanCost: 0,
        outliers: [] as string[],
        thresholds: [0, 0, 0, 0, 0]
      };
    }

    const costs = data.map(d => d.avgCost).sort((a, b) => a - b);
    const min = costs[0];
    const max = costs[costs.length - 1];
    const mean = costs.reduce((a, b) => a + b, 0) / costs.length;

    const p20 = costs[Math.floor(costs.length * 0.2)] || min;
    const p40 = costs[Math.floor(costs.length * 0.4)] || min;
    const p60 = costs[Math.floor(costs.length * 0.6)] || min;
    const p80 = costs[Math.floor(costs.length * 0.8)] || min;

    const getColor = (cost: number) => {
      if (cost <= p20) return COLOR_SCALE[0];
      if (cost <= p40) return COLOR_SCALE[1];
      if (cost <= p60) return COLOR_SCALE[2];
      if (cost <= p80) return COLOR_SCALE[3];
      return COLOR_SCALE[4];
    };

    const outlierRegions = data.filter(d => d.isOutlier).map(d => d.stateCode);

    return {
      colorScale: getColor,
      minCost: min,
      maxCost: max,
      meanCost: mean,
      outliers: outlierRegions,
      thresholds: [min, p20, p40, p60, p80, max],
    };
  }, [data]);

  const insights = useMemo(() => {
    if (data.length === 0) return [];
    return generateInsights(data, { min: minCost, max: maxCost, mean: meanCost, outliers });
  }, [data, minCost, maxCost, meanCost, outliers]);

  const usDataCount = data.filter(d => STATE_NAMES[d.stateCode]).length;
  const caDataCount = data.filter(d => CANADIAN_PROVINCES[d.stateCode]).length;
  const noDataCount = (50 - usDataCount) + (hasCanadianData ? (13 - caDataCount) : 0);

  const hoveredRegionData = hoveredRegion ? regionDataMap.get(hoveredRegion) : null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
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
        No regional data available
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-shrink-0 px-4 py-2 bg-white border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {outliers.length > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 px-2 py-1 rounded">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <div className="text-xs text-amber-800">
                <span className="font-semibold">{outliers.length} outlier{outliers.length > 1 ? 's' : ''}</span>
              </div>
            </div>
          )}

          {insights.length > 0 && (
            <button
              onClick={() => setShowAIInsights(!showAIInsights)}
              className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
            >
              {showAIInsights ? (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-500" />
              )}
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-medium text-slate-600">AI Insights</span>
            </button>
          )}
        </div>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-1.5 rounded hover:bg-slate-100 transition-colors"
          title="Settings"
        >
          <Settings className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {showSettings && (
        <div className="flex-shrink-0 px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
              className="rounded border-slate-300"
            />
            Show region labels
          </label>
        </div>
      )}

      {showAIInsights && insights.length > 0 && (
        <div className="flex-shrink-0 px-4 py-2 bg-slate-50 border-b border-slate-200">
          <div className="flex flex-wrap gap-2">
            {insights.slice(0, 5).map((insight, i) => (
              <div
                key={i}
                className={`text-xs px-2 py-1 rounded ${
                  insight.type === 'warning' ? 'bg-amber-100 text-amber-800' :
                  insight.type === 'success' ? 'bg-green-100 text-green-800' :
                  'bg-blue-100 text-blue-800'
                }`}
              >
                {insight.message}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 relative min-h-0" onMouseMove={handleMouseMove}>
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: 220,
            center: [-98, 50],
          }}
          style={{ width: '100%', height: '100%' }}
        >
          <ZoomableGroup
            zoom={zoom}
            center={center}
            onMoveEnd={({ coordinates, zoom: newZoom }) => {
              setCenter(coordinates);
              setZoom(newZoom);
            }}
            minZoom={0.5}
            maxZoom={6}
          >
            <Geographies geography={canadaGeoUrl}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const provinceName = geo.properties.name;
                  const provinceCode = CANADA_NAME_TO_CODE[provinceName];
                  const regionData = provinceCode ? regionDataMap.get(provinceCode) : null;
                  const fillColor = regionData ? colorScale(regionData.avgCost) : '#e2e8f0';
                  const isOutlier = provinceCode && outliers.includes(provinceCode);

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={fillColor}
                      stroke={isOutlier ? '#ef4444' : '#ffffff'}
                      strokeWidth={isOutlier ? 2 : 0.5}
                      style={{
                        default: { outline: 'none' },
                        hover: {
                          fill: regionData ? fillColor : '#e2e8f0',
                          outline: 'none',
                          opacity: regionData ? 0.8 : 1,
                          cursor: regionData ? 'pointer' : 'default',
                        },
                        pressed: { outline: 'none' },
                      }}
                      onMouseEnter={() => {
                        if (regionData && provinceCode) {
                          setHoveredRegion(provinceCode);
                        }
                      }}
                      onMouseLeave={() => {
                        setHoveredRegion(null);
                      }}
                    />
                  );
                })
              }
            </Geographies>

            <Geographies geography={usGeoUrl}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const stateName = geo.properties.name;
                  const stateCode = NAME_TO_CODE[stateName];
                  const stateData = stateCode ? regionDataMap.get(stateCode) : null;
                  const fillColor = stateData ? colorScale(stateData.avgCost) : '#e2e8f0';
                  const isOutlier = stateCode && outliers.includes(stateCode);

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={fillColor}
                      stroke={isOutlier ? '#ef4444' : '#ffffff'}
                      strokeWidth={isOutlier ? 2 : 0.5}
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
                          setHoveredRegion(stateCode);
                        }
                      }}
                      onMouseLeave={() => {
                        setHoveredRegion(null);
                      }}
                    />
                  );
                })
              }
            </Geographies>

            {showLabels && Object.entries(ALL_REGION_COORDINATES).map(([code, coordinates]) => {
              const regionData = regionDataMap.get(code);
              const isSmallRegion = ['CT', 'DE', 'DC', 'MA', 'MD', 'NH', 'NJ', 'RI', 'VT', 'PE', 'NS', 'NB'].includes(code);

              if (isSmallRegion && zoom < 2) return null;
              if (code === 'AK' || code === 'HI') return null;

              return (
                <Marker key={code} coordinates={coordinates}>
                  <text
                    textAnchor="middle"
                    fontSize={zoom > 1.5 ? 8 : 6}
                    fontWeight="600"
                    fill={regionData ? '#ffffff' : '#94a3b8'}
                    style={{
                      pointerEvents: 'none',
                      userSelect: 'none',
                      textShadow: regionData ? '0 1px 2px rgba(0,0,0,0.5)' : 'none'
                    }}
                  >
                    {code}
                  </text>
                </Marker>
              );
            })}
          </ZoomableGroup>
        </ComposableMap>

        {hoveredRegionData && (
          <div
            className="fixed bg-white px-4 py-3 rounded-lg shadow-xl border border-slate-200 pointer-events-none z-50"
            style={{
              left: `${tooltipPos.x + 15}px`,
              top: `${tooltipPos.y + 15}px`,
              maxWidth: '250px',
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-slate-800">
                {ALL_REGION_NAMES[hoveredRegionData.stateCode] || hoveredRegionData.stateCode}
              </span>
              {outliers.includes(hoveredRegionData.stateCode) && (
                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-xs rounded font-medium">
                  Outlier
                </span>
              )}
            </div>

            <div className="text-2xl font-bold text-slate-900 mb-1">
              {formatCurrency(hoveredRegionData.avgCost)}
            </div>

            <div className="text-xs text-slate-500 mb-2">
              {hoveredRegionData.shipmentCount.toLocaleString()} shipments
            </div>

            <div className="pt-2 border-t border-slate-100 text-xs">
              <span className={
                hoveredRegionData.avgCost > meanCost
                  ? 'text-red-600 font-medium'
                  : 'text-green-600 font-medium'
              }>
                {hoveredRegionData.avgCost > meanCost ? '+' : ''}
                {((hoveredRegionData.avgCost - meanCost) / meanCost * 100).toFixed(1)}%
              </span>
              <span className="text-slate-500"> vs avg ({formatCurrency(meanCost)})</span>
            </div>
          </div>
        )}

        <div className="absolute bottom-4 right-4 flex flex-col gap-1 z-10">
          <button
            onClick={() => setZoom((z) => Math.min(z * 1.5, 6))}
            className="w-8 h-8 bg-white shadow-lg rounded flex items-center justify-center hover:bg-slate-50 border border-slate-200 transition-colors"
            title="Zoom In"
          >
            <Plus className="w-4 h-4 text-slate-700" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(z / 1.5, 0.5))}
            className="w-8 h-8 bg-white shadow-lg rounded flex items-center justify-center hover:bg-slate-50 border border-slate-200 transition-colors"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4 text-slate-700" />
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setCenter([-98, 48]);
            }}
            className="w-8 h-8 bg-white shadow-lg rounded flex items-center justify-center hover:bg-slate-50 border border-slate-200 transition-colors"
            title="Reset View"
          >
            <RotateCcw className="w-4 h-4 text-slate-700" />
          </button>
        </div>
      </div>

      <div className="flex-shrink-0 px-4 py-3 border-t border-slate-200 bg-white">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-700">Avg Cost per Shipment</span>
          {noDataCount > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-slate-200 border border-slate-300" />
              <span className="text-xs text-slate-400">{noDataCount} regions no data</span>
            </div>
          )}
        </div>

        <div className="h-3 rounded-full flex overflow-hidden shadow-inner">
          {COLOR_SCALE.map((color, i) => (
            <div
              key={i}
              className="flex-1"
              style={{ backgroundColor: color }}
              title={`${formatCurrency(thresholds[i])} - ${formatCurrency(thresholds[i + 1] || maxCost)}`}
            />
          ))}
        </div>

        <div className="flex justify-between mt-2">
          <div className="text-left">
            <div className="text-xs font-medium text-slate-700">{formatCurrency(minCost)}</div>
            <div className="text-xs text-slate-400">Low</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-medium text-slate-700">{formatCurrency(meanCost)}</div>
            <div className="text-xs text-slate-400">Avg</div>
          </div>
          <div className="text-right">
            <div className="text-xs font-medium text-slate-700">{formatCurrency(maxCost)}</div>
            <div className="text-xs text-slate-400">High</div>
          </div>
        </div>
      </div>
    </div>
  );
}
