import React, { useState } from 'react';
import Header from './Header';
import { ChevronUp, ChevronDown, Radio } from 'lucide-react';

export default function CommandLayout({
  children,
  leftPanel,
  centerPanel,
  rightPanel,
  bottomPanel,
  demoControlsPanel
}) {
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(true);
  const [isDemoControlsOpen, setIsDemoControlsOpen] = useState(true);

  return (
    <div className="flex flex-col h-screen w-screen bg-c2-paper text-c2-text overflow-hidden select-none">
      {/* C2 Header (Dark Strip) */}
      <Header 
        isDemoControlsOpen={isDemoControlsOpen}
        onOpenDemoControls={() => setIsDemoControlsOpen(prev => !prev)}
      />

      {/* Demo Controls Bar (Collapsible) */}
      {isDemoControlsOpen && demoControlsPanel && (
        <div className="bg-c2-card border-b border-c2-border px-4 py-2 flex items-center justify-between z-20 shrink-0 shadow-sm">
          {demoControlsPanel}
        </div>
      )}

      {/* Main Command Surface: 3-Column Layout */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Left Column: Active Incidents Feed */}
        <aside className="w-80 lg:w-96 bg-c2-card border-r border-c2-border flex flex-col shrink-0 z-10 shadow-sm">
          {leftPanel}
        </aside>

        {/* Center Column: Live Emergency Map / Tactical Surface */}
        <main className="flex-1 relative flex flex-col min-w-0 bg-c2-paper overflow-hidden">
          {centerPanel}
        </main>

        {/* Right Column: AI Incident Commander Panel */}
        <aside className="w-80 lg:w-[420px] bg-c2-card border-l border-c2-border flex flex-col shrink-0 z-10 shadow-sm">
          {rightPanel}
        </aside>
      </div>

      {/* Bottom Live Activity & Alert Timeline Drawer */}
      <div 
        className={`bg-c2-card border-t border-c2-border flex flex-col transition-all duration-200 z-20 shrink-0 shadow-md ${
          isTimelineExpanded ? 'h-44' : 'h-8'
        }`}
      >
        <div className="h-8 bg-c2-surface px-4 border-b border-c2-border flex items-center justify-between text-xs font-mono text-c2-text-muted">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-c2-critical animate-pulse" />
            <span className="font-bold text-c2-text uppercase tracking-wider">LIVE ACTIVITY AUDIT & ALERTS</span>
            <span className="text-[10px] bg-c2-card border border-c2-border px-1.5 py-0.5 rounded text-c2-text-muted font-semibold">STREAMING</span>
          </div>
          <button 
            onClick={() => setIsTimelineExpanded(prev => !prev)}
            className="flex items-center gap-1 hover:text-c2-text p-1 transition text-[11px]"
          >
            <span>{isTimelineExpanded ? 'Minimize' : 'Expand Timeline'}</span>
            {isTimelineExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>

        {isTimelineExpanded && (
          <div className="flex-1 min-h-0 overflow-y-auto p-2 font-mono bg-c2-card">
            {bottomPanel}
          </div>
        )}
      </div>
    </div>
  );
}
