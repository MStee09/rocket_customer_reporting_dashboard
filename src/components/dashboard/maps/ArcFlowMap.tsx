import { useState, useMemo } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  Line,
  ZoomableGroup,
} from 'react-simple-maps';
import { Loader2, Plus, Minus, RotateCcw, Filter } from 'lucide-react';

const geoUrl = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

export interface FlowRoute {
  id: string;
  origin: string;
  originCoords: [number, number];
  destination: string;
  destCoords: [number, number];
  shipmentCount: number;
  totalCost: number;
  avgTransitDays?: number;
}

export interface FlowLocation {
  stateCode: string;
  coordinates: [number, number];
  outbound: number;
  inbound: number;
  netFlow: number;
}

interface ArcFlowMapProps {
  routes: FlowRoute[];
  locations: FlowLocation[];
  isLoading?: boolean;
  title?: string;
  onRouteClick?: (route: FlowRoute) => void;
  onLocationClick?: (location: FlowLocation) => void;
  colorMode?: 'volume' | 'cost' | 'transit';
  className?: string;
}

export function ArcFlowMap({
  routes,
  locations,
  isLoading = false,
  title = 'Shipment Flow Analysis',
  onRouteClick,
  onLocationClick,
  colorMode = 'volume',
  className = '',
}: ArcFlowMapProps) {
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<[number, number]>([-96, 38]);
  const [minShipments, setMinShipments] = useState(1);
  const [hoveredRoute, setHoveredRoute] = useState<FlowRoute | null>(null);
  const [hoveredLocation, setHoveredLocation] = useState<FlowLocation | null>(null);
  const [selectedOrigin, setSelectedOrigin] = useState<string | null>(null);
  const [localColorMode, setLocalColorMode] = useState(colorMode);

  const filteredRoutes = useMemo(() => {
    let filtered = routes.filter(r => r.shipmentCount >= minShipments);
    if (selectedOrigin) {
      filtered = filtered.filter(r => r.origin === selectedOrigin);
    }
    return filtered;
  }, [routes, minShipments, selectedOrigin]);

  const maxShipments = useMemo(() => Math.max(...filteredRoutes.map(r => r.shipmentCount), 1), [filteredRoutes]);
  const maxVolume = useMemo(() => Math.max(...locations.map(l => Math.max(l.outbound, l.inbound)), 1), [locations]);

  const avgCostPerShipment = useMemo(() => {
    const totalCost = filteredRoutes.reduce((sum, r) => sum + r.totalCost, 0);
    const totalShipments = filteredRoutes.reduce((sum, r) => sum + r.shipmentCount, 0);
    return totalShipments > 0 ? totalCost / totalShipments : 0;
  }, [filteredRoutes]);

  const totalOrigins = new Set(filteredRoutes.map(r => r.origin)).size;
  const totalDestinations = new Set(filteredRoutes.map(r => r.destination)).size;
  const totalShipments = filteredRoutes.reduce((sum, r) => sum + r.shipmentCount, 0);

  const getRouteColor = (route: FlowRoute) => {
    switch (localColorMode) {
      case 'cost': {
        const avgCost = route.totalCost / route.shipmentCount;
        if (avgCost < avgCostPerShipment * 0.8) return 'rgba(34, 197, 94, 0.7)';
        if (avgCost < avgCostPerShipment * 1.2) return 'rgba(234, 179, 8, 0.7)';
        return 'rgba(239, 68, 68, 0.7)';
      }
      case 'transit': {
        const days = route.avgTransitDays || 3;
        if (days < 2) return 'rgba(34, 197, 94, 0.7)';
        if (days < 4) return 'rgba(234, 179, 8, 0.7)';
        return 'rgba(239, 68, 68, 0.7)';
      }
      case 'volume':
      default:
        return `rgba(249, 115, 22, ${0.3 + (route.shipmentCount / maxShipments) * 0.7})`;
    }
  };

  if (isLoading) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-slate-50 ${className}`}>
        <Loader2 className="w-12 h-12 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className={`w-full h-full flex flex-col bg-slate-50 ${className}`}>
      <div className="flex-shrink-0 px-4 py-2 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="font-semibold text-slate-800">{title}</h3>
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span>{totalOrigins} Origins</span>
              <span className="text-slate-300">|</span>
              <span>{totalDestinations} Destinations</span>
              <span className="text-slate-300">|</span>
              <span>{filteredRoutes.length} Routes</span>
              <span className="text-slate-300">|</span>
              <span>{totalShipments.toLocaleString()} Shipments</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {selectedOrigin && (
              <button
                onClick={() => setSelectedOrigin(null)}
                className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs hover:bg-orange-200"
              >
                <Filter className="w-3 h-3" />
                From: {selectedOrigin}
                <span className="ml-1">x</span>
              </button>
            )}

            <select
              value={localColorMode}
              onChange={(e) => setLocalColorMode(e.target.value as typeof localColorMode)}
              className="text-xs border border-slate-200 rounded px-2 py-1 bg-white"
            >
              <option value="volume">Color by Volume</option>
              <option value="cost">Color by Cost</option>
              <option value="transit">Color by Transit</option>
            </select>

            <label className="flex items-center gap-2 text-xs text-slate-600">
              <span>Min:</span>
              <input
                type="range"
                min="1"
                max={Math.max(20, Math.floor(maxShipments / 2))}
                value={minShipments}
                onChange={(e) => setMinShipments(Number(e.target.value))}
                className="w-16"
              />
              <span className="font-semibold w-6">{minShipments}</span>
            </label>
          </div>
        </div>
      </div>

      <div className="flex-1 relative min-h-0">
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

            {filteredRoutes.map((route) => {
              const strokeWidth = 1 + (route.shipmentCount / maxShipments) * 4;
              const isHovered = hoveredRoute?.id === route.id;

              return (
                <Line
                  key={route.id}
                  from={route.originCoords}
                  to={route.destCoords}
                  stroke={getRouteColor(route)}
                  strokeWidth={isHovered ? strokeWidth + 2 : strokeWidth}
                  strokeLinecap="round"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredRoute(route)}
                  onMouseLeave={() => setHoveredRoute(null)}
                  onClick={() => onRouteClick?.(route)}
                />
              );
            })}

            {locations.filter(l => l.outbound > 0).map((location) => {
              const size = 5 + (location.outbound / maxVolume) * 10;
              const isSelected = selectedOrigin === location.stateCode;

              return (
                <Marker key={`origin-${location.stateCode}`} coordinates={location.coordinates}>
                  <circle
                    r={size}
                    fill={isSelected ? '#3b82f6' : '#EF4444'}
                    fillOpacity={0.8}
                    stroke="#FFF"
                    strokeWidth={isSelected ? 3 : 2}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredLocation(location)}
                    onMouseLeave={() => setHoveredLocation(null)}
                    onClick={() => {
                      setSelectedOrigin(selectedOrigin === location.stateCode ? null : location.stateCode);
                      onLocationClick?.(location);
                    }}
                  />
                  {zoom > 1.5 && (
                    <text textAnchor="middle" y={-size - 4} fontSize={10} fontWeight="600" fill="#374151">
                      {location.stateCode}
                    </text>
                  )}
                </Marker>
              );
            })}

            {locations.filter(l => l.inbound > 0 && l.outbound === 0).map((location) => {
              const size = 3 + (location.inbound / maxVolume) * 6;
              return (
                <Marker key={`dest-${location.stateCode}`} coordinates={location.coordinates}>
                  <circle
                    r={size}
                    fill="#F97316"
                    fillOpacity={0.6}
                    stroke="#FFF"
                    strokeWidth={1.5}
                    onMouseEnter={() => setHoveredLocation(location)}
                    onMouseLeave={() => setHoveredLocation(null)}
                  />
                </Marker>
              );
            })}
          </ZoomableGroup>
        </ComposableMap>

        {hoveredRoute && (
          <div className="absolute top-4 right-4 bg-white rounded-lg shadow-xl border border-slate-200 p-3 text-xs z-10 min-w-[200px]">
            <div className="font-semibold text-slate-800 mb-2 text-sm">
              {hoveredRoute.origin} - {hoveredRoute.destination}
            </div>
            <div className="space-y-1 text-slate-600">
              <div className="flex justify-between">
                <span>Shipments:</span>
                <span className="font-medium">{hoveredRoute.shipmentCount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Cost:</span>
                <span className="font-medium">${hoveredRoute.totalCost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Avg Cost:</span>
                <span className="font-medium">${(hoveredRoute.totalCost / hoveredRoute.shipmentCount).toFixed(2)}</span>
              </div>
              {hoveredRoute.avgTransitDays && (
                <div className="flex justify-between">
                  <span>Avg Transit:</span>
                  <span className="font-medium">{hoveredRoute.avgTransitDays.toFixed(1)} days</span>
                </div>
              )}
            </div>
          </div>
        )}

        {hoveredLocation && !hoveredRoute && (
          <div className="absolute top-4 left-4 bg-white rounded-lg shadow-xl border border-slate-200 p-3 text-xs z-10">
            <div className="font-semibold text-slate-800 mb-2">{hoveredLocation.stateCode}</div>
            <div className="space-y-1 text-slate-600">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span>Outbound: {hoveredLocation.outbound.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <span>Inbound: {hoveredLocation.inbound.toLocaleString()}</span>
              </div>
              <div className="pt-1 border-t border-slate-100 mt-1">
                <span className={`font-medium ${hoveredLocation.netFlow >= 0 ? 'text-blue-600' : 'text-slate-600'}`}>
                  Net: {hoveredLocation.netFlow >= 0 ? '+' : ''}{hoveredLocation.netFlow.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="mt-2 text-slate-400 text-xs">Click to filter routes</div>
          </div>
        )}

        <div className="absolute bottom-4 right-4 flex flex-col gap-1 z-10">
          <button onClick={() => setZoom(z => Math.min(z * 1.5, 4))} className="w-8 h-8 bg-white shadow-lg rounded flex items-center justify-center hover:bg-slate-50 border border-slate-200">
            <Plus className="w-4 h-4 text-slate-700" />
          </button>
          <button onClick={() => setZoom(z => Math.max(z / 1.5, 0.8))} className="w-8 h-8 bg-white shadow-lg rounded flex items-center justify-center hover:bg-slate-50 border border-slate-200">
            <Minus className="w-4 h-4 text-slate-700" />
          </button>
          <button onClick={() => { setZoom(1); setCenter([-96, 38]); }} className="w-8 h-8 bg-white shadow-lg rounded flex items-center justify-center hover:bg-slate-50 border border-slate-200">
            <RotateCcw className="w-4 h-4 text-slate-700" />
          </button>
        </div>
      </div>

      <div className="flex-shrink-0 px-4 py-2 border-t border-slate-200 bg-white">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-slate-600">Origin</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-slate-600">Destination</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-8 h-1 bg-orange-500 rounded" />
              <span className="text-slate-600">Flow (width = volume)</span>
            </div>
          </div>
          <div className="text-slate-400">Click origin to filter - Hover for details</div>
        </div>
      </div>
    </div>
  );
}

export default ArcFlowMap;
