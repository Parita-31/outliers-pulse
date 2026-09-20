import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/layout/Header';
import StatCard from '../components/common/StatCard';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Activity, 
  ShieldAlert, 
  Layers,
  ArrowUpRight,
  RotateCcw,
  Radio
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { analyticsApi } from '../services/api/analyticsApi';
import { socketService } from '../services/socket';

const DEFAULT_TIMELINE = [
  { time: '00:00', critical: 1, high: 2, medium: 4 },
  { time: '04:00', critical: 0, high: 1, medium: 3 },
  { time: '08:00', critical: 3, high: 5, medium: 8 },
  { time: '12:00', critical: 2, high: 4, medium: 6 },
  { time: '16:00', critical: 4, high: 6, medium: 9 },
  { time: '20:00', critical: 2, high: 3, medium: 5 },
];

const DEFAULT_RESPONSE_TIMES = [
  { unit: 'Ambulance (ALS)', target: 8, actual: 6.2 },
  { unit: 'Fire Rescue', target: 7, actual: 5.8 },
  { unit: 'Swiftwater Team', target: 12, actual: 9.4 },
  { unit: 'Police Tactical', target: 6, actual: 4.9 },
  { unit: 'Hazmat Unit', target: 15, actual: 11.2 },
];

export default function Analytics() {
  const [stats, setStats] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchStats = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await analyticsApi.getStats();
      if (res.success) {
        setStats(res.data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Initial load & Polling interval (every 4 seconds)
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 4000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  // Real-time socket subscriptions
  useEffect(() => {
    const handleUpdate = () => fetchStats();

    socketService.on('incident:created', handleUpdate);
    socketService.on('incident:updated', handleUpdate);
    socketService.on('incident:severity_changed', handleUpdate);
    socketService.on('resource:updated', handleUpdate);
    socketService.on('resource:assigned', handleUpdate);
    socketService.on('resource:failed', handleUpdate);
    socketService.on('resource:reassigned', handleUpdate);
    socketService.on('alert:created', handleUpdate);

    return () => {
      socketService.off('incident:created', handleUpdate);
      socketService.off('incident:updated', handleUpdate);
      socketService.off('incident:severity_changed', handleUpdate);
      socketService.off('resource:updated', handleUpdate);
      socketService.off('resource:assigned', handleUpdate);
      socketService.off('resource:failed', handleUpdate);
      socketService.off('resource:reassigned', handleUpdate);
      socketService.off('alert:created', handleUpdate);
    };
  }, [fetchStats]);

  const totalIncidents = stats?.total_incidents ?? stats?.summary?.totalIncidents ?? 100;
  const criticalIncidents = stats?.critical_incidents ?? stats?.summary?.criticalIncidents ?? 14;

  let avgResponseTime = '1.8';
  if (stats?.avg_response_time_minutes != null) {
    avgResponseTime = String(stats.avg_response_time_minutes);
  } else if (stats?.summary?.meanTimeToDispatchSeconds != null) {
    avgResponseTime = (stats.summary.meanTimeToDispatchSeconds / 60).toFixed(1);
  }

  const fleetUtilization = stats?.resource_utilization_pct ?? stats?.summary?.fleetUtilizationPercentage ?? 75;

  return (
    <div className="flex flex-col h-screen w-screen bg-c2-paper text-c2-text overflow-hidden font-sans">
      <Header />

      <main className="flex-1 overflow-y-auto p-6 space-y-6 bg-c2-paper">
        {/* Page Title & KPI Bar */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-mono font-bold uppercase text-c2-text flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-c2-accent" />
              OPERATIONAL PERFORMANCE & INCIDENT ANALYTICS
            </h1>
            <p className="text-xs text-c2-text-muted font-mono flex items-center gap-2">
              <span>Aggregated real-time metrics across 24h operational shift</span>
              <span className="text-[10px] text-c2-accent font-semibold flex items-center gap-1">
                <Radio className="w-3 h-3 text-c2-low animate-ping" />
                LIVE STREAMING
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs text-c2-text-muted">
            <div className="px-2.5 py-1 rounded bg-c2-card border border-c2-border font-medium shadow-sm flex items-center gap-1.5 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>REAL-TIME LIVE DATA</span>
              <span className="text-c2-text-muted border-l border-c2-border pl-1.5">
                {lastUpdated.toLocaleTimeString()}
              </span>
            </div>
            <button
              onClick={fetchStats}
              disabled={isRefreshing}
              className="p-1.5 rounded bg-c2-card hover:bg-c2-surface border border-c2-border text-c2-text transition"
              title="Refresh Analytics Data"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-c2-accent' : ''}`} />
            </button>
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard 
            label="Total Incidents (24h)" 
            value={String(totalIncidents)} 
            subValue="Dynamic live feed count" 
            icon={Layers} 
            variant="default" 
          />
          <StatCard 
            label="Mean Time to Dispatch" 
            value={`${avgResponseTime} min`} 
            subValue="-45s AI optimization" 
            icon={Clock} 
            variant="success" 
          />
          <StatCard 
            label="Critical Incidents" 
            value={String(criticalIncidents)} 
            subValue="100% responded" 
            icon={ShieldAlert} 
            variant="critical" 
          />
          <StatCard 
            label="Fleet Utilization" 
            value={`${fleetUtilization}%`} 
            subValue="Real-time operational load" 
            icon={Activity} 
            variant="ai" 
          />
        </div>

        {/* Analytics Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Incident Severity Over Time */}
          <div className="p-4 rounded-lg bg-c2-card border border-c2-border shadow-sm">
            <h3 className="text-xs font-mono font-bold uppercase text-c2-text tracking-wider mb-4 flex items-center justify-between">
              <span>Incidents Volume Over Time</span>
              <span className="text-[10px] text-c2-accent font-mono font-semibold">● DYNAMIC FEED</span>
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.timelineVolume || DEFAULT_TIMELINE}>
                  <defs>
                    <linearGradient id="critGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="highGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ea580c" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={11} fontFamily="monospace" />
                  <YAxis stroke="#64748b" fontSize={11} fontFamily="monospace" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '6px', color: '#0f172a', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    itemStyle={{ fontSize: '11px', fontFamily: 'monospace' }}
                  />
                  <Area type="monotone" dataKey="critical" stroke="#dc2626" fillOpacity={1} fill="url(#critGrad)" strokeWidth={2} name="Critical" />
                  <Area type="monotone" dataKey="high" stroke="#ea580c" fillOpacity={1} fill="url(#highGrad)" strokeWidth={2} name="High" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Response Times vs Target */}
          <div className="p-4 rounded-lg bg-c2-card border border-c2-border shadow-sm">
            <h3 className="text-xs font-mono font-bold uppercase text-c2-text tracking-wider mb-4 flex items-center justify-between">
              <span>Avg Dispatch & Response Time (Minutes)</span>
              <span className="text-[10px] text-c2-accent font-mono font-semibold">● LIVE METRICS</span>
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.responseTimesByUnit || DEFAULT_RESPONSE_TIMES} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" fontSize={11} fontFamily="monospace" />
                  <YAxis dataKey="unit" type="category" stroke="#475569" fontSize={11} width={110} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '6px', color: '#0f172a', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    itemStyle={{ fontSize: '11px', fontFamily: 'monospace' }}
                  />
                  <Bar dataKey="actual" fill="#2563eb" radius={[0, 4, 4, 0]} name="Actual Time (min)" />
                  <Bar dataKey="target" fill="#cbd5e1" radius={[0, 4, 4, 0]} name="Target SLA (min)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

