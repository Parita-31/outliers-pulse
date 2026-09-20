import L from 'leaflet';

export function createIncidentIcon(incident, isSelected = false) {
  const isCritical = incident.severity === 'CRITICAL';
  const isWater = incident.type === 'WATER_RESCUE';

  let haloColor = 'rgba(234, 88, 12, 0.35)';
  let borderColor = '#ea580c';
  let bgColor = '#fff7ed';
  let iconSvg = isWater
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`;

  if (isCritical) {
    haloColor = 'rgba(220, 38, 38, 0.45)';
    borderColor = '#dc2626';
    bgColor = '#fef2f2';
  }

  const pulseClass = isCritical ? 'c2-marker-pulse' : '';
  const selectedClass = isSelected ? 'ring-4 ring-blue-500 scale-110' : '';

  const html = `
    <div class="relative flex items-center justify-center cursor-pointer transition-transform ${selectedClass}">
      <div class="absolute -inset-2 rounded-full ${pulseClass}" style="background: ${haloColor};"></div>
      <div class="relative w-8 h-8 rounded-full flex items-center justify-center shadow-lg" style="background: ${bgColor}; border: 2.5px solid ${borderColor};">
        ${iconSvg}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-incident-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -20]
  });
}

export function createResourceIcon(resource) {
  let borderColor = '#2563eb';
  let bgColor = '#ffffff';
  let badgeColor = '#2563eb';

  let iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>`;

  if (resource.type === 'FIRE_ENGINE') {
    borderColor = '#ea580c';
    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`;
  } else if (resource.type === 'RESCUE_BOAT') {
    borderColor = '#0891b2';
    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0891b2" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 18H2a10 10 0 0 1 20 0Z"/><path d="M12 2v8"/><path d="m8 6 4-4 4 4"/></svg>`;
  } else if (resource.type === 'HOSPITAL') {
    borderColor = '#16a34a';
    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6v12"/><path d="M6 12h12"/><path d="M3 21h18"/><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/></svg>`;
  }

  if (resource.status === 'FAILED') {
    borderColor = '#dc2626';
    bgColor = '#fef2f2';
    badgeColor = '#dc2626';
  } else if (resource.status === 'DISPATCHED') {
    borderColor = '#2563eb';
    badgeColor = '#2563eb';
  } else if (resource.status === 'AVAILABLE') {
    badgeColor = '#16a34a';
  }

  const isFailed = resource.status === 'FAILED';

  const html = `
    <div class="relative flex items-center justify-center cursor-pointer">
      <div class="relative w-7 h-7 rounded-md flex items-center justify-center shadow-md ${isFailed ? 'animate-bounce' : ''}" style="background: ${bgColor}; border: 2px solid ${borderColor};">
        ${iconSvg}
      </div>
      <div class="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full ring-1 ring-white" style="background: ${badgeColor};"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-resource-marker',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16]
  });
}
