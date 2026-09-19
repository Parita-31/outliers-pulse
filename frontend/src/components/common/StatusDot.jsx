import React from 'react';

export default function StatusDot({ status = 'online', size = 'md' }) {
  const sizeClass = size === 'sm' ? 'w-2 h-2' : size === 'lg' ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5';
  
  let color = 'bg-c2-low';
  let ring = 'ring-c2-low/30';
  let pulse = true;

  if (status === 'critical' || status === 'compromised') {
    color = 'bg-c2-critical';
    ring = 'ring-c2-critical/40';
  } else if (status === 'warning' || status === 'elevated') {
    color = 'bg-c2-medium';
    ring = 'ring-c2-medium/30';
  } else if (status === 'offline') {
    color = 'bg-c2-text-muted';
    ring = 'ring-c2-text-muted/20';
    pulse = false;
  }

  return (
    <span className="relative flex items-center justify-center">
      {pulse && <span className={`absolute inline-flex h-full w-full rounded-full ${color} opacity-75 animate-ping`} />}
      <span className={`relative inline-flex rounded-full ${sizeClass} ${color} ring-4 ${ring}`} />
    </span>
  );
}
