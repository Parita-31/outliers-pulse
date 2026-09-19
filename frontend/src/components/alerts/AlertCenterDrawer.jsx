import React from 'react';
import { Bell, X, Check, AlertTriangle, AlertCircle, Info, ExternalLink } from 'lucide-react';
import { useAlerts } from '../../hooks/useAlerts';
import { useIncidents } from '../../hooks/useIncidents';

export default function AlertCenterDrawer() {
  const { alerts, isAlertDrawerOpen, toggleAlertDrawer, acknowledgeAlert } = useAlerts();
  const { selectIncident } = useIncidents();

  if (!isAlertDrawerOpen) return null;

  const unackAlerts = alerts.filter((a) => !a.acknowledged);
  const ackAlerts = alerts.filter((a) => a.acknowledged);

  const handleSelectIncident = (incidentId) => {
    if (incidentId) {
      selectIncident(incidentId);
      toggleAlertDrawer();
    }
  };

  return (
    <div className="fixed inset-0 z-[1100] flex justify-end bg-slate-950/40 backdrop-blur-xs select-none">
      <div className="w-full max-w-md bg-c2-card h-full border-l border-c2-border shadow-2xl flex flex-col font-sans animate-slideLeft">
        {/* Drawer Header */}
        <div className="p-4 bg-c2-surface border-b border-c2-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-c2-accent" />
            <h3 className="font-mono text-xs font-bold uppercase text-c2-text tracking-wider">
              TACTICAL ALERT CENTER ({unackAlerts.length})
            </h3>
          </div>
          <button
            onClick={toggleAlertDrawer}
            className="p-1 rounded hover:bg-c2-card text-c2-text-muted hover:text-c2-text transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Alerts List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-c2-paper">
          {unackAlerts.length === 0 && ackAlerts.length === 0 ? (
            <div className="py-12 text-center font-mono text-xs text-c2-text-muted">
              All tactical alerts acknowledged. Operational baseline nominal.
            </div>
          ) : (
            <>
              {unackAlerts.map((alert) => {
                const isCrit = alert.severity === 'CRITICAL';
                return (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border shadow-sm space-y-2 transition ${
                      isCrit
                        ? 'bg-c2-critical-bg border-c2-critical text-c2-critical-text glow-critical'
                        : 'bg-c2-card border-c2-medium-border text-c2-text'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="font-bold flex items-center gap-1">
                        {isCrit ? <AlertCircle className="w-3.5 h-3.5 text-c2-critical" /> : <AlertTriangle className="w-3.5 h-3.5 text-c2-medium" />}
                        {alert.severity} ALERT
                      </span>
                      <span className="text-c2-text-muted">{alert.timestamp}</span>
                    </div>

                    <h4 className="font-bold text-xs">{alert.title}</h4>
                    <p className="text-[11px] text-c2-text-muted leading-relaxed font-sans">{alert.message}</p>

                    <div className="flex items-center justify-between pt-2 border-t border-c2-border text-[11px] font-mono">
                      {alert.incidentId ? (
                        <button
                          onClick={() => handleSelectIncident(alert.incidentId)}
                          className="text-c2-accent hover:underline flex items-center gap-1 font-semibold"
                        >
                          Focus #{alert.incidentId} <ExternalLink className="w-3 h-3" />
                        </button>
                      ) : <span />}

                      <button
                        onClick={() => acknowledgeAlert(alert.id)}
                        className="px-2.5 py-1 bg-c2-card border border-c2-border hover:bg-c2-surface text-c2-text rounded text-[10px] font-bold flex items-center gap-1 transition shadow-xs"
                      >
                        <Check className="w-3 h-3 text-c2-low" />
                        Acknowledge
                      </button>
                    </div>
                  </div>
                );
              })}

              {ackAlerts.length > 0 && (
                <div className="pt-4 border-t border-c2-border space-y-2">
                  <span className="text-[10px] uppercase font-mono font-bold text-c2-text-muted tracking-wider">
                    Acknowledged Log ({ackAlerts.length})
                  </span>
                  {ackAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="p-2 rounded bg-c2-surface border border-c2-border text-c2-text-muted opacity-60 text-xs space-y-1 font-mono"
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span>{alert.title}</span>
                        <span>{alert.timestamp}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
