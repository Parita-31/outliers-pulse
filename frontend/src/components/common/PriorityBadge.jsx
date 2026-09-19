import React from 'react';

const PRIORITY_CONFIG = {
  P1: 'bg-c2-critical-bg text-c2-critical-text border-c2-critical-border',
  P2: 'bg-c2-high-bg text-c2-high-text border-c2-high-border',
  P3: 'bg-c2-medium-bg text-c2-medium-text border-c2-medium-border',
  P4: 'bg-c2-surface text-c2-text-muted border-c2-border',
};

export default function PriorityBadge({ priority = 'P2' }) {
  const normPri = priority?.toUpperCase() || 'P2';
  const colorClass = PRIORITY_CONFIG[normPri] || PRIORITY_CONFIG.P2;

  return (
    <span className={`inline-flex items-center justify-center font-mono font-bold text-[11px] px-1.5 py-0.5 rounded border ${colorClass}`}>
      {normPri}
    </span>
  );
}
