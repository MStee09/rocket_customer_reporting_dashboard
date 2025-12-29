import { useState, useMemo, useEffect } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  Line,
  ZoomableGroup,
} from 'react-simple-maps';
import { Loader2, Plus, Minus, RotateCcw, Filter, Settings, Lightbulb, ChevronDown, ChevronRight, TrendingUp, TrendingDown, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface LocationData {
  state: string;
  stateCode: string;
  coordinates: [number, number];
  outbound: number;
  inbound: number;
  country: 'US' | 'CA';
}

interface RouteData {
  origin: string;
  destination: string;
  originCoords: [number, number];
  destCoords: [number, number];
  shipmentCount: number;
  totalCost: number;
  isCrossBorder: boolean;
}

interface ShipmentFlowMapProps {
  effectiveCustomerIds: number[];
  isAdmin: boolean;
  isViewingAsCustomer: boolean;
  startDate: string;
  endDate: string;
}

const usGeoUrl = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';
const canadaGeoUrl = 'https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/canada.geojson';

const STATE_COORDINATES: { [key: string]: [number, number] } = {
  AL: [-86.9023, 32.8067], AK: [-152.4044, 61.3707], AZ: [-111.4312, 33.7298],
  AR: [-92.3731, 34.9697], CA: [-119.4179, 36.7783], CO: [-105.7821, 39.5501],
  CT: [-72.7554, 41.5978], DE: [-75.5071, 39.3498], FL: [-81.5158, 27.7663],
  GA: [-83.6431, 32.9866], HI: [-157.4983, 21.0943], ID: [-114.4788, 44.2405],
  IL: [-89.3985, 40.3495], IN: [-86.2604, 39.8494], IA: [-93.0977, 42.0115],
  KS: [-96.7265, 38.5266], KY: [-84.6701, 37.6681], LA: [-91.8749, 31.1695],
  ME: [-69.3819, 44.6939], MD: [-76.6413, 39.0639], MA: [-71.5301, 42.2302],
  MI: [-84.5361, 43.3266], MN: [-93.9196, 45.6945], MS: [-89.6785, 32.7416],
  MO: [-92.2896, 38.4561], MT: [-110.4544, 46.9219], NE: [-98.2680, 41.1254],
  NV: [-117.0554, 38.3135], NH: [-71.5639, 43.4525], NJ: [-74.5210, 40.2989],
  NM: [-106.2371, 34.8405], NY: [-74.9180, 42.1657], NC: [-79.8064, 35.6301],
  ND: [-99.7840, 47.5289], OH: [-82.7649, 40.3888], OK: [-96.9289, 35.5653],
  OR: [-122.0709, 44.5720], PA: [-77.1945, 40.5908], RI: [-71.5117, 41.6809],
  SC: [-80.9450, 33.8569], SD: [-99.4388, 44.2998], TN: [-86.6923, 35.7478],
  TX: [-97.5631, 31.0545], UT: [-111.8910, 40.1500], VT: [-72.7107, 44.0459],
  VA: [-78.1690, 37.7693], WA: [-121.4906, 47.4009], WV: [-80.9545, 38.4912],
  WI: [-89.6165, 44.2685], WY: [-107.3025, 42.7559],
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

const ALL_COORDINATES: { [key: string]: [number, number] } = {
  ...STATE_COORDINATES,
  ...CANADIAN_PROVINCE_COORDINATES,
};

const CANADIAN_PROVINCES = new Set(['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT']);
const US_STATES = new Set(Object.keys(STATE_COORDINATES));

const REGION_NAMES: { [key: string]: string } = {
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
  AB: 'Alberta', BC: 'British Columbia', MB: 'Manitoba', NB: 'New Brunswick',
  NL: 'Newfoundland and Labrador', NS: 'Nova Scotia', NT: 'Northwest Territories',
  NU: 'Nunavut', ON: 'Ontario', PE: 'Prince Edward Island', QC: 'Quebec',
  SK: 'Saskatchewan', YT: 'Yukon',
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

type ColorMode = 'volume' | 'cost' | 'efficiency';

interface Insight {
  type: 'warning' | 'info' | 'success';
  icon: 'trend' | 'region' | 'compare' | 'volume';
  message: string;
  detail?: string;
}

function generateInsights(routes: RouteData[], locations: LocationData[]): Insight[] {
  const insights: Insight[] = [];

  if (routes.length === 0) return insights;

  const totalShipments = routes.reduce((sum, r) => sum + r.shipmentCount, 0);
  const totalCost = routes.reduce((sum, r) => sum + r.totalCost, 0);
  const avgCost = totalCost / totalShipments;

  const sortedRoutes = [...routes].sort((a, b) => b.shipmentCount - a.shipmentCount);
  if (sortedRoutes.length > 0) {
    const topRoute = sortedRoutes[0];
    const topRoutePct = ((topRoute.shipmentCount / totalShipments) * 100).toFixed(0);
    insights.push({
      type: 'info',
      icon: 'volume',
      message: `Top lane: ${topRoute.origin} to ${topRoute.destination}`,
      detail: `${topRoute.shipmentCount.toLocaleString()} shipments (${topRoutePct}% of total)`,
    });
  }

  const crossBorderRoutes = routes.filter(r => r.isCrossBorder);
  if (crossBorderRoutes.length > 0) {
    const crossBorderShipments = crossBorderRoutes.reduce((sum, r) => sum + r.shipmentCount, 0);
    const crossBorderCost = crossBorderRoutes.reduce((sum, r) => sum + r.totalCost, 0);
    const crossBorderAvgCost = crossBorderCost / crossBorderShipments;
    const domesticAvgCost = (totalCost - crossBorderCost) / (totalShipments - crossBorderShipments);

    const pctDiff = ((crossBorderAvgCost - domesticAvgCost) / domesticAvgCost * 100).toFixed(0);
    insights.push({
      type: Number(pctDiff) > 20 ? 'warning' : 'info',
      icon: 'compare',
      message: `Cross-border: ${crossBorderRoutes.length} routes`,
      detail: `Avg cost ${Number(pctDiff) >= 0 ? '+' : ''}${pctDiff}% vs domestic`,
    });
  }

  const outboundByState = new Map<string, number>();
  const inboundByState = new Map<string, number>();
  routes.forEach(r => {
    outboundByState.set(r.origin, (outboundByState.get(r.origin) || 0) + r.shipmentCount);
    inboundByState.set(r.destination, (inboundByState.get(r.destination) || 0) + r.shipmentCount);
  });

  const topOrigin = [...outboundByState.entries()].sort((a, b) => b[1] - a[1])[0];
  const topDestination = [...inboundByState.entries()].sort((a, b) => b[1] - a[1])[0];

  if (topOrigin) {
    insights.push({
      type: 'info',
      icon: 'region',
      message: `Top origin: ${REGION_NAMES[topOrigin[0]] || topOrigin[0]}`,
      detail: `${topOrigin[1].toLocaleString()} outbound shipments`,
    });
  }

  if (topDestination) {
    insights.push({
      type: 'info',
      icon: 'region',
      message: `Top destination: ${REGION_NAMES[topDestination[0]] || topDestination[0]}`,
      detail: `${topDestination[1].toLocaleString()} inbound shipments`,
    });
  }

  const highCostRoutes = routes.filter(r => (r.totalCost / r.shipmentCount) > avgCost * 1.3);
  if (highCostRoutes.length > 0) {
    const highCostShipments = highCostRoutes.reduce((sum, r) => sum + r.shipmentCount, 0);
    insights.push({
      type: 'warning',
      icon: 'trend',
      message: `${highCostRoutes.length} high-cost routes identified`,
      detail: `${highCostShipments.toLocaleString()} shipments 30%+ above average`,
    });
  }

  return insights;
}

function InsightIcon({ icon, className }: { icon: Insight['icon']; className?: string }) {
  switch (icon) {
    case 'trend':
      return <TrendingUp className={className} />;
    case 'region':
      return <MapPin className={className} />;
    case 'compare':
      return <TrendingDown className={className} />;
    case 'volume':
      return <Filter className={className} />;
    default:
      return <Lightbulb className={className} />;
  }
}

export function ShipmentFlowMap({
  effectiveCustomerIds,
  isAdmin,
  isViewingAsCustomer,
  startDate,
  endDate,
}: ShipmentFlowMapProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [minShipments, setMinShipments] = useState(1);
  const [hoveredRoute, setHoveredRoute] = useState<RouteData | null>(null);
  const [hoveredLocation, setHoveredLocation] = useState<LocationData | null>(null);
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<[number, number]>([-98, 48]);
  const [colorMode, setColorMode] = useState<ColorMode>('volume');
  const [selectedOrigin, setSelectedOrigin] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [showLabels, setShowLabels] = useState(false);

  const customerIdsKey = (effectiveCustomerIds ?? []).join(',');

  useEffect(() => {
    loadMapData();
  }, [customerIdsKey, isAdmin, isViewingAsCustomer, startDate, endDate]);

  const loadMapData = async () => {
    setIsLoading(true);
    try {
      let shipmentQuery = supabase
        .from('shipment')
        .select(`
          load_id,
          cost,
          retail,
          addresses:shipment_address(
            address_type,
            stop_number,
            state
          )
        `);

      if (!isAdmin || isViewingAsCustomer) {
        const customerIds = effectiveCustomerIds ?? [];
        if (customerIds.length > 0) {
          shipmentQuery = shipmentQuery.in('customer_id', customerIds);
        }
      }

      const { data: shipments } = await shipmentQuery
        .gte('pickup_date', startDate)
        .lte('pickup_date', endDate);

      if (shipments && shipments.length > 0) {
        const locationCounts: { [state: string]: { outbound: number; inbound: number } } = {};
        const routeCounts: { [route: string]: { count: number; cost: number } } = {};

        shipments.forEach((shipment: any) => {
          if (!shipment.addresses || shipment.addresses.length < 2) return;

          const sortedAddresses = [...shipment.addresses].sort((a, b) => a.stop_number - b.stop_number);
          const origin = sortedAddresses.find((a: any) => a.address_type === 1);
          const destination = sortedAddresses.find((a: any) => a.address_type === 2);

          if (origin?.state && destination?.state && ALL_COORDINATES[origin.state] && ALL_COORDINATES[destination.state]) {
            locationCounts[origin.state] = locationCounts[origin.state] || { outbound: 0, inbound: 0 };
            locationCounts[destination.state] = locationCounts[destination.state] || { outbound: 0, inbound: 0 };

            locationCounts[origin.state].outbound++;
            locationCounts[destination.state].inbound++;

            const routeKey = `${origin.state}-${destination.state}`;
            routeCounts[routeKey] = routeCounts[routeKey] || { count: 0, cost: 0 };
            routeCounts[routeKey].count++;
            routeCounts[routeKey].cost += parseFloat(shipment.retail) || parseFloat(shipment.cost) || 0;
          }
        });

        const locationData: LocationData[] = Object.entries(locationCounts).map(([stateCode, counts]) => ({
          state: stateCode,
          stateCode,
          coordinates: ALL_COORDINATES[stateCode],
          outbound: counts.outbound,
          inbound: counts.inbound,
          country: CANADIAN_PROVINCES.has(stateCode) ? 'CA' : 'US',
        }));

        const routeData: RouteData[] = Object.entries(routeCounts).map(([routeKey, data]) => {
          const [origin, destination] = routeKey.split('-');
          const originIsCanada = CANADIAN_PROVINCES.has(origin);
          const destIsCanada = CANADIAN_PROVINCES.has(destination);
          return {
            origin,
            destination,
            originCoords: ALL_COORDINATES[origin],
            destCoords: ALL_COORDINATES[destination],
            shipmentCount: data.count,
            totalCost: data.cost,
            isCrossBorder: originIsCanada !== destIsCanada,
          };
        });

        setLocations(locationData);
        setRoutes(routeData);
      }
    } catch (error) {
      console.error('Error loading map data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRoutes = useMemo(() => {
    let filtered = routes.filter(r => r.shipmentCount >= minShipments);
    if (selectedOrigin) {
      filtered = filtered.filter(r => r.origin === selectedOrigin);
    }
    return filtered;
  }, [routes, minShipments, selectedOrigin]);

  const insights = useMemo(() => {
    return generateInsights(filteredRoutes, locations);
  }, [filteredRoutes, locations]);

  const maxShipments = Math.max(...filteredRoutes.map(r => r.shipmentCount), 1);
  const maxVolume = Math.max(...locations.map(l => Math.max(l.outbound, l.inbound)), 1);

  const avgCostPerShipment = useMemo(() => {
    const totalCost = filteredRoutes.reduce((sum, r) => sum + r.totalCost, 0);
    const totalShipments = filteredRoutes.reduce((sum, r) => sum + r.shipmentCount, 0);
    return totalShipments > 0 ? totalCost / totalShipments : 0;
  }, [filteredRoutes]);

  const hasCanadianData = locations.some(l => l.country === 'CA');
  const totalOrigins = new Set(filteredRoutes.map(r => r.origin)).size;
  const totalDestinations = new Set(filteredRoutes.map(r => r.destination)).size;
  const totalShipments = filteredRoutes.reduce((sum, r) => sum + r.shipmentCount, 0);
  const crossBorderCount = filteredRoutes.filter(r => r.isCrossBorder).length;

  const getRouteColor = (route: RouteData) => {
    if (route.isCrossBorder) {
      switch (colorMode) {
        case 'cost': {
          const avgCost = route.totalCost / route.shipmentCount;
          if (avgCost < avgCostPerShipment * 0.8) return 'rgba(16, 185, 129, 0.8)';
          if (avgCost < avgCostPerShipment * 1.2) return 'rgba(234, 179, 8, 0.8)';
          return 'rgba(239, 68, 68, 0.8)';
        }
        default:
          const opacity = 0.4 + (route.shipmentCount / maxShipments) * 0.6;
          return `rgba(59, 130, 246, ${opacity})`;
      }
    }

    switch (colorMode) {
      case 'cost': {
        const avgCost = route.totalCost / route.shipmentCount;
        if (avgCost < avgCostPerShipment * 0.8) return 'rgba(16, 185, 129, 0.7)';
        if (avgCost < avgCostPerShipment * 1.2) return 'rgba(234, 179, 8, 0.7)';
        return 'rgba(239, 68, 68, 0.7)';
      }
      case 'efficiency': {
        const avgCost = route.totalCost / route.shipmentCount;
        const efficiency = route.shipmentCount / (avgCost / 100);
        const maxEfficiency = Math.max(...filteredRoutes.map(r => r.shipmentCount / (r.totalCost / r.shipmentCount / 100)));
        const normalizedEfficiency = efficiency / maxEfficiency;
        if (normalizedEfficiency > 0.7) return 'rgba(16, 185, 129, 0.7)';
        if (normalizedEfficiency > 0.4) return 'rgba(234, 179, 8, 0.7)';
        return 'rgba(239, 68, 68, 0.7)';
      }
      case 'volume':
      default:
        const opacity = 0.3 + (route.shipmentCount / maxShipments) * 0.7;
        return `rgba(249, 115, 22, ${opacity})`;
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-slate-50">
      <div className="flex-shrink-0 px-3 py-2 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span className="font-semibold text-slate-800">{totalOrigins}</span>
              <span className="text-slate-400">Origins</span>
              <span className="text-slate-300">|</span>
              <span className="font-semibold text-slate-800">{totalDestinations}</span>
              <span className="text-slate-400">Destinations</span>
              <span className="text-slate-300">|</span>
              <span className="font-semibold text-slate-800">{filteredRoutes.length}</span>
              <span className="text-slate-400">Routes</span>
            </div>

            {crossBorderCount > 0 && (
              <div className="flex items-center gap-1.5 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-full ml-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs font-medium text-blue-800">{crossBorderCount} cross-border</span>
              </div>
            )}

            {insights.length > 0 && (
              <button
                onClick={() => setShowInsights(!showInsights)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all duration-200 ml-2 ${
                  showInsights
                    ? 'bg-amber-50 border-amber-200 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {showInsights ? (
                  <ChevronDown className="w-3.5 h-3.5 text-amber-600" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                )}
                <Lightbulb className={`w-3.5 h-3.5 ${showInsights ? 'text-amber-500' : 'text-slate-400'}`} />
                <span className={`text-xs font-medium ${showInsights ? 'text-amber-700' : 'text-slate-600'}`}>
                  Insights
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  showInsights ? 'bg-amber-200 text-amber-800' : 'bg-slate-100 text-slate-500'
                }`}>
                  {insights.length}
                </span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {selectedOrigin && (
              <button
                onClick={() => setSelectedOrigin(null)}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-100 border border-orange-200 text-orange-700 rounded-full text-xs hover:bg-orange-200 transition-colors"
              >
                <Filter className="w-3 h-3" />
                From: {REGION_NAMES[selectedOrigin] || selectedOrigin}
                <span className="ml-0.5 font-bold">x</span>
              </button>
            )}

            <select
              value={colorMode}
              onChange={(e) => setColorMode(e.target.value as ColorMode)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white hover:border-slate-300 transition-colors"
            >
              <option value="volume">Color by Volume</option>
              <option value="cost">Color by Cost</option>
              <option value="efficiency">Color by Efficiency</option>
            </select>

            <label className="flex items-center gap-2 text-xs text-slate-600">
              <span>Min:</span>
              <input
                type="range"
                min="1"
                max={Math.max(20, Math.floor(maxShipments / 2))}
                value={minShipments}
                onChange={(e) => setMinShipments(Number(e.target.value))}
                className="w-16 accent-orange-500"
              />
              <span className="font-semibold w-6 text-slate-800">{minShipments}</span>
            </label>

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
        </div>
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
          </div>
        </div>
      )}

      {showInsights && insights.length > 0 && (
        <div className="flex-shrink-0 px-4 py-3 bg-gradient-to-b from-amber-50 to-slate-50 border-b border-slate-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
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

      <div className="flex-1 relative min-h-0">
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
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="#E5E7EB"
                    stroke="#9CA3AF"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: 'none' },
                      hover: { outline: 'none', fill: '#D1D5DB' },
                      pressed: { outline: 'none' },
                    }}
                  />
                ))
              }
            </Geographies>

            <Geographies geography={usGeoUrl}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="#E5E7EB"
                    stroke="#9CA3AF"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: 'none' },
                      hover: { outline: 'none', fill: '#D1D5DB' },
                      pressed: { outline: 'none' },
                    }}
                  />
                ))
              }
            </Geographies>

            {filteredRoutes.map((route, index) => {
              const strokeWidth = 1 + (route.shipmentCount / maxShipments) * 3;
              const isHovered = hoveredRoute?.origin === route.origin && hoveredRoute?.destination === route.destination;

              return (
                <Line
                  key={index}
                  from={route.originCoords}
                  to={route.destCoords}
                  stroke={getRouteColor(route)}
                  strokeWidth={isHovered ? strokeWidth + 2 : strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={route.isCrossBorder ? '4,2' : undefined}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredRoute(route)}
                  onMouseLeave={() => setHoveredRoute(null)}
                />
              );
            })}

            {locations
              .filter(l => l.outbound > 0)
              .map((location, index) => {
                const size = 4 + (location.outbound / maxVolume) * 8;
                const isSelected = selectedOrigin === location.stateCode;
                const isCanadian = location.country === 'CA';

                return (
                  <Marker
                    key={index}
                    coordinates={location.coordinates}
                    onMouseEnter={() => setHoveredLocation(location)}
                    onMouseLeave={() => setHoveredLocation(null)}
                  >
                    <circle
                      r={size}
                      fill={isSelected ? '#3b82f6' : isCanadian ? '#dc2626' : '#EF4444'}
                      fillOpacity={0.8}
                      stroke={isCanadian ? '#fef2f2' : '#FFF'}
                      strokeWidth={isSelected ? 3 : isCanadian ? 2 : 1.5}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedOrigin(selectedOrigin === location.stateCode ? null : location.stateCode)}
                    />
                    {showLabels && zoom > 1.2 && (
                      <text
                        textAnchor="middle"
                        y={-size - 4}
                        fontSize={7 / zoom}
                        fontWeight="600"
                        fill="#1e293b"
                        style={{
                          pointerEvents: 'none',
                          userSelect: 'none',
                          textShadow: '0 1px 2px rgba(255,255,255,0.8)',
                        }}
                      >
                        {location.stateCode}
                      </text>
                    )}
                  </Marker>
                );
              })}

            {locations
              .filter(l => l.inbound > 0 && l.outbound === 0)
              .map((location, index) => {
                const size = 3 + (location.inbound / maxVolume) * 6;
                const isCanadian = location.country === 'CA';

                return (
                  <Marker
                    key={`dest-${index}`}
                    coordinates={location.coordinates}
                    onMouseEnter={() => setHoveredLocation(location)}
                    onMouseLeave={() => setHoveredLocation(null)}
                  >
                    <circle
                      r={size}
                      fill={isCanadian ? '#ea580c' : '#F97316'}
                      fillOpacity={0.6}
                      stroke={isCanadian ? '#fff7ed' : '#FFF'}
                      strokeWidth={isCanadian ? 2 : 1.5}
                    />
                    {showLabels && zoom > 1.5 && (
                      <text
                        textAnchor="middle"
                        y={-size - 3}
                        fontSize={6 / zoom}
                        fontWeight="500"
                        fill="#64748b"
                        style={{
                          pointerEvents: 'none',
                          userSelect: 'none',
                        }}
                      >
                        {location.stateCode}
                      </text>
                    )}
                  </Marker>
                );
              })}
          </ZoomableGroup>
        </ComposableMap>

        {hoveredRoute && (
          <div className="absolute top-4 right-4 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden text-xs z-10 min-w-[220px]">
            <div className={`px-4 py-2.5 border-b ${
              hoveredRoute.isCrossBorder ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100'
            }`}>
              <div className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                {REGION_NAMES[hoveredRoute.origin] || hoveredRoute.origin}
                <span className="text-slate-400">-&gt;</span>
                {REGION_NAMES[hoveredRoute.destination] || hoveredRoute.destination}
              </div>
              {hoveredRoute.isCrossBorder && (
                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-blue-100 border border-blue-200 text-blue-800 text-xs rounded-full">
                  Cross-border
                </span>
              )}
            </div>
            <div className="px-4 py-3 space-y-2 text-slate-600">
              <div className="flex justify-between">
                <span>Shipments:</span>
                <span className="font-semibold text-slate-900">{hoveredRoute.shipmentCount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Cost:</span>
                <span className="font-semibold text-slate-900">${hoveredRoute.totalCost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Avg Cost:</span>
                <span className="font-semibold text-slate-900">${(hoveredRoute.totalCost / hoveredRoute.shipmentCount).toFixed(2)}</span>
              </div>
            </div>
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">vs Network Avg:</span>
                <span className={`font-semibold ${
                  (hoveredRoute.totalCost / hoveredRoute.shipmentCount) > avgCostPerShipment
                    ? 'text-red-600' : 'text-green-600'
                }`}>
                  {(hoveredRoute.totalCost / hoveredRoute.shipmentCount) > avgCostPerShipment ? '+' : ''}
                  {(((hoveredRoute.totalCost / hoveredRoute.shipmentCount) - avgCostPerShipment) / avgCostPerShipment * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        )}

        {hoveredLocation && !hoveredRoute && (
          <div className="absolute top-4 left-4 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden text-xs z-10 min-w-[180px]">
            <div className={`px-4 py-2.5 border-b ${
              hoveredLocation.country === 'CA' ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'
            }`}>
              <div className="font-semibold text-slate-900">
                {REGION_NAMES[hoveredLocation.state] || hoveredLocation.state}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {hoveredLocation.country === 'CA' ? 'Canada' : 'United States'}
              </div>
            </div>
            <div className="px-4 py-3 space-y-2 text-slate-600">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span>Outbound:</span>
                <span className="font-semibold text-slate-900 ml-auto">{hoveredLocation.outbound.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                <span>Inbound:</span>
                <span className="font-semibold text-slate-900 ml-auto">{hoveredLocation.inbound.toLocaleString()}</span>
              </div>
            </div>
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100">
              <div className={`font-semibold ${
                hoveredLocation.outbound - hoveredLocation.inbound >= 0
                  ? 'text-blue-600' : 'text-cyan-600'
              }`}>
                Net: {hoveredLocation.outbound - hoveredLocation.inbound >= 0 ? '+' : ''}
                {(hoveredLocation.outbound - hoveredLocation.inbound).toLocaleString()}
                <span className="font-normal text-slate-500 ml-1">
                  ({hoveredLocation.outbound > hoveredLocation.inbound ? 'shipper' : 'receiver'})
                </span>
              </div>
            </div>
            <div className="px-4 py-2 bg-slate-100 text-slate-400 text-xs">
              Click origin to filter routes
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
            onClick={() => { setZoom(1); setCenter([-98, 48]); }}
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
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-slate-600">Origin (click to filter)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-slate-600">Destination only</span>
            </div>
            {hasCanadianData && (
              <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-200">
                <div className="w-4 h-1 bg-blue-500 rounded" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #3b82f6, #3b82f6 4px, transparent 4px, transparent 6px)' }} />
                <span className="text-slate-600">Cross-border</span>
              </div>
            )}
            {colorMode === 'cost' && (
              <>
                <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-200">
                  <div className="w-4 h-1 bg-green-500 rounded" />
                  <span className="text-slate-600">Below avg</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-1 bg-red-500 rounded" />
                  <span className="text-slate-600">Above avg</span>
                </div>
              </>
            )}
          </div>
          <div className="text-slate-400">Line width = shipment volume</div>
        </div>
      </div>
    </div>
  );
}
