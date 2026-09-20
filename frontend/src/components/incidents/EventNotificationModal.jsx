import React from 'react';
import { 
  Waves, 
  Flame, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Activity, 
  ShieldAlert, 
  Radio, 
  Zap, 
  Info 
} from 'lucide-react';

export default function EventNotificationModal({ isOpen, onClose, eventData }) {
  if (!isOpen || !eventData) return null;

  const { type, title, subtitle, incidentId, details, metrics, actionLabel } = eventData;

  const isFlood = type === 'FLOOD';
  const isEscalate = type === 'ESCALATE';
  const isFailure = type === 'FAILURE';

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-lg bg-c2-card border border-c2-border rounded-xl shadow-2xl overflow-hidden font-sans border-t-4 border-t-c2-accent animate-scaleUp">
        {/* Top Accent Header Bar */}
        <div className={`p-4 border-b border-c2-border flex items-center justify-between ${
          isEscalate || isFailure ? 'bg-c2-critical-bg/80 text-c2-critical-text' : 'bg-c2-accent-bg/80 text-c2-accent-text'
        }`}>
          <div className="flex items-center gap-2.5">
            {isFlood && <Waves className="w-5 h-5 text-c2-accent animate-pulse" />}
            {isEscalate && <Flame className="w-5 h-5 text-c2-critical animate-bounce" />}
            {isFailure && <AlertTriangle className="w-5 h-5 text-c2-critical animate-pulse" />}
            <div>
              <span className="font-mono text-xs font-bold uppercase tracking-wider block">
                {isFlood ? '🌊 TELEMETRY INGESTION EVENT' : isEscalate ? '🔥 SEVERITY ESCALATION ALERT' : '🚨 UNIT MECHANICAL BREAKDOWN'}
              </span>
              <h2 className="text-sm font-bold leading-tight font-mono">{title}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-black/10 transition text-c2-text-muted hover:text-c2-text"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 bg-c2-card">
          {/* Subtitle / Context Header */}
          <div className="p-3 rounded-lg bg-c2-paper border border-c2-border space-y-1">
            <div className="flex items-center justify-between text-xs font-mono text-c2-text-muted">
              <span>TARGET INCIDENT: <strong className="text-c2-accent">#{incidentId || 'INC-102'}</strong></span>
              <span className="px-2 py-0.5 rounded bg-c2-surface text-c2-text border border-c2-border text-[10px] font-semibold">
                SYSTEM BROADCAST
              </span>
            </div>
            <p className="text-xs text-c2-text leading-relaxed font-sans font-medium">
              {subtitle}
            </p>
          </div>

          {/* Key Impact & Telemetry Details */}
          <div className="space-y-2 font-mono">
            <span className="text-[11px] font-bold uppercase tracking-wider text-c2-text-muted flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-c2-accent" />
              EVENT IMPACT BREAKDOWN
            </span>

            <div className="space-y-1.5 text-xs">
              {details && details.map((item, idx) => (
                <div key={idx} className="p-2.5 rounded bg-c2-paper border border-c2-border flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-c2-accent mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <span className="font-bold text-c2-text block text-[11px] uppercase tracking-wide">{item.label}</span>
                    <span className="text-c2-text-muted text-[11px] font-sans leading-normal">{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Operational Metrics Grid */}
          {metrics && (
            <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
              {metrics.map((m, i) => (
                <div key={i} className="p-2.5 rounded bg-c2-paper border border-c2-border text-center">
                  <span className="text-[10px] text-c2-text-muted uppercase block">{m.label}</span>
                  <span className="text-sm font-extrabold text-c2-text block mt-0.5">{m.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="p-4 bg-c2-paper border-t border-c2-border flex items-center justify-end gap-3 font-mono">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-c2-accent hover:bg-blue-700 text-c2-card rounded-lg font-bold text-xs flex items-center gap-2 shadow-md transition"
          >
            <CheckCircle2 className="w-4 h-4" />
            {actionLabel || 'ACKNOWLEDGE & CLOSE'}
          </button>
        </div>
      </div>
    </div>
  );
}
