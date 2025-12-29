# PHASE 3: ADVANCED MAP TYPES - Bolt Prompt

Copy everything below into Bolt:

---

I want to add 2 new advanced map components for logistics analysis. These are NEW components (not replacements):

1. **ClusterMap** - K-means clustering to identify demand hotspots and recommend DC locations
2. **ArcFlowMap** - Enhanced flow visualization with curved arc paths and better interactivity

---

## FILE: src/components/dashboard/maps/ClusterMap.tsx

```tsx
import { useState, useMemo } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from 'react-simple-maps';
import { Loader2, Plus, Minus, RotateCcw, Target } from 'lucide-react';

const geoUrl = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

export interface ClusterPoint {
  id: string;
  coordinates: [number, number];
  weight: number;
  stateCode?: string;
  city?: string;
}

export interface ClusterCenter {
  id: string;
  coordinates: [number, number];
  pointCount: number;
  totalWeight: number;
  radius: number;
  points: ClusterPoint[];
}

interface ClusterMapProps {
  points: ClusterPoint[];
  clusters?: ClusterCenter[];
  isLoading?: boolean;
  title?: string;
  showCoverageCircles?: boolean;
  onClusterClick?: (cluster: ClusterCenter) => void;
  onPointClick?: (point: ClusterPoint) => void;
  recommendedLocations?: { coordinates: [number, number]; label: string; score: number }[];
  className?: string;
}

function kMeansClustering(points: ClusterPoint[], k: number, iterations: number = 10): ClusterCenter[] {
  if (points.length === 0 || k <= 0) return [];
  
  const shuffled = [...points].sort(() => Math.random() - 0.5);
  let centroids = shuffled.slice(0, Math.min(k, points.length)).map(p => [...p.coordinates] as [number, number]);
  
  for (let iter = 0; iter < iterations; iter++) {
    const assignments: number[] = points.map(point => {
      let minDist = Infinity;
      let closest = 0;
      centroids.forEach((centroid, i) => {
        const dist = Math.sqrt(
          Math.pow(point.coordinates[0] - centroid[0], 2) +
          Math.pow(point.coordinates[1] - centroid[1], 2)
        );
        if (dist < minDist) {
          minDist = dist;
          closest = i;
        }
      });
      return closest;
    });
    
    centroids = centroids.map((_, i) => {
      const clusterPoints = points.filter((_, j) => assignments[j] === i);
      if (clusterPoints.length === 0) return centroids[i];
      const sumLon = clusterPoints.reduce((sum, p) => sum + p.coordinates[0], 0);
      const sumLat = clusterPoints.reduce((sum, p) => sum + p.coordinates[1], 0);
      return [sumLon / clusterPoints.length, sumLat / clusterPoints.length] as [number, number];
    });
  }
  
  const finalAssignments = points.map(point => {
    let minDist = Infinity;
    let closest = 0;
    centroids.forEach((centroid, i) => {
      const dist = Math.sqrt(
        Math.pow(point.coordinates[0] - centroid[0], 2) +
        Math.pow(point.coordinates[1] - centroid[1], 2)
      );
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    });
    return closest;
  });
  
  return centroids.map((coords, i) => {
    const clusterPoints = points.filter((_, j) => finalAssignments[j] === i);
    const totalWeight = clusterPoints.reduce((sum, p) => sum + p.weight, 0);
    const maxDist = Math.max(
      ...clusterPoints.map(p => 
        Math.sqrt(Math.pow(p.coordinates[0] - coords[0], 2) + Math.pow(p.coordinates[1] - coords[1], 2))
      ),
      0.5
    );
    return {
      id: `cluster-${i}`,
      coordinates: coords,
      pointCount: clusterPoints.length,
      totalWeight,
      radius: maxDist * 69,
      points: clusterPoints,
    };
  }).filter(c => c.pointCount > 0);
}

export function ClusterMap({
  points,
  clusters: providedClusters,
  isLoading = false,
  title = 'Demand Clustering Analysis',
  showCoverageCircles = true,
  onClusterClick,
  onPointClick,
  recommendedLocations = [],
  className = '',
}: ClusterMapProps) {
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<[number, number]>([-96, 38]);
  const [clusterCount, setClusterCount] = useState(5);
  const [hoveredCluster, setHoveredCluster] = useState<ClusterCenter | null>(null);
  const [showPoints, setShowPoints] = useState(true);
  
  const clusters = useMemo(() => {
    if (providedClusters) return providedClusters;
    return kMeansClustering(points, clusterCount);
  }, [points, providedClusters, clusterCount]);
  
  const totalDemand = useMemo(() => points.reduce((sum, p) => sum + p.weight, 0), [points]);
  
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
              <span>{points.length} Demand Points</span>
              <span className="text-slate-300">|</span>
              <span>{clusters.length} Clusters</span>
              <span className="text-slate-300">|</span>
              <span>{totalDemand.toLocaleString()} Total Demand</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {!providedClusters && (
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <span>Clusters:</span>
                <input
                  type="range"
                  min="2"
                  max="10"
                  value={clusterCount}
                  onChange={(e) => setClusterCount(Number(e.target.value))}
                  className="w-20"
                />
                <span className="font-semibold w-4">{clusterCount}</span>
              </label>
            )}
            
            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={showPoints}
                onChange={(e) => setShowPoints(e.target.checked)}
                className="rounded"
              />
              Show points
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
                    fill="#F1F5F9"
                    stroke="#CBD5E1"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: 'none' },
                      hover: { outline: 'none' },
                      pressed: { outline: 'none' },
                    }}
                  />
                ))
              }
            </Geographies>
            
            {showCoverageCircles && clusters.map((cluster) => {
              const isHovered = hoveredCluster?.id === cluster.id;
              const displayRadius = Math.min(cluster.radius / 10, 5) * (zoom > 1 ? 1 / zoom : 1) * 50;
              
              return (
                <Marker key={`coverage-${cluster.id}`} coordinates={cluster.coordinates}>
                  <circle
                    r={displayRadius}
                    fill={isHovered ? 'rgba(59, 130, 246, 0.15)' : 'rgba(249, 115, 22, 0.1)'}
                    stroke={isHovered ? '#3b82f6' : '#f97316'}
                    strokeWidth={1}
                    strokeDasharray="4,2"
                  />
                </Marker>
              );
            })}
            
            {showPoints && points.map((point) => {
              const size = 2 + (point.weight / Math.max(...points.map(p => p.weight))) * 3;
              return (
                <Marker key={point.id} coordinates={point.coordinates}>
                  <circle
                    r={size}
                    fill="#94a3b8"
                    fillOpacity={0.6}
                    stroke="#fff"
                    strokeWidth={0.5}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onPointClick?.(point)}
                  />
                </Marker>
              );
            })}
            
            {clusters.map((cluster) => {
              const isHovered = hoveredCluster?.id === cluster.id;
              const size = 8 + (cluster.totalWeight / Math.max(...clusters.map(c => c.totalWeight))) * 12;
              
              return (
                <Marker key={cluster.id} coordinates={cluster.coordinates}>
                  <circle
                    r={size}
                    fill={isHovered ? '#3b82f6' : '#f97316'}
                    fillOpacity={0.9}
                    stroke="#fff"
                    strokeWidth={2}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredCluster(cluster)}
                    onMouseLeave={() => setHoveredCluster(null)}
                    onClick={() => onClusterClick?.(cluster)}
                  />
                  <text
                    textAnchor="middle"
                    y={4}
                    fontSize={10}
                    fontWeight="bold"
                    fill="#fff"
                    style={{ pointerEvents: 'none' }}
                  >
                    {cluster.pointCount}
                  </text>
                </Marker>
              );
            })}
            
            {recommendedLocations.map((loc, i) => (
              <Marker key={`rec-${i}`} coordinates={loc.coordinates}>
                <g transform="translate(-12, -24)">
                  <path
                    d="M12 0C5.4 0 0 5.4 0 12c0 7.2 12 24 12 24s12-16.8 12-24c0-6.6-5.4-12-12-12z"
                    fill="#22c55e"
                    stroke="#fff"
                    strokeWidth={2}
                  />
                  <circle cx={12} cy={12} r={4} fill="#fff" />
                </g>
                <text textAnchor="middle" y={10} fontSize={9} fontWeight="600" fill="#166534">
                  {loc.label}
                </text>
              </Marker>
            ))}
          </ZoomableGroup>
        </ComposableMap>
        
        {hoveredCluster && (
          <div className="absolute top-4 right-4 bg-white rounded-lg shadow-xl border border-slate-200 p-3 text-xs z-10 min-w-[180px]">
            <div className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
              <Target className="w-4 h-4 text-orange-500" />
              Cluster Analysis
            </div>
            <div className="space-y-1 text-slate-600">
              <div className="flex justify-between">
                <span>Demand Points:</span>
                <span className="font-medium">{hoveredCluster.pointCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Demand:</span>
                <span className="font-medium">{hoveredCluster.totalWeight.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Coverage Radius:</span>
                <span className="font-medium">{hoveredCluster.radius.toFixed(0)} mi</span>
              </div>
              <div className="flex justify-between">
                <span>% of Total:</span>
                <span className="font-medium">
                  {((hoveredCluster.totalWeight / totalDemand) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        )}
        
        <div className="absolute bottom-4 right-4 flex flex-col gap-1 z-10">
          <button
            onClick={() => setZoom((z) => Math.min(z * 1.5, 4))}
            className="w-8 h-8 bg-white shadow-lg rounded flex items-center justify-center hover:bg-slate-50 border border-slate-200"
          >
            <Plus className="w-4 h-4 text-slate-700" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(z / 1.5, 0.8))}
            className="w-8 h-8 bg-white shadow-lg rounded flex items-center justify-center hover:bg-slate-50 border border-slate-200"
          >
            <Minus className="w-4 h-4 text-slate-700" />
          </button>
          <button
            onClick={() => { setZoom(1); setCenter([-96, 38]); }}
            className="w-8 h-8 bg-white shadow-lg rounded flex items-center justify-center hover:bg-slate-50 border border-slate-200"
          >
            <RotateCcw className="w-4 h-4 text-slate-700" />
          </button>
        </div>
      </div>
      
      <div className="flex-shrink-0 px-4 py-2 border-t border-slate-200 bg-white">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-slate-400" />
              <span className="text-slate-600">Demand Point</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold">3</div>
              <span className="text-slate-600">Cluster Center</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded-full border-2 border-dashed border-orange-400" />
              <span className="text-slate-600">Coverage Area</span>
            </div>
            {recommendedLocations.length > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-4 bg-green-500 rounded-t-full" />
                <span className="text-slate-600">Recommended DC</span>
              </div>
            )}
          </div>
          <div className="text-slate-400">Adjust cluster count • Click clusters for details</div>
        </div>
      </div>
    </div>
  );
}

export default ClusterMap;
```

