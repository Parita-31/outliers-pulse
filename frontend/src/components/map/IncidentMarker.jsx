import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import { createIncidentIcon } from './markerIcons';
import SeverityBadge from '../common/SeverityBadge';
import PriorityBadge from '../common/PriorityBadge';
import { MapPin, Users, AlertTriangle } from 'lucide-react';

function formatDisplayId(id) {
  if (!id) return '';
  if (typeof id === 'string' && id.length > 12) {
    const clean = id.replace(/-/g, '').toUpperCase();
    return `INC-${clean.slice(-4)}`;
  }
  return id;
}

export default function IncidentMarker({ incident, isSelected, onSelect }) {
  if (!incident?.location?.lat || !incident?.location?.lng) return null;

  const icon = createIncidentIcon(incident, isSelected);

  return (
    <Marker
      position={[incident.location.lat, incident.location.lng]}
      icon={icon}
      eventHandlers={{
        click: () => onSelect && onSelect(incident.id),
      }}
    >
      <Popup className="c2-tactical-popup" minWidth={240}>
        <div className="p-3 font-sans text-c2-text">
          <div className="flex items-center justify-between mb-1.5 border-b border-c2-border pb-1.5">
            <div className="flex items-center gap-1.5">
              <PriorityBadge priority={incident.priority} />
              <span className="font-mono text-xs font-bold">#{formatDisplayId(incident.id)}</span>
            </div>
            <SeverityBadge severity={incident.severity} size="sm" />
          </div>

          <h4 className="font-bold text-xs text-c2-text mb-1">
            {incident.title}
          </h4>
          <p className="text-[11px] text-c2-text-muted mb-2 line-clamp-2">
            {incident.description}
          </p>

          <div className="flex items-center justify-between text-[10px] font-mono text-c2-text-muted bg-c2-surface p-1.5 rounded mb-2">
            <span className="flex items-center gap-1 font-medium text-c2-critical-text">
              <Users className="w-3 h-3" />
              {incident.peopleAtRisk} Trapped / At Risk
            </span>
            <span>{incident.location?.sector}</span>
          </div>

          <button
            onClick={() => onSelect && onSelect(incident.id)}
            className="w-full py-1 bg-c2-accent hover:bg-blue-700 text-c2-card text-[11px] font-mono font-bold rounded transition text-center shadow-sm"
          >
            SELECT INCIDENT C2
          </button>
        </div>
      </Popup>
    </Marker>
  );
}
