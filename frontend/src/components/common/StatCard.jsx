import React from 'react';

export default function StatCard({ 
  label, 
  value, 
  subValue, 
  icon: Icon, 
  variant = 'default',
  highlight = false,
  darkHeader = false
}) {
  const darkVariantStyles = {
    default: 'border-c2-header-border bg-c2-header-surface text-c2-header-text',
    critical: 'border-c2-critical/60 bg-red-950/40 text-red-100 glow-critical',
    warning: 'border-c2-medium/50 bg-amber-950/30 text-amber-100',
    success: 'border-c2-low/50 bg-emerald-950/30 text-emerald-100',
    ai: 'border-c2-ai/50 bg-purple-950/30 text-purple-100 glow-ai',
    accent: 'border-c2-accent/50 bg-blue-950/30 text-blue-100 glow-accent',
  };

  const paperVariantStyles = {
    default: 'border-c2-border bg-c2-card text-c2-text shadow-sm',
    critical: 'border-c2-critical-border bg-c2-critical-bg text-c2-critical-text glow-critical',
    warning: 'border-c2-medium-border bg-c2-medium-bg text-c2-medium-text',
    success: 'border-c2-low-border bg-c2-low-bg text-c2-low-text',
    ai: 'border-c2-ai-border bg-c2-ai-bg text-c2-ai-text glow-ai',
    accent: 'border-c2-accent-border bg-c2-accent-bg text-c2-accent-text glow-accent',
  };

  const styles = darkHeader ? darkVariantStyles : paperVariantStyles;

  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded border ${styles[variant] || styles.default} ${highlight ? 'ring-1 ring-c2-accent' : ''}`}>
      {Icon && (
        <div className={`p-1.5 rounded ${darkHeader ? 'bg-c2-header border border-c2-header-border text-c2-header-muted' : 'bg-c2-surface border border-c2-border text-c2-text-muted'}`}>
          <Icon className="w-4 h-4" />
        </div>
      )}
      <div className="flex flex-col">
        <span className={`text-[10px] uppercase font-mono tracking-wider font-semibold ${darkHeader ? 'text-c2-header-muted' : 'text-c2-text-muted'}`}>
          {label}
        </span>
        <div className="flex items-baseline gap-1.5">
          <span className="text-base font-bold font-mono tracking-tight">{value}</span>
          {subValue && (
            <span className={`text-[11px] font-mono ${darkHeader ? 'text-c2-header-muted' : 'text-c2-text-subtle'}`}>
              {subValue}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