---

## FILE: src/components/dashboard/maps/ArcFlowMap.tsx

```tsx
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
                <span className="ml-1">×</span>
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
              {hoveredRoute.origin} → {hoveredRoute.destination}
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
                <span className={`font-medium ${hoveredLocation.netFlow >= 0 ? 'text-blue-600' : 'text-purple-600'}`}>
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
          <div className="text-slate-400">Click origin to filter • Hover for details</div>
        </div>
      </div>
    </div>
  );
}

export default ArcFlowMap;
```

---

## FILE: src/components/dashboard/maps/index.ts

```typescript
export { ClusterMap } from './ClusterMap';
export { ArcFlowMap } from './ArcFlowMap';

export type { ClusterPoint, ClusterCenter } from './ClusterMap';
export type { FlowRoute, FlowLocation } from './ArcFlowMap';
```

---

That's Phase 3! Two new specialized map components for logistics analysis.

Example usage:
```tsx
import { ClusterMap, ArcFlowMap } from './components/dashboard/maps';

// Cluster Map for DC planning
<ClusterMap
  points={demandPoints}
  recommendedLocations={[
    { coordinates: [-95.3698, 29.7604], label: 'Houston DC', score: 92 },
  ]}
  onClusterClick={(cluster) => console.log('Cluster:', cluster)}
/>

// Arc Flow Map for lane analysis
<ArcFlowMap
  routes={routeData}
  locations={locationData}
  colorMode="cost"
/>
```
