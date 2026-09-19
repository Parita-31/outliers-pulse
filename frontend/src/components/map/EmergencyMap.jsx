import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import IncidentMarker from './IncidentMarker';
import ResourceMarker from './ResourceMarker';
import RoutePolyline from './RoutePolyline';
import MapControls from './MapControls';
import { useIncidents } from '../../hooks/useIncidents';
import { useResources } from '../../hooks/useResources';
import L from 'leaflet';

const MAP_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const MAP_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// Helper component to smoothly center on selected incident
function MapAutoCenter({ selectedIncident }) {
  const map = useMap();

  useEffect(() => {
    if (selectedIncident?.location?.lat && selectedIncident?.location?.lng) {
      map.flyTo([selectedIncident.location.lat, selectedIncident.location.lng], 15, {
        duration: 0.8
      });
    }
  }, [selectedIncident, map]);

  return null;
}

export default function EmergencyMap() {
  const { incidents, selectedIncident, selectIncident } = useIncidents();
  const { resources, compromisedPlans } = useResources();

  const [showIncidents, setShowIncidents] = useState(true);
  const [showResources, setShowResources] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);

  // Active Dispatches (for Route Polyline rendering)
  const fireUnit = resources.find((r) => r.id === 'FIRE-03');
  const hazmatIncident = incidents.find((i) => i.id === 'INC-105');

  const amb07 = resources.find((r) => r.id === 'AMB-07');
  const amb12 = resources.find((r) => r.id === 'AMB-12');
  const floodIncident = incidents.find((i) => i.id === 'INC-102');

  const isAmb07Failed = amb07?.status === 'FAILED';
  const isAmb12Dispatched = amb12?.status === 'DISPATCHED';

  // Nadiad Central EOC Default Coordinates
  const defaultCenter = [22.6930, 72.8640];

  return (
    <div className="relative w-full h-full bg-c2-paper overflow-hidden">
      <MapContainer
        center={defaultCenter}
        zoom={14}
        scrollWheelZoom={true}
        zoomControl={false}
        className="w-full h-full"
      >
        <TileLayer
          url={MAP_TILE_URL}
          attribution={MAP_ATTRIBUTION}
          maxZoom={19}
        />

        {/* Auto Panning to Selected Incident */}
        <MapAutoCenter selectedIncident={selectedIncident} />

        {/* Incident Markers */}
        {showIncidents &&
          incidents.map((inc) => (
            <IncidentMarker
              key={inc.id}
              incident={inc}
              isSelected={selectedIncident?.id === inc.id}
              onSelect={selectIncident}
            />
          ))}

        {/* Resource / Unit Markers */}
        {showResources &&
          resources.map((res) => (
            <ResourceMarker key={res.id} resource={res} />
          ))}

        {/* Dynamic Route Polylines */}
        {showRoutes && (
          <>
            {/* Fire 03 Route to Hazmat */}
            {fireUnit && hazmatIncident && (
              <RoutePolyline
                fromResource={fireUnit}
                toIncident={hazmatIncident}
                color="#ea580c"
                label="DISPATCHED"
              />
            )}

            {/* Ambulance Active Route */}
            {!isAmb07Failed && amb07?.status === 'DISPATCHED' && floodIncident && (
              <RoutePolyline
                fromResource={amb07}
                toIncident={floodIncident}
                color="#2563eb"
                label="EN ROUTE (ETA: 6m)"
              />
            )}

            {/* Recovery Route for AMB-12 */}
            {isAmb12Dispatched && floodIncident && (
              <RoutePolyline
                fromResource={amb12}
                toIncident={floodIncident}
                color="#dc2626"
                label="REASSIGNED RECOVERY (ETA: 9m)"
              />
            )}
          </>
        )}

        {/* Tactical Map Controls */}
        <MapControls
          selectedIncident={selectedIncident}
          incidents={incidents}
          resources={resources}
          showIncidents={showIncidents}
          setShowIncidents={setShowIncidents}
          showResources={showResources}
          setShowResources={setShowResources}
          showRoutes={showRoutes}
          setShowRoutes={setShowRoutes}
        />
      </MapContainer>
    </div>
  );
}
