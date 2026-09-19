import React, { useState } from 'react';
import { 
  GitMerge, 
  X, 
  Check, 
  AlertTriangle, 
  MapPin, 
  Users, 
  Clock, 
  FileText, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import SeverityBadge from '../common/SeverityBadge';
import PriorityBadge from '../common/PriorityBadge';
import { MOCK_DUPLICATE_CANDIDATES } from '../../mock/mockData';

export default function DuplicateMergeModal({
  isOpen,
  onClose,
  primaryIncident,
  candidateIncident,
  onMerge
}) {
  if (!isOpen || !primaryIncident || !candidateIncident) return null;

  const [isMerging, setIsMerging] = useState(false);

  const duplicateMeta = (MOCK_DUPLICATE_CANDIDATES[primaryIncident.id] || [])[0] || {
    similarityScore: 91,
    reasons: [
      'Identical classification: WATER_RESCUE',
      'Geospatial distance: 280 meters apart',
      'Temporal proximity: 3 minutes between reports',
      'Corroborating narrative: Passengers marooned on vehicle roof'
    ],
    sharedEvidenceCount: 2,
    confidence: 95
  };

  const handleConfirmMerge = async () => {
    setIsMerging(true);
    try {
      await onMerge(primaryIncident.id, candidateIncident.id);
      setIsMerging(false);
      onClose();
    } catch (err) {
      console.error('Merge error:', err);
      setIsMerging(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 font-sans select-none animate-fadeIn">
      <div className="bg-c2-card border border-c2-border rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-c2-surface px-6 py-4 border-b border-c2-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-c2-medium-bg border border-c2-medium-border flex items-center justify-center text-c2-medium">
              <GitMerge className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-mono text-sm font-bold text-c2-text uppercase tracking-wider flex items-center gap-2">
                DUPLICATE REPORT CORRELATION & MERGE TRIAGE
              </h3>
              <p className="text-xs text-c2-text-muted">
                AI correlation engine identified high-probability duplicate incident reports
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-c2-card text-c2-text-muted hover:text-c2-text transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Match Score Banner */}
          <div className="p-4 rounded-lg bg-c2-medium-bg border border-c2-medium-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl font-mono font-extrabold text-c2-medium-text">
                {duplicateMeta.similarityScore}%
              </div>
              <div>
                <div className="text-xs font-mono font-bold text-c2-medium-text uppercase">
                  CONFIRMED DUPLICATE CLUSTER
                </div>
                <div className="text-[11px] text-c2-text-muted">
                  Confidence: {duplicateMeta.confidence}% • AI Model: Geospatial-NLP Correlation v2
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-c2-text-muted">
              <ShieldCheck className="w-4 h-4 text-c2-low" />
              <span>Merge Recommended</span>
            </div>
          </div>

          {/* AI Matching Criteria */}
          <div className="bg-c2-surface/60 rounded-lg p-3 border border-c2-border">
            <span className="text-[10px] uppercase font-mono font-bold text-c2-text-muted tracking-wider mb-2 block">
              CORROBORATION FACTORS:
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono text-c2-text">
              {duplicateMeta.reasons.map((reason, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-c2-low shrink-0" />
                  <span>{reason}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Side-by-Side Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Primary Incident */}
            <div className="p-4 rounded-lg bg-c2-card border-2 border-c2-accent/60 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-c2-border pb-2">
                <span className="text-[10px] font-mono font-bold text-c2-accent uppercase">
                  MASTER INCIDENT (RETAINED)
                </span>
                <div className="flex items-center gap-1.5">
                  <PriorityBadge priority={primaryIncident.priority} />
                  <SeverityBadge severity={primaryIncident.severity} />
                </div>
              </div>

              <div>
                <span className="font-mono text-xs font-bold text-c2-text">#{primaryIncident.id}</span>
                <h4 className="font-bold text-sm text-c2-text">{primaryIncident.title}</h4>
                <p className="text-xs text-c2-text-muted mt-1 leading-relaxed">{primaryIncident.description}</p>
              </div>

              <div className="space-y-1.5 text-xs font-mono text-c2-text-muted pt-2 border-t border-c2-border">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-c2-critical" />
                    Location:
                  </span>
                  <span className="font-semibold text-c2-text">{primaryIncident.location?.address}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-c2-critical" />
                    People at Risk:
                  </span>
                  <span className="font-bold text-c2-critical-text">{primaryIncident.peopleAtRisk} Civilians</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3 text-c2-accent" />
                    Evidence Sources:
                  </span>
                  <span className="font-semibold text-c2-text">{primaryIncident.evidence?.length || 4} Corroborated</span>
                </div>
              </div>
            </div>

            {/* Candidate Duplicate */}
            <div className="p-4 rounded-lg bg-c2-surface border border-c2-medium-border shadow-sm space-y-3 opacity-90">
              <div className="flex items-center justify-between border-b border-c2-border pb-2">
                <span className="text-[10px] font-mono font-bold text-c2-medium-text uppercase">
                  DUPLICATE REPORT (TO ABSORB)
                </span>
                <div className="flex items-center gap-1.5">
                  <PriorityBadge priority={candidateIncident.priority} />
                  <SeverityBadge severity={candidateIncident.severity} />
                </div>
              </div>

              <div>
                <span className="font-mono text-xs font-bold text-c2-text">#{candidateIncident.id}</span>
                <h4 className="font-bold text-sm text-c2-text">{candidateIncident.title}</h4>
                <p className="text-xs text-c2-text-muted mt-1 leading-relaxed">{candidateIncident.description}</p>
              </div>

              <div className="space-y-1.5 text-xs font-mono text-c2-text-muted pt-2 border-t border-c2-border">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-c2-medium" />
                    Location:
                  </span>
                  <span className="font-semibold text-c2-text">{candidateIncident.location?.address}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-c2-medium" />
                    Reported Trapped:
                  </span>
                  <span className="font-bold text-c2-medium-text">{candidateIncident.peopleAtRisk} Civilians</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3 text-c2-medium" />
                    Incoming Report:
                  </span>
                  <span className="font-semibold text-c2-text">{candidateIncident.reports?.length || 1} Dispatch Call</span>
                </div>
              </div>
            </div>
          </div>

          {/* Merge Result Preview */}
          <div className="p-3 rounded-lg bg-c2-accent-bg/40 border border-c2-accent-border flex items-center justify-between text-xs font-mono text-c2-accent-text">
            <span>Result: #{candidateIncident.id} will be merged into master incident #{primaryIncident.id}, consolidating all telemetry & 911 calls.</span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-c2-surface px-6 py-3 border-t border-c2-border flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-c2-border bg-c2-card hover:bg-c2-surface text-c2-text font-mono text-xs font-bold transition"
          >
            KEEP SEPARATE
          </button>

          <button
            onClick={handleConfirmMerge}
            disabled={isMerging}
            className="px-5 py-2 rounded-lg bg-c2-accent hover:bg-blue-700 text-c2-card font-mono text-xs font-bold transition shadow-md flex items-center gap-2"
          >
            <GitMerge className="w-4 h-4" />
            {isMerging ? 'MERGING INCIDENTS...' : `MERGE #${candidateIncident.id} INTO #${primaryIncident.id}`}
          </button>
        </div>
      </div>
    </div>
  );
}
