import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import { createResourceIcon } from './markerIcons';
import { Truck, Radio, Navigation, AlertCircle } from 'lucide-react';

export default function ResourceMarker({ resource }) {
  if (!resource?.lat || !resource?.lng) return null;

  const icon = createResourceIcon(resource);
  const isFailed = resource.status === 'FAILED';
  const isDispatched = resource.status === 'DISPATCHED';

  return (
    <Marker
      position={[resource.lat, resource.lng]}
      icon={icon}
    >
      <Popup minWidth={220}>
        <div className="p-3 font-sans text-c2-text">
          <div className="flex items-center justify-between mb-1.5 border-b border-c2-border pb-1.5">
            <div className="flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-c2-accent" />
              <span className="font-mono text-xs font-bold">{resource.id}</span>
            </div>
            <span
              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase ${
                isFailed
                  ? 'bg-c2-critical-bg text-c2-critical-text border-c2-critical-border animate-pulse'
                  : isDispatched
                  ? 'bg-c2-accent-bg text-c2-accent-text border-c2-accent-border'
                  : 'bg-c2-low-bg text-c2-low-text border-c2-low-border'
              }`}
            >
              {resource.status}
            </span>
          </div>

          <h4 className="font-bold text-xs text-c2-text mb-1">
            {resource.name}
          </h4>

          <div className="space-y-1 text-[11px] text-c2-text-muted mb-2">
            <div className="flex items-center justify-between">
              <span>Station:</span>
              <span className="font-medium text-c2-text">{resource.baseStation || 'Central EOC'}</span>
            </div>
            {resource.speedKmH > 0 && (
              <div className="flex items-center justify-between font-mono">
                <span>Speed:</span>
                <span className="text-c2-accent font-semibold">{resource.speedKmH} km/h</span>
              </div>
            )}
            {resource.workload && (
              <div className="flex items-center justify-between text-[10px]">
                <span>Status:</span>
                <span className="font-medium text-c2-text">{resource.workload}</span>
              </div>
            )}
          </div>

          {resource.capabilities && (
            <div className="flex flex-wrap gap-1 border-t border-c2-border pt-1.5">
              {resource.capabilities.slice(0, 2).map((cap, idx) => (
                <span key={idx} className="text-[9px] bg-c2-surface px-1.5 py-0.5 rounded text-c2-text-muted font-mono">
                  {cap}
                </span>
              ))}
            </div>
          )}
        </div>
      </Popup>
    </Marker>
  );
}
