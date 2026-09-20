import React, { useState } from 'react';
import ConfidenceScore from '../common/ConfidenceScore';
import SeverityBadge from '../common/SeverityBadge';
import PriorityBadge from '../common/PriorityBadge';
import { 
  Sparkles, 
  ShieldCheck, 
  GitMerge, 
  CheckCircle2, 
  Clock, 
  Users, 
  FileText, 
  Activity, 
  AlertTriangle, 
  ChevronRight, 
  Send,
  HelpCircle,
  Truck
} from 'lucide-react';
import { MOCK_DUPLICATE_CANDIDATES } from '../../mock/mockData';

function formatDisplayId(id) {
  if (!id) return '';
  if (typeof id === 'string' && id.length > 12) {
    const clean = id.replace(/-/g, '').toUpperCase();
    return `INC-${clean.slice(-4)}`;
  }
  return id;
}

export default function AICommandPanel({
  incident,
  recommendations = [],
  onApproveDispatch,
  onOpenMergeModal,
  onOpenBriefingModal,
  onEscalateSeverity
}) {
  const [showEvidence, setShowEvidence] = useState(true);

  if (!incident) {
    return (
      <div className="flex flex-col h-full bg-c2-card p-6 text-center justify-center font-mono text-xs text-c2-text-muted">
        Select an active incident from the feed to engage AI Command Copilot.
      </div>
    );
  }

  const duplicates = MOCK_DUPLICATE_CANDIDATES[incident.id] || [];
  const hasDuplicate = duplicates.length > 0;
  const duplicateMeta = duplicates[0];

  const primaryRec = recommendations[0];

  return (
    <div className="flex flex-col h-full bg-c2-card overflow-hidden select-none">
      {/* AI Panel Header */}
      <div className="p-3 border-b border-c2-border flex items-center justify-between bg-c2-ai-bg/40">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-c2-ai animate-pulse" />
          <h2 className="text-xs font-mono font-bold uppercase text-c2-ai-text tracking-wider">
            AI COMMAND COPILOT
          </h2>
        </div>
        <ConfidenceScore score={incident.confidence || 94} />
      </div>

      {/* Main Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 font-mono bg-c2-paper">
        {/* Active Target Header Card */}
        <div className="p-3 rounded-lg bg-c2-card border border-c2-border shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <PriorityBadge priority={incident.priority} />
              <span className="font-bold text-xs text-c2-text">#{formatDisplayId(incident.id)}</span>
            </div>
            <SeverityBadge severity={incident.severity} pulse={incident.severity === 'CRITICAL'} />
          </div>

          <h3 className="font-bold text-xs text-c2-text leading-tight">{incident.title}</h3>
          
          <p className="text-[11px] text-c2-text-muted leading-relaxed">
            {incident.aiSummary || incident.description}
          </p>

          <div className="flex items-center justify-between text-[10px] text-c2-text-muted pt-1.5 border-t border-c2-border">
            <span className="flex items-center gap-1 font-semibold text-c2-critical-text">
              <Users className="w-3 h-3 text-c2-critical" />
              {incident.peopleAtRisk} at risk
            </span>
            <span>{incident.location?.sector || 'Sector 4B'}</span>
          </div>
        </div>

        {/* Duplicate Correlation Banner (If Available) */}
        {hasDuplicate && (
          <div className="p-3 rounded-lg bg-c2-medium-bg border border-c2-medium-border shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-c2-medium-text uppercase tracking-wider flex items-center gap-1">
                <GitMerge className="w-3.5 h-3.5" />
                POSSIBLE RELATED INCIDENT DETECTED
              </span>
              <span className="text-xs font-extrabold text-c2-medium-text bg-amber-100 px-1.5 py-0.5 rounded border border-c2-medium-border">
                {duplicateMeta.similarityScore}% MATCH
              </span>
            </div>

            <p className="text-[11px] text-c2-text-muted">
              Target #{duplicateMeta.targetIncidentId} exhibits 91% spatial and temporal correlation.
            </p>

            <button
              onClick={() => onOpenMergeModal(incident, duplicateMeta.targetIncidentId)}
              className="w-full py-1.5 bg-c2-medium hover:bg-amber-600 text-white rounded text-[11px] font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
            >
              <GitMerge className="w-3.5 h-3.5" />
              REVIEW DUPLICATE & MERGE
            </button>
          </div>
        )}

        {/* Explainability Breakdown */}
        <div className="p-3 rounded-lg bg-c2-card border border-c2-border shadow-sm space-y-2">
          <div className="flex items-center justify-between border-b border-c2-border pb-1.5">
            <span className="text-[10px] uppercase text-c2-ai font-bold tracking-wider flex items-center gap-1">
              <Activity className="w-3 h-3" />
              Severity Factors (Score: {incident.explainability?.score || 91})
            </span>
            <span className="text-[10px] bg-c2-critical-bg text-c2-critical-text border border-c2-critical-border px-1.5 py-0.5 rounded font-bold">
              {incident.severity}
            </span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            {incident.explainability?.factors?.map((factor, i) => (
              <div key={i} className="flex items-center justify-between text-c2-text">
                <span className="text-c2-text font-medium truncate mr-2">+ {factor.name}</span>
                <span className="font-bold text-c2-critical-text shrink-0">{factor.weight}</span>
              </div>
            )) || (
              <div className="text-c2-text-muted">Analyzing factors...</div>
            )}
          </div>
        </div>

        {/* Corroborating Evidence Panel */}
        <div className="p-3 rounded-lg bg-c2-card border border-c2-border shadow-sm space-y-2">
          <div 
            onClick={() => setShowEvidence(prev => !prev)}
            className="flex items-center justify-between cursor-pointer border-b border-c2-border pb-1.5"
          >
            <span className="text-[10px] uppercase text-c2-text-muted font-bold tracking-wider flex items-center gap-1">
              <FileText className="w-3 h-3 text-c2-accent" />
              Evidence & Sources ({incident.evidence?.length || 0})
            </span>
            <span className="text-[10px] text-c2-accent font-semibold">{showEvidence ? 'Hide' : 'Show'}</span>
          </div>

          {showEvidence && (
            <div className="space-y-2 text-[11px]">
              {incident.evidence?.map((ev) => (
                <div key={ev.id} className="p-2 rounded bg-c2-surface border border-c2-border space-y-0.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-c2-accent">{ev.source}</span>
                    <span className="text-c2-text-muted">{ev.timestamp}</span>
                  </div>
                  <p className="text-c2-text text-[11px] leading-snug">{ev.text}</p>
                </div>
              )) || (
                <div className="text-c2-text-muted">No evidence logs registered</div>
              )}
            </div>
          )}
        </div>

        {/* Top Resource Recommendation Card */}
        {primaryRec && (
          <div className="p-3.5 rounded-lg bg-c2-accent-bg/40 border border-c2-accent-border glow-accent shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase text-c2-accent-text font-bold tracking-wider flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-c2-accent" />
                AI Resource Recommendation
              </span>
              <span className="text-xs font-bold text-c2-low-text bg-c2-low-bg px-1.5 py-0.5 rounded border border-c2-low-border">
                {primaryRec.matchScore}% MATCH
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-c2-text">{primaryRec.resourceName}</span>
              <span className="text-xs font-extrabold text-c2-accent">ETA: {primaryRec.etaMinutes} MIN</span>
            </div>

            <div className="text-[11px] text-c2-text-muted">
              {primaryRec.distanceKm} km away • {primaryRec.capabilityMatch}
            </div>

            {primaryRec.reasons && (
              <div className="space-y-1 bg-white/70 p-2 rounded border border-c2-accent-border/60 text-[10px] text-c2-text">
                {primaryRec.reasons.map((r, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className="text-c2-accent font-bold">•</span>
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => onApproveDispatch(primaryRec.id, incident.id, primaryRec.resourceId)}
              className="w-full py-2 bg-c2-accent hover:bg-blue-700 text-c2-card rounded font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              APPROVE DISPATCH ({primaryRec.resourceId})
            </button>
          </div>
        )}
      </div>

      {/* Action Toolbar Footer */}
      <div className="p-3 bg-c2-surface border-t border-c2-border flex items-center justify-between gap-2">
        <button
          onClick={onOpenBriefingModal}
          className="flex-1 py-1.5 bg-c2-ai-bg hover:bg-purple-100 border border-c2-ai-border text-c2-ai-text rounded font-mono text-[11px] font-bold flex items-center justify-center gap-1.5 transition shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-c2-ai" />
          AI Briefing
        </button>

        <button
          onClick={onEscalateSeverity}
          className="flex-1 py-1.5 bg-c2-critical-bg hover:bg-red-100 border border-c2-critical-border text-c2-critical-text rounded font-mono text-[11px] font-bold flex items-center justify-center gap-1.5 transition shadow-sm"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-c2-critical" />
          Escalate P1
        </button>
      </div>
    </div>
  );
}
