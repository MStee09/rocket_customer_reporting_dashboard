import { useMemo, useState } from 'react';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import { Loader2, AlertTriangle, Plus, Minus, RotateCcw, Settings, Lightbulb, ChevronRight, ChevronDown, TrendingUp, TrendingDown, MapPin, BarChart3 } from 'lucide-react';
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

interface Insight {
  type: 'warning' | 'info' | 'success';
  icon: 'outlier' | 'trend' | 'region' | 'compare' | 'coverage';
  message: string;
  detail?: string;
}

function generateInsights(data: StateData[], stats: { min: number; max: number; mean: number; outliers: string[] }): Insight[] {
  const insights: Insight[] = [];

  if (stats.outliers.length > 0) {
    const outlierData = data.filter(d => stats.outliers.includes(d.stateCode));
    const avgOutlierCost = outlierData.reduce((sum, d) => sum + d.avgCost, 0) / outlierData.length;
    const percentAbove = ((avgOutlierCost - stats.mean) / stats.mean * 100).toFixed(0);
    insights.push({
      type: 'warning',
      icon: 'outlier',
      message: `${stats.outliers.length} outlier${stats.outliers.length > 1 ? 's' : ''} detected`,
      detail: `${stats.outliers.slice(0, 4).join(', ')}${stats.outliers.length > 4 ? ` +${stats.outliers.length - 4} more` : ''} are ${percentAbove}% above average`,
    });
  }

  const westCoast = ['CA', 'OR', 'WA', 'BC'];
  const eastCoast = ['NY', 'NJ', 'MA', 'FL', 'GA', 'NC', 'VA', 'ON', 'QC'];

  const getRegionAvg = (regions: string[]) => {
    const regionData = data.filter(d => regions.includes(d.stateCode));
    if (regionData.length < 2) return null;
    return regionData.reduce((sum, d) => sum + d.avgCost, 0) / regionData.length;
  };

  const westAvg = getRegionAvg(westCoast);
  const eastAvg = getRegionAvg(eastCoast);

  if (westAvg && eastAvg && Math.abs(westAvg - eastAvg) / stats.mean > 0.1) {
    const higher = westAvg > eastAvg ? 'West' : 'East';
    const lower = westAvg > eastAvg ? 'East' : 'West';
    const diff = Math.abs(westAvg - eastAvg);
    const pctDiff = ((Math.max(westAvg, eastAvg) - Math.min(westAvg, eastAvg)) / Math.min(westAvg, eastAvg) * 100).toFixed(0);
    insights.push({
      type: 'info',
      icon: 'region',
      message: `${higher} coast ${pctDiff}% higher than ${lower}`,
      detail: `Avg difference of $${diff.toFixed(0)} per shipment`,
    });
  }

  const canadaData = data.filter(d => CANADIAN_PROVINCES[d.stateCode]);
  const usData = data.filter(d => STATE_NAMES[d.stateCode]);

  if (canadaData.length > 0 && usData.length > 0) {
    const canadaAvg = canadaData.reduce((sum, d) => sum + d.avgCost, 0) / canadaData.length;
    const usAvg = usData.reduce((sum, d) => sum + d.avgCost, 0) / usData.length;
    const diff = ((canadaAvg - usAvg) / usAvg * 100).toFixed(0);
    const diffAbs = Math.abs(canadaAvg - usAvg).toFixed(0);
    insights.push({
      type: Number(diff) > 10 ? 'warning' : 'info',
      icon: 'compare',
      message: `Canada ${Number(diff) >= 0 ? '+' : ''}${diff}% vs US average`,
      detail: `$${diffAbs} difference (CA: $${canadaAvg.toFixed(0)}, US: $${usAvg.toFixed(0)})`,
    });
  }

  const sorted = [...data].sort((a, b) => b.avgCost - a.avgCost);
  if (sorted.length >= 2) {
    const highest = sorted[0];
    const lowest = sorted[sorted.length - 1];
    const highName = ALL_REGION_NAMES[highest.stateCode] || highest.stateCode;
    const lowName = ALL_REGION_NAMES[lowest.stateCode] || lowest.stateCode;

    insights.push({
      type: 'warning',
      icon: 'trend',
      message: `Highest: ${highName}`,
      detail: `$${highest.avgCost.toFixed(0)} avg (${highest.shipmentCount.toLocaleString()} shipments)`,
    });
    insights.push({
      type: 'success',
      icon: 'trend',
      message: `Lowest: ${lowName}`,
      detail: `$${lowest.avgCost.toFixed(0)} avg (${lowest.shipmentCount.toLocaleString()} shipments)`,
    });
  }

  const usCount = data.filter(d => STATE_NAMES[d.stateCode]).length;
  const caCount = data.filter(d => CANADIAN_PROVINCES[d.stateCode]).length;
  const totalShipments = data.reduce((sum, d) => sum + d.shipmentCount, 0);

  insights.push({
    type: 'info',
    icon: 'coverage',
    message: `${usCount}/50 US states${caCount > 0 ? `, ${caCount}/13 provinces` : ''}`,
    detail: `${totalShipments.toLocaleString()} total shipments across ${data.length} regions`,
  });

  return insights;
}

