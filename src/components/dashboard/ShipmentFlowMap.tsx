import { useState, useMemo, useEffect } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  Line,
  ZoomableGroup,
} from 'react-simple-maps';
import { Loader2, Plus, Minus, RotateCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface LocationData {
  state: string;
  stateCode: string;
  coordinates: [number, number];
  outbound: number;
  inbound: number;
}

interface RouteData {
  origin: string;
  destination: string;
  originCoords: [number, number];
  destCoords: [number, number];
  shipmentCount: number;
  totalCost: number;
}

interface ShipmentFlowMapProps {
  effectiveCustomerIds: number[];
  isAdmin: boolean;
  isViewingAsCustomer: boolean;
  startDate: string;
  endDate: string;
}

const STATE_COORDINATES: { [key: string]: [number, number] } = {
  AL: [-86.9023, 32.8067],
  AK: [-152.4044, 61.3707],
  AZ: [-111.4312, 33.7298],
  AR: [-92.3731, 34.9697],
  CA: [-119.4179, 36.7783],
  CO: [-105.7821, 39.5501],
  CT: [-72.7554, 41.5978],
  DE: [-75.5071, 39.3498],
  FL: [-81.5158, 27.7663],
  GA: [-83.6431, 32.9866],
  HI: [-157.4983, 21.0943],
  ID: [-114.4788, 44.2405],
  IL: [-89.3985, 40.3495],
  IN: [-86.2604, 39.8494],
  IA: [-93.0977, 42.0115],
  KS: [-96.7265, 38.5266],
  KY: [-84.6701, 37.6681],
  LA: [-91.8749, 31.1695],
  ME: [-69.3819, 44.6939],
  MD: [-76.6413, 39.0639],
  MA: [-71.5301, 42.2302],
  MI: [-84.5361, 43.3266],
  MN: [-93.9196, 45.6945],
  MS: [-89.6785, 32.7416],
  MO: [-92.2896, 38.4561],
  MT: [-110.4544, 46.9219],
  NE: [-98.2680, 41.1254],
  NV: [-117.0554, 38.3135],
  NH: [-71.5639, 43.4525],
  NJ: [-74.5210, 40.2989],
  NM: [-106.2371, 34.8405],
  NY: [-74.9180, 42.1657],
  NC: [-79.8064, 35.6301],
  ND: [-99.7840, 47.5289],
  OH: [-82.7649, 40.3888],
  OK: [-96.9289, 35.5653],
  OR: [-122.0709, 44.5720],
  PA: [-77.1945, 40.5908],
  RI: [-71.5117, 41.6809],
  SC: [-80.9450, 33.8569],
  SD: [-99.4388, 44.2998],
  TN: [-86.6923, 35.7478],
  TX: [-97.5631, 31.0545],
  UT: [-111.8910, 40.1500],
  VT: [-72.7107, 44.0459],
  VA: [-78.1690, 37.7693],
  WA: [-121.4906, 47.4009],
  WV: [-80.9545, 38.4912],
  WI: [-89.6165, 44.2685],
  WY: [-107.3025, 42.7559],
};

const geoUrl = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

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
  const [center, setCenter] = useState<[number, number]>([-96, 38]);

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

          if (origin?.state && destination?.state && STATE_COORDINATES[origin.state] && STATE_COORDINATES[destination.state]) {
            locationCounts[origin.state] = locationCounts[origin.state] || { outbound: 0, inbound: 0 };
            locationCounts[destination.state] = locationCounts[destination.state] || { outbound: 0, inbound: 0 };

            locationCounts[origin.state].outbound++;
            locationCounts[destination.state].inbound++;

            const routeKey = `${origin.state}-${destination.state}`;
            routeCounts[routeKey] = routeCounts[routeKey] || { count: 0, cost: 0 };
            routeCounts[routeKey].count++;
            routeCounts[routeKey].cost += shipment.cost || 0;
          }
        });

        const locationData: LocationData[] = Object.entries(locationCounts).map(([stateCode, counts]) => ({
          state: stateCode,
          stateCode,
          coordinates: STATE_COORDINATES[stateCode],
          outbound: counts.outbound,
          inbound: counts.inbound,
        }));

        const routeData: RouteData[] = Object.entries(routeCounts).map(([routeKey, data]) => {
          const [origin, destination] = routeKey.split('-');
          return {
            origin,
            destination,
            originCoords: STATE_COORDINATES[origin],
            destCoords: STATE_COORDINATES[destination],
            shipmentCount: data.count,
            totalCost: data.cost,
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
    return routes.filter(r => r.shipmentCount >= minShipments);
  }, [routes, minShipments]);

  const maxShipments = Math.max(...filteredRoutes.map(r => r.shipmentCount), 1);
  const maxVolume = Math.max(
    ...locations.map(l => Math.max(l.outbound, l.inbound)),
    1
  );

  const totalOrigins = locations.filter(l => l.outbound > 0).length;
  const totalRoutes = filteredRoutes.length;
  const totalShipments = filteredRoutes.reduce((sum, r) => sum + r.shipmentCount, 0);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-slate-50">
      <div className="flex-shrink-0 px-4 py-2 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <span className="font-medium">{totalOrigins} Origins</span>
            <span className="text-slate-300">|</span>
            <span className="font-medium">{totalRoutes} Routes</span>
            <span className="text-slate-300">|</span>
            <span className="font-medium">{totalShipments} Shipments</span>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <span>Min:</span>
            <input
              type="range"
              min="1"
              max="20"
              value={minShipments}
              onChange={(e) => setMinShipments(Number(e.target.value))}
              className="w-16"
            />
            <span className="font-semibold w-6">{minShipments}</span>
          </label>
        </div>
      </div>

      <div className="flex-1 relative min-h-0">
        <ComposableMap
          projection="geoAlbersUsa"
          projectionConfig={{
            scale: 1000,
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

            {filteredRoutes.map((route, index) => {
              const opacity = 0.3 + (route.shipmentCount / maxShipments) * 0.7;
              const strokeWidth = 1 + (route.shipmentCount / maxShipments) * 3;

              return (
                <Line
                  key={index}
                  from={route.originCoords}
                  to={route.destCoords}
                  stroke={`rgba(234, 88, 12, ${opacity})`}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredRoute(route)}
                  onMouseLeave={() => setHoveredRoute(null)}
                />
              );
            })}

            {locations.map((location, index) => {
              const size = 4 + (location.outbound / maxVolume) * 8;

              return (
                <Marker
                  key={index}
                  coordinates={location.coordinates}
                  onMouseEnter={() => setHoveredLocation(location)}
                  onMouseLeave={() => setHoveredLocation(null)}
                >
                  <circle
                    r={size}
                    fill="#EF4444"
                    fillOpacity={0.8}
                    stroke="#FFF"
                    strokeWidth={1.5}
                    style={{ cursor: 'pointer' }}
                  />
                </Marker>
              );
            })}

            {locations.map((location, index) => {
              const size = 4 + (location.inbound / maxVolume) * 8;

              return (
                <Marker
                  key={`dest-${index}`}
                  coordinates={location.coordinates}
                >
                  <circle
                    r={size}
                    fill="#EA580C"
                    fillOpacity={0.6}
                    stroke="#FFF"
                    strokeWidth={1.5}
                    style={{ pointerEvents: 'none' }}
                  />
                </Marker>
              );
            })}
          </ZoomableGroup>
        </ComposableMap>

        {hoveredRoute && (
          <div className="absolute top-4 right-4 bg-white rounded-lg shadow-xl border border-slate-200 p-3 text-xs z-10">
            <div className="font-semibold text-slate-800 mb-1">
              {hoveredRoute.origin} → {hoveredRoute.destination}
            </div>
            <div className="space-y-0.5 text-slate-600">
              <div>Shipments: {hoveredRoute.shipmentCount}</div>
              <div>Total: ${hoveredRoute.totalCost.toLocaleString()}</div>
              <div>Avg: ${(hoveredRoute.totalCost / hoveredRoute.shipmentCount).toLocaleString()}</div>
            </div>
          </div>
        )}

        {hoveredLocation && (
          <div className="absolute top-4 left-4 bg-white rounded-lg shadow-xl border border-slate-200 p-3 text-xs z-10">
            <div className="font-semibold text-slate-800 mb-1">{hoveredLocation.state}</div>
            <div className="space-y-0.5 text-slate-600">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span>Out: {hoveredLocation.outbound}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-rocket-600"></div>
                <span>In: {hoveredLocation.inbound}</span>
              </div>
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
    </div>
  );
}
