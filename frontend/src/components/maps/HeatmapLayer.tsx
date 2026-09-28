'use client';

import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';

export interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
  dominantDisease: string;
  pincode: string;
}

interface HeatmapLayerProps {
  points: HeatmapPoint[];
}

const DISEASE_COLORS: Record<string, string> = {
  Infectious: '#EF4444',
  Respiratory: '#3B82F6',
  'Vector-borne': '#EAB308',
  Waterborne: '#06B6D4',
  Chronic: '#8B5CF6',
};

function getDiseaseColor(disease: string): string {
  return DISEASE_COLORS[disease] ?? '#6B7280';
}

function getRadius(intensity: number): number {
  // Scale radius between 6 and 28 based on intensity
  const clamped = Math.min(Math.max(intensity, 1), 100);
  return 6 + (clamped / 100) * 22;
}

export default function HeatmapLayer({ points }: HeatmapLayerProps) {
  return (
    <MapContainer
      center={[20.5937, 78.9629]}
      zoom={5}
      style={{ height: '100%', width: '100%', borderRadius: '0.75rem' }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.map((point, idx) => (
        <CircleMarker
          key={`${point.pincode}-${idx}`}
          center={[point.lat, point.lng]}
          radius={getRadius(point.intensity)}
          pathOptions={{
            fillColor: getDiseaseColor(point.dominantDisease),
            color: getDiseaseColor(point.dominantDisease),
            fillOpacity: 0.65,
            weight: 1.5,
          }}
        >
          <Tooltip sticky>
            <div className="text-xs space-y-0.5">
              <p className="font-semibold text-gray-800">{point.dominantDisease}</p>
              <p className="text-gray-600">Count: <span className="font-medium">{point.intensity}</span></p>
              <p className="text-gray-600">Pincode: <span className="font-medium">{point.pincode}</span></p>
            </div>
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