function InsightIcon({ icon, className }: { icon: Insight['icon']; className?: string }) {
  switch (icon) {
    case 'outlier':
      return <AlertTriangle className={className} />;
    case 'trend':
      return <BarChart3 className={className} />;
    case 'region':
      return <MapPin className={className} />;
    case 'compare':
      return <TrendingUp className={className} />;
    case 'coverage':
      return <MapPin className={className} />;
    default:
      return <Lightbulb className={className} />;
  }
}

export function CostPerStateMap({ data, isLoading }: CostPerStateMapProps) {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<[number, number]>([-98, 48]);
  const [showSettings, setShowSettings] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [highlightOutliers, setHighlightOutliers] = useState(true);

  const hasCanadianData = useMemo(() => {
    return data.some(d => CANADIAN_PROVINCES[d.stateCode]);
  }, [data]);

  const regionDataMap = useMemo(() => {
    return new Map(data.map(d => [d.stateCode, d]));
  }, [data]);

  const { colorScale, minCost, maxCost, meanCost, outliers, thresholds, stdDev } = useMemo(() => {
    if (data.length === 0) {
      return {
        colorScale: () => '#e2e8f0',
        minCost: 0,
        maxCost: 0,
        meanCost: 0,
        outliers: [] as string[],
        thresholds: [0, 0, 0, 0, 0],
        stdDev: 0
      };
    }

    const costs = data.map(d => d.avgCost).sort((a, b) => a - b);
    const min = costs[0];
    const max = costs[costs.length - 1];
    const mean = costs.reduce((a, b) => a + b, 0) / costs.length;
    const variance = costs.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / costs.length;
    const std = Math.sqrt(variance);

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
      stdDev: std
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

  const getPercentile = (cost: number) => {
    const sorted = data.map(d => d.avgCost).sort((a, b) => a - b);
    const index = sorted.findIndex(c => c >= cost);
    return Math.round((index / sorted.length) * 100);
  };

  const getTooltipPosition = (mouseX: number, mouseY: number) => {
    const tooltipWidth = 260;
    const tooltipHeight = 200;
    const padding = 20;
    const offset = 15;

    let x = mouseX + offset;
    let y = mouseY + offset;

    if (x + tooltipWidth + padding > window.innerWidth) {
      x = mouseX - tooltipWidth - offset;
    }

    if (y + tooltipHeight + padding > window.innerHeight) {
      y = mouseY - tooltipHeight - offset;
    }

    x = Math.max(padding, x);
    y = Math.max(padding, y);

    return { x, y };
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
      <div className="flex-shrink-0 px-3 py-2 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {outliers.length > 0 && (
            <div className="flex items-center gap-1.5 bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-full">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-xs font-semibold text-amber-800">
                {outliers.length} outlier{outliers.length > 1 ? 's' : ''}
              </span>
            </div>
          )}

          {insights.length > 0 && (
            <button
              onClick={() => setShowAIInsights(!showAIInsights)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all duration-200 ${
                showAIInsights
                  ? 'bg-amber-50 border-amber-200 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {showAIInsights ? (
                <ChevronDown className="w-3.5 h-3.5 text-amber-600" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )}
              <Lightbulb className={`w-3.5 h-3.5 ${showAIInsights ? 'text-amber-500' : 'text-slate-400'}`} />
              <span className={`text-xs font-medium ${showAIInsights ? 'text-amber-700' : 'text-slate-600'}`}>
                AI Insights
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                showAIInsights ? 'bg-amber-200 text-amber-800' : 'bg-slate-100 text-slate-500'
              }`}>
                {insights.length}
              </span>
            </button>
          )}
        </div>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-1.5 rounded-lg border transition-all duration-200 ${
            showSettings
              ? 'bg-slate-100 border-slate-300 shadow-inner'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          }`}
          title="Map Settings"
        >
          <Settings className={`w-4 h-4 ${showSettings ? 'text-slate-700' : 'text-slate-500'}`} />
        </button>
      </div>

      {showSettings && (
        <div className="flex-shrink-0 px-4 py-3 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showLabels}
                onChange={(e) => setShowLabels(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Show state labels</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={highlightOutliers}
                onChange={(e) => setHighlightOutliers(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Highlight outliers</span>
            </label>
          </div>
        </div>
      )}

      {showAIInsights && insights.length > 0 && (
        <div className="flex-shrink-0 px-4 py-3 bg-gradient-to-b from-amber-50 to-slate-50 border-b border-slate-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {insights.map((insight, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 p-2.5 rounded-lg border ${
                  insight.type === 'warning'
                    ? 'bg-amber-50 border-amber-200'
                    : insight.type === 'success'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                <InsightIcon
                  icon={insight.icon}
                  className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                    insight.type === 'warning'
                      ? 'text-amber-600'
                      : insight.type === 'success'
                      ? 'text-green-600'
                      : 'text-blue-600'
                  }`}
                />
                <div className="min-w-0">
                  <div className={`text-xs font-medium ${
                    insight.type === 'warning'
                      ? 'text-amber-900'
                      : insight.type === 'success'
                      ? 'text-green-900'
                      : 'text-blue-900'
                  }`}>
                    {insight.message}
                  </div>
                  {insight.detail && (
                    <div className={`text-xs mt-0.5 ${
                      insight.type === 'warning'
                        ? 'text-amber-700'
                        : insight.type === 'success'
                        ? 'text-green-700'
                        : 'text-blue-700'
                    }`}>
                      {insight.detail}
                    </div>
                  )}
                </div>
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
                  const isOutlier = provinceCode && outliers.includes(provinceCode) && highlightOutliers;

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
                  const isOutlier = stateCode && outliers.includes(stateCode) && highlightOutliers;

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

              const hasData = !!regionData;

              return (
                <Marker key={code} coordinates={coordinates}>
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`scale(${1 / zoom})`}
                    fontSize={isSmallRegion ? 7 : 8}
                    fontWeight={600}
                    fill={hasData ? '#ffffff' : '#94a3b8'}
                    style={{
                      pointerEvents: 'none',
                      userSelect: 'none',
                      textShadow: hasData ? '0 1px 2px rgba(0,0,0,0.6)' : 'none',
                      fontFamily: 'system-ui, -apple-system, sans-serif',
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
            className="fixed bg-white rounded-xl shadow-2xl border border-slate-200 pointer-events-none z-50 overflow-hidden"
            style={{
              left: `${getTooltipPosition(tooltipPos.x, tooltipPos.y).x}px`,
              top: `${getTooltipPosition(tooltipPos.x, tooltipPos.y).y}px`,
              minWidth: '220px',
              maxWidth: '260px',
            }}
          >
            <div className={`px-4 py-2.5 border-b ${
              outliers.includes(hoveredRegionData.stateCode)
                ? 'bg-amber-50 border-amber-100'
                : 'bg-slate-50 border-slate-100'
            }`}>
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-slate-900">
                  {ALL_REGION_NAMES[hoveredRegionData.stateCode] || hoveredRegionData.stateCode}
                </span>
                {outliers.includes(hoveredRegionData.stateCode) && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 border border-amber-200 text-amber-800 text-xs rounded-full font-medium">
                    <AlertTriangle className="w-3 h-3" />
                    Outlier
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {CANADIAN_PROVINCES[hoveredRegionData.stateCode] ? 'Canada' : 'United States'}
              </div>
            </div>

            <div className="px-4 py-3">
              <div className="text-3xl font-bold text-slate-900 mb-1">
                {formatCurrency(hoveredRegionData.avgCost)}
              </div>
              <div className="text-sm text-slate-600">
                {hoveredRegionData.shipmentCount.toLocaleString()} shipments
              </div>
            </div>

            <div className="px-4 py-3 bg-slate-50 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">vs average</span>
                <div className="flex items-center gap-1.5">
                  {hoveredRegionData.avgCost > meanCost ? (
                    <TrendingUp className="w-4 h-4 text-red-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-green-500" />
                  )}
                  <span className={`text-sm font-semibold ${
                    hoveredRegionData.avgCost > meanCost
                      ? 'text-red-600'
                      : 'text-green-600'
                  }`}>
                    {hoveredRegionData.avgCost > meanCost ? '+' : ''}
                    {((hoveredRegionData.avgCost - meanCost) / meanCost * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-slate-500">Percentile</span>
                <span className="text-xs font-medium text-slate-700">
                  {getPercentile(hoveredRegionData.avgCost)}th
                </span>
              </div>
              <div className="mt-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-full"
                  style={{ width: `${getPercentile(hoveredRegionData.avgCost)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        <div className="absolute bottom-4 right-4 flex flex-col gap-1 z-10">
          <button
            onClick={() => setZoom((z) => Math.min(z * 1.5, 6))}
            className="w-9 h-9 bg-white shadow-lg rounded-lg flex items-center justify-center hover:bg-slate-50 border border-slate-200 transition-all duration-150 hover:scale-105"
            title="Zoom In"
          >
            <Plus className="w-4 h-4 text-slate-700" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(z / 1.5, 0.5))}
            className="w-9 h-9 bg-white shadow-lg rounded-lg flex items-center justify-center hover:bg-slate-50 border border-slate-200 transition-all duration-150 hover:scale-105"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4 text-slate-700" />
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setCenter([-98, 48]);
            }}
            className="w-9 h-9 bg-white shadow-lg rounded-lg flex items-center justify-center hover:bg-slate-50 border border-slate-200 transition-all duration-150 hover:scale-105"
            title="Reset View"
          >
            <RotateCcw className="w-4 h-4 text-slate-700" />
          </button>
        </div>

        <div className="absolute top-3 left-3 text-xs text-slate-400 bg-white/80 backdrop-blur px-2 py-1 rounded">
          Zoom: {zoom.toFixed(1)}x
        </div>
      </div>

      <div className="flex-shrink-0 px-4 py-3 border-t border-slate-200 bg-gradient-to-r from-white to-slate-50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">Avg Cost per Shipment</span>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs text-slate-500">
              {data.length} regions
            </span>
          </div>
          {noDataCount > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-slate-200 border border-slate-300" />
              <span className="text-xs text-slate-500">{noDataCount} no data</span>
            </div>
          )}
        </div>

        <div className="h-4 rounded-lg flex overflow-hidden shadow-inner border border-slate-200">
          {COLOR_SCALE.map((color, i) => (
            <div
              key={i}
              className="flex-1 relative group cursor-help"
              style={{ backgroundColor: color }}
              title={`${formatCurrency(thresholds[i])} - ${formatCurrency(thresholds[i + 1] || maxCost)}`}
            >
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
            </div>
          ))}
        </div>

        <div className="flex justify-between mt-2">
          <div className="text-left">
            <div className="text-sm font-semibold text-slate-800">{formatCurrency(minCost)}</div>
            <div className="text-xs text-slate-400">Min</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-semibold text-slate-800">{formatCurrency(meanCost)}</div>
            <div className="text-xs text-slate-400">Avg</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-slate-800">{formatCurrency(maxCost)}</div>
            <div className="text-xs text-slate-400">Max</div>
          </div>
        </div>
      </div>
    </div>
  );
}
