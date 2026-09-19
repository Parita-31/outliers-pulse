import React from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { Layers, Crosshair, RefreshCw, Maximize2 } from 'lucide-react';

export default function MapControls({
  selectedIncident,
  incidents = [],
  resources = [],
  showIncidents,
  setShowIncidents,
  showResources,
  setShowResources,
  showRoutes,
  setShowRoutes
}) {
  const map = useMap();

  const handleCenterSelected = () => {
    if (selectedIncident?.location?.lat && selectedIncident?.location?.lng) {
      map.flyTo([selectedIncident.location.lat, selectedIncident.location.lng], 15.5, {
        duration: 0.8
      });
    }
  };

  const handleFitAll = () => {
    const points = [];
    incidents.forEach((inc) => {
      if (inc.location?.lat && inc.location?.lng) {
        points.push([inc.location.lat, inc.location.lng]);
      }
    });
    resources.forEach((res) => {
      if (res.lat && res.lng) {
        points.push([res.lat, res.lng]);
      }
    });

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], duration: 0.8 });
    }
  };

  const handleResetSector = () => {
    map.flyTo([22.6930, 72.8640], 14, { duration: 0.8 });
  };

  return (
    <div className="absolute top-3 right-3 z-[400] flex flex-col gap-2 font-mono text-xs select-none">
      {/* Quick Centering Controls */}
      <div className="flex items-center gap-1.5 bg-c2-card/95 backdrop-blur border border-c2-border p-1 rounded-md shadow-md">
        <button
          onClick={handleCenterSelected}
          className="p-1.5 hover:bg-c2-surface rounded text-c2-text hover:text-c2-accent transition flex items-center gap-1"
          title="Center on Selected Incident"
        >
          <Crosshair className="w-4 h-4 text-c2-accent" />
          <span className="text-[11px] font-semibold hidden md:inline">Focus #{selectedIncident?.id || 'INC'}</span>
        </button>

        <button
          onClick={handleFitAll}
          className="p-1.5 hover:bg-c2-surface rounded text-c2-text-muted hover:text-c2-text transition flex items-center gap-1"
          title="Fit All Markers in View"
        >
          <Maximize2 className="w-3.5 h-3.5 text-c2-ai" />
          <span className="text-[11px] font-semibold hidden md:inline">Fit All</span>
        </button>

        <button
          onClick={handleResetSector}
          className="p-1.5 hover:bg-c2-surface rounded text-c2-text-muted hover:text-c2-text transition"
          title="Reset Nadiad Sector View"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Layer Visibility Toggles */}
      <div className="bg-c2-card/95 backdrop-blur border border-c2-border p-2 rounded-md shadow-md space-y-1.5 text-[11px]">
        <div className="text-[9px] uppercase font-bold text-c2-text-muted tracking-wider border-b border-c2-border pb-1">
          Tactical Layers
        </div>

        <label className="flex items-center justify-between gap-3 cursor-pointer hover:text-c2-text">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-c2-critical"></span>
            Incidents
          </span>
          <input
            type="checkbox"
            checked={showIncidents}
            onChange={(e) => setShowIncidents(e.target.checked)}
            className="rounded border-c2-border text-c2-accent focus:ring-0"
          />
        </label>

        <label className="flex items-center justify-between gap-3 cursor-pointer hover:text-c2-text">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-c2-accent"></span>
            Fleet Units
          </span>
          <input
            type="checkbox"
            checked={showResources}
            onChange={(e) => setShowResources(e.target.checked)}
            className="rounded border-c2-border text-c2-accent focus:ring-0"
          />
        </label>

        <label className="flex items-center justify-between gap-3 cursor-pointer hover:text-c2-text">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            Active Routes
          </span>
          <input
            type="checkbox"
            checked={showRoutes}
            onChange={(e) => setShowRoutes(e.target.checked)}
            className="rounded border-c2-border text-c2-accent focus:ring-0"
          />
        </label>
      </div>
    </div>
  );
}
