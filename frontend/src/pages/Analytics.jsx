import React from 'react';
import Header from '../components/layout/Header';
import StatCard from '../components/common/StatCard';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Activity, 
  ShieldAlert, 
  Layers,
  ArrowUpRight
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';

const TIMELINE_DATA = [
  { time: '00:00', critical: 1, high: 2, medium: 4 },
  { time: '04:00', critical: 0, high: 1, medium: 3 },
  { time: '08:00', critical: 3, high: 5, medium: 8 },
  { time: '12:00', critical: 2, high: 4, medium: 6 },
  { time: '16:00', critical: 4, high: 6, medium: 9 },
  { time: '20:00', critical: 2, high: 3, medium: 5 },
];

const RESPONSE_TIME_DATA = [
  { unit: 'Ambulance (ALS)', target: 8, actual: 6.2 },
  { unit: 'Fire Rescue', target: 7, actual: 5.8 },
  { unit: 'Swiftwater Team', target: 12, actual: 9.4 },
  { unit: 'Police Tactical', target: 6, actual: 4.9 },
  { unit: 'Hazmat Unit', target: 15, actual: 11.2 },
];

export default function Analytics() {
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
            <p className="text-xs text-c2-text-muted font-mono">
              Aggregated real-time metrics across 24h operational shift
            </p>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs text-c2-text-muted">
            <span className="px-2.5 py-1 rounded bg-c2-card border border-c2-border font-medium shadow-sm">
              Shift: 08:00 - 20:00
            </span>
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard 
            label="Total Incidents (24h)" 
            value="100" 
            subValue="+12% vs avg" 
            icon={Layers} 
            variant="default" 
          />
          <StatCard 
            label="Mean Time to Dispatch" 
            value="1.8 min" 
            subValue="-45s AI optimization" 
            icon={Clock} 
            variant="success" 
          />
          <StatCard 
            label="Critical Incidents" 
            value="14" 
            subValue="100% responded" 
            icon={ShieldAlert} 
            variant="critical" 
          />
          <StatCard 
            label="Fleet Utilization" 
            value="75%" 
            subValue="18 of 24 units active" 
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
              <span className="text-[10px] text-c2-text-muted font-normal">24 Hour Window</span>
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={TIMELINE_DATA}>
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
              <span className="text-[10px] text-c2-text-muted font-normal">Target vs Actual</span>
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={RESPONSE_TIME_DATA} layout="vertical">
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
