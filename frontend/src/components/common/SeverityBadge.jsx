import React from 'react';

const SEVERITY_CONFIG = {
  CRITICAL: {
    bg: 'bg-c2-critical-bg',
    border: 'border-c2-critical-border',
    text: 'text-c2-critical-text',
    dot: 'bg-c2-critical',
    glow: 'glow-critical animate-pulse-fast',
    label: 'CRITICAL'
  },
  HIGH: {
    bg: 'bg-c2-high-bg',
    border: 'border-c2-high-border',
    text: 'text-c2-high-text',
    dot: 'bg-c2-high',
    glow: 'glow-high',
    label: 'HIGH'
  },
  MEDIUM: {
    bg: 'bg-c2-medium-bg',
    border: 'border-c2-medium-border',
    text: 'text-c2-medium-text',
    dot: 'bg-c2-medium',
    glow: '',
    label: 'MEDIUM'
  },
  LOW: {
    bg: 'bg-c2-low-bg',
    border: 'border-c2-low-border',
    text: 'text-c2-low-text',
    dot: 'bg-c2-low',
    glow: '',
    label: 'LOW'
  }
};

export default function SeverityBadge({ severity = 'MEDIUM', size = 'sm', pulse = false }) {
  const normSev = severity?.toUpperCase() || 'MEDIUM';
  const config = SEVERITY_CONFIG[normSev] || SEVERITY_CONFIG.MEDIUM;
  
  const sizeClasses = size === 'lg' 
    ? 'px-3 py-1 text-xs tracking-wider' 
    : 'px-2 py-0.5 text-[10px] tracking-wide';

  return (
    <span className={`inline-flex items-center gap-1.5 font-mono font-bold uppercase rounded border ${config.bg} ${config.border} ${config.text} ${sizeClasses} ${pulse || normSev === 'CRITICAL' ? config.glow : ''}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} ${normSev === 'CRITICAL' ? 'animate-ping' : ''}`} />
      {config.label}
    </span>
  );
}
