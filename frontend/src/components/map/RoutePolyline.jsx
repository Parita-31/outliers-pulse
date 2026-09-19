import React from 'react';
import { Polyline, Tooltip } from 'react-leaflet';

export default function RoutePolyline({ 
  fromResource, 
  toIncident, 
  color = '#2563eb',
  label = 'EN ROUTE'
}) {
  if (!fromResource?.lat || !fromResource?.lng || !toIncident?.location?.lat || !toIncident?.location?.lng) {
    return null;
  }

  const positions = [
    [fromResource.lat, fromResource.lng],
    [toIncident.location.lat, toIncident.location.lng]
  ];

  return (
    <Polyline
      positions={positions}
      pathOptions={{
        color: color,
        weight: 3.5,
        opacity: 0.85,
        className: 'tactical-route-active',
      }}
    >
      <Tooltip sticky className="c2-route-tooltip">
        <div className="font-mono text-[10px] text-c2-text font-bold">
          {label}: {fromResource.id} ➔ #{toIncident.id}
        </div>
      </Tooltip>
    </Polyline>
  );
}
