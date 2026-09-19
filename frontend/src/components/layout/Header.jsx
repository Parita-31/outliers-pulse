import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  ShieldAlert, 
  Radio, 
  Bell, 
  Activity, 
  BarChart3, 
  LayoutDashboard,
  Cpu,
  Truck
} from 'lucide-react';
import { useLiveClock } from '../../hooks/useLiveClock';
import { useIncidents } from '../../hooks/useIncidents';
import { useResources } from '../../hooks/useResources';
import { useAlerts } from '../../hooks/useAlerts';
import StatusDot from '../common/StatusDot';
import StatCard from '../common/StatCard';

export default function Header({ 
  onOpenDemoControls,
  isDemoControlsOpen = false
}) {
  const { utcString, localString } = useLiveClock();
  const { incidents } = useIncidents();
  const { resources } = useResources();
  const { unackAlertsCount, toggleAlertDrawer } = useAlerts();

  const criticalCount = incidents.filter((i) => i.severity === 'CRITICAL').length;
  const availableCount = resources.filter((r) => r.status === 'AVAILABLE').length;
  const totalResources = resources.length || 6;

  return (
    <header className="h-16 bg-c2-header border-b border-c2-header-border px-4 flex items-center justify-between z-30 shrink-0 select-none">
      {/* Brand & System Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded bg-red-950/80 border border-c2-critical/80 flex items-center justify-center glow-critical">
            <ShieldAlert className="w-5 h-5 text-c2-critical animate-pulse-fast" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm tracking-wider uppercase font-mono text-c2-header-text flex items-center gap-1.5">
                SURGE <span className="text-c2-critical font-extrabold">//</span> AI INCIDENT COMMANDER
              </h1>
              <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-c2-ai-bg/20 border border-c2-ai/60 text-purple-300 rounded uppercase">
                v2.4 C2
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-c2-header-muted font-mono">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <StatusDot status="online" size="sm" />
                SYSTEM LIVE
              </span>
              <span>•</span>
              <span className="text-amber-400 font-semibold">DEFCON 2</span>
              <span>•</span>
              <span>NADIAD EOC // GUJARAT</span>
            </div>
          </div>
        </div>

        {/* Tactical Clock */}
        <div className="hidden lg:flex flex-col border-l border-c2-header-border pl-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-c2-header-text font-bold tracking-tight">
            <Radio className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            <span>{utcString}</span>
          </div>
          <div className="text-[10px] text-c2-header-muted">
            LOCAL: {localString}
          </div>
        </div>
      </div>

      {/* Navigation & Stat Counters */}
      <div className="flex items-center gap-3">
        {/* Dynamic KPI Chips */}
        <div className="hidden md:flex items-center gap-2">
          <StatCard 
            label="Critical Incidents" 
            value={criticalCount} 
            variant={criticalCount > 0 ? "critical" : "default"}
            icon={Activity}
            darkHeader={true}
          />
          <StatCard 
            label="Fleet Ready" 
            value={`${availableCount}/${totalResources}`} 
            variant="accent"
            icon={Truck}
            darkHeader={true}
          />
        </div>

        {/* View Switcher */}
        <nav className="flex items-center bg-c2-header-surface p-1 rounded border border-c2-header-border">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                isActive
                  ? 'bg-c2-accent text-c2-header-text shadow-sm font-semibold'
                  : 'text-c2-header-muted hover:text-c2-header-text hover:bg-slate-800'
              }`
            }
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Command Center</span>
          </NavLink>

          <NavLink
            to="/analytics"
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                isActive
                  ? 'bg-c2-accent text-c2-header-text shadow-sm font-semibold'
                  : 'text-c2-header-muted hover:text-c2-header-text hover:bg-slate-800'
              }`
            }
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Analytics</span>
          </NavLink>
        </nav>

        {/* Alert Drawer Trigger */}
        <button
          onClick={toggleAlertDrawer}
          className="relative p-2 rounded bg-c2-header-surface border border-c2-header-border text-c2-header-muted hover:text-c2-header-text hover:border-slate-600 transition"
          title="Tactical Alerts"
        >
          <Bell className="w-4 h-4" />
          {unackAlertsCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-c2-critical text-c2-header-text text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
              {unackAlertsCount}
            </span>
          )}
        </button>

        {/* Demo Controls Trigger */}
        <button
          onClick={onOpenDemoControls}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono font-bold rounded border transition ${
            isDemoControlsOpen
              ? 'bg-c2-ai border-c2-ai text-c2-header-text glow-ai'
              : 'bg-purple-950/60 border-c2-ai/50 text-purple-300 hover:bg-purple-900/60'
          }`}
          title="Toggle Hackathon Demo Scenario Bar"
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>DEMO BAR</span>
        </button>
      </div>
    </header>
  );
}
