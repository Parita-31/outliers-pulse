import React from 'react';
import { AlertCircle, AlertTriangle, Info, CheckCircle2, X } from 'lucide-react';
import { useAlerts } from '../../hooks/useAlerts';

export default function ToastContainer() {
  const { toasts, dismissToast } = useAlerts();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-12 right-6 z-[1200] flex flex-col gap-2 max-w-sm w-full pointer-events-none font-sans select-none">
      {toasts.map((toast) => {
        const isCritical = toast.severity === 'CRITICAL';
        const isWarning = toast.severity === 'HIGH' || toast.severity === 'WARNING';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3.5 rounded-lg border shadow-xl flex items-start gap-3 backdrop-blur-md transition-all duration-300 animate-slideIn ${
              isCritical
                ? 'bg-c2-critical-bg border-c2-critical text-c2-critical-text glow-critical'
                : isWarning
                ? 'bg-c2-medium-bg border-c2-medium-border text-c2-medium-text'
                : 'bg-c2-card border-c2-border text-c2-text'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {isCritical ? (
                <AlertCircle className="w-5 h-5 text-c2-critical animate-pulse" />
              ) : isWarning ? (
                <AlertTriangle className="w-5 h-5 text-c2-medium" />
              ) : (
                <Info className="w-5 h-5 text-c2-accent" />
              )}
            </div>

            <div className="flex-1 min-w-0 font-mono">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider">
                  {toast.title}
                </span>
                <span className="text-[10px] opacity-75">{toast.timestamp}</span>
              </div>
              <p className="text-[11px] mt-0.5 leading-snug font-sans opacity-90">
                {toast.message}
              </p>
            </div>

            <button
              onClick={() => dismissToast(toast.id)}
              className="shrink-0 p-1 hover:bg-black/10 rounded transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
