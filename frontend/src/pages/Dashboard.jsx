import React, { useState, useEffect } from 'react';
import CommandLayout from '../components/layout/CommandLayout';
import SeverityBadge from '../components/common/SeverityBadge';
import PriorityBadge from '../components/common/PriorityBadge';
import EmergencyMap from '../components/map/EmergencyMap';
import AICommandPanel from '../components/command/AICommandPanel';
import DuplicateMergeModal from '../components/incidents/DuplicateMergeModal';
import OperationalBriefingModal from '../components/incidents/OperationalBriefingModal';
import EventNotificationModal from '../components/incidents/EventNotificationModal';
import ToastContainer from '../components/alerts/ToastNotification';
import AlertCenterDrawer from '../components/alerts/AlertCenterDrawer';
import { useIncidents } from '../hooks/useIncidents';
import { useResources } from '../hooks/useResources';
import { useAlerts } from '../hooks/useAlerts';
import { 
  Flame, 
  Waves, 
  Car, 
  Radio, 
  Cpu, 
  MapPin, 
  AlertTriangle, 
  CheckCircle2, 
  Zap, 
  RotateCcw, 
  Sparkles, 
  Compass, 
  AlertCircle,
  GitMerge
} from 'lucide-react';

import { incidentsApi } from '../services/api/incidentsApi';

export default function Dashboard() {
  const { incidents, selectedIncident, selectIncident, mergeIncidents, dispatch: incidentDispatch } = useIncidents();
  const { 
    resources, 
    recommendations, 
    compromisedPlans, 
    loadRecommendations, 
    approveDispatch, 
    simulateFailure, 
    approveRecovery 
  } = useResources();
  const { timeline, addTimelineEvent } = useAlerts();

  // Modals state
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [mergeTargetIncident, setMergeTargetIncident] = useState(null);
  const [isBriefingModalOpen, setIsBriefingModalOpen] = useState(false);
  const [eventModalState, setEventModalState] = useState({ isOpen: false, eventData: null });

  const activeIncId = selectedIncident?.id || incidents[0]?.id || 'INC-102';
  const activeRecs = recommendations[activeIncId] || [];
  const compromised = compromisedPlans[activeIncId];

  useEffect(() => {
    if (activeIncId) {
      loadRecommendations(activeIncId);
    }
  }, [activeIncId]);

  // Demo Handlers
  const handleSimulateFlood = async () => {
    const targetId = selectedIncident?.id || 'INC-102';
    selectIncident(targetId);
    await incidentsApi.analyze(targetId).catch(() => null);
    addTimelineEvent({
      type: 'SIMULATION',
      category: 'FLOOD_TRIGGER',
      title: 'Flash Flood Telemetry Ingested',
      description: `Ingested live gauge data for incident #${targetId}.`
    });

    setEventModalState({
      isOpen: true,
      eventData: {
        type: 'FLOOD',
        title: 'Flash Flood Telemetry Ingested',
        subtitle: `Live river gauge & hydrometric sensor data ingested for incident #${targetId}. Sector 4B water levels rapidly rising.`,
        incidentId: targetId,
        details: [
          { label: 'Hydrological Telemetry', value: 'Gauge #FL-402 measured +2.4m surge above flood stage. Water flow speed 4.2 knots.' },
          { label: 'AI Threat Matrix', value: 'Dynamic map updated with flash flood hazard contours & inundated route boundaries.' },
          { label: 'Civilian Impact', value: `${selectedIncident?.peopleAtRisk || 14} civilians currently stranded at risk near Sector 4B.` }
        ],
        metrics: [
          { label: 'Water Surge', value: '+2.4 Meters' },
          { label: 'Risk Score', value: '88 / 100' }
        ],
        actionLabel: 'UNDERSTOOD & DISMISS'
      }
    });
  };

  const handleEscalateCritical = async () => {
    const targetId = selectedIncident?.id || 'INC-102';
    try {
      await incidentsApi.update(targetId, { severity: 'CRITICAL', priority: 'P1' });
    } catch (e) {
      console.error(e);
    }
    incidentDispatch({
      type: 'UPDATE_SEVERITY',
      payload: { id: targetId, severity: 'CRITICAL', priority: 'P1', score: 95 }
    });
    addTimelineEvent({
      type: 'ESCALATION',
      category: 'SEVERITY_CHANGED',
      title: `Severity Escalated: #${targetId}`,
      description: 'Critical score escalated to 95. Immediate tactical dispatch required.'
    });

    setEventModalState({
      isOpen: true,
      eventData: {
        type: 'ESCALATE',
        title: `Severity Escalated to CRITICAL (P1)`,
        subtitle: `Incident #${targetId} severity manually upgraded to P1 Critical by Command Operator.`,
        incidentId: targetId,
        details: [
          { label: 'Priority Escalation', value: 'Priority set to P1 (Highest Priority Emergency Response).' },
          { label: 'AI Confidence Score', value: 'Explainability score boosted to 95/100 based on structural threat & life safety.' },
          { label: 'Command Network Alert', value: 'Priority alert broadcasted to all sector dispatchers and ALS units.' }
        ],
        metrics: [
          { label: 'Severity Level', value: 'CRITICAL (P1)' },
          { label: 'AI Score', value: '95 / 100' }
        ],
        actionLabel: 'CONFIRM ESCALATION'
      }
    });
  };

  const handleOpenMergeModal = (primary, explicitTargetId) => {
    const primaryId = primary?.id || activeIncId;
    const targetInc = incidents.find((i) => i.id === explicitTargetId) || incidents.find((i) => i.id !== primaryId && i.status !== 'MERGED');
    if (targetInc) {
      setMergeTargetIncident(targetInc);
      setIsMergeModalOpen(true);
    }
  };

  const handleConfirmMerge = async (primaryId, targetId) => {
    await mergeIncidents(primaryId, targetId);
    addTimelineEvent({
      type: 'MERGE',
      category: 'INCIDENT_MERGED',
      title: `Incidents Merged: #${targetId} ➔ #${primaryId}`,
      description: `Consolidated all telemetry, ${selectedIncident?.peopleAtRisk || 14} civilians at risk, and corroborating evidence.`
    });
  };

  const handleApproveDispatch = async (recId, incId, resourceId) => {
    await approveDispatch(recId, incId, resourceId);
    addTimelineEvent({
      type: 'DISPATCH',
      category: 'RESOURCE_ASSIGNED',
      title: `Resource ${resourceId} Dispatched`,
      description: `${resourceId} en route to #${incId}.`
    });
  };

  const handleSimulateUnitFailure = async () => {
    const targetId = selectedIncident?.id || 'INC-102';
    const failData = await simulateFailure(targetId);
    addTimelineEvent({
      type: 'FAILURE',
      category: 'UNIT_BREAKDOWN',
      title: `CRITICAL: Resource Failure En Route (#${targetId})`,
      description: 'Mechanical breakdown detected. System generated dynamic recovery plan (+3m delay).'
    });

    const failedName = failData?.failedResourceName || failData?.failed_resource?.name || 'AMB-07';
    const altName = failData?.alternativeRecommendation?.resourceName || 'AMB-12';
    const delay = failData?.alternativeRecommendation?.delayImpactMinutes || 3;

    setEventModalState({
      isOpen: true,
      eventData: {
        type: 'FAILURE',
        title: `Resource Mechanical Failure (${failedName})`,
        subtitle: `ALS Response Unit ${failedName} experienced engine stall en route to incident #${targetId}.`,
        incidentId: targetId,
        details: [
          { label: 'Failed Resource', value: `${failedName} status set to UNAVAILABLE due to mechanical transmission breakdown.` },
          { label: 'AI Dynamic Recovery Route', value: `System recalculated alternative backup response plan using unit ${altName}.` },
          { label: 'Delay Impact', value: `+${delay} Minutes ETA delay impact. Commander reassignment banner activated.` }
        ],
        metrics: [
          { label: 'Failed Unit', value: failedName },
          { label: 'Backup Unit', value: `${altName} (ETA 9m)` }
        ],
        actionLabel: 'REVIEW RECOVERY PLAN'
      }
    });
  };

  const handleApproveRecovery = async () => {
    const targetId = selectedIncident?.id || 'INC-102';
    const altResId = compromised?.alternativeRecommendation?.resourceId || 'AMB-12';
    await approveRecovery(targetId, altResId);
    addTimelineEvent({
      type: 'RECOVERY',
      category: 'UNIT_REASSIGNED',
      title: 'Recovery Plan Approved',
      description: `${altResId} rerouted and dispatched to #${targetId}.`
    });
  };

  return (
    <>
      <CommandLayout
        demoControlsPanel={
          <div className="flex items-center justify-between w-full text-xs font-mono">
            <div className="flex items-center gap-2 text-c2-ai font-bold">
              <Cpu className="w-4 h-4 text-c2-ai animate-pulse" />
              <span className="tracking-wider">HACKATHON DEMO CONTROLS:</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto py-0.5">
              <button 
                onClick={handleSimulateFlood}
                className="px-2.5 py-1 bg-c2-accent-bg hover:bg-blue-100 border border-c2-accent-border text-c2-accent-text rounded text-[11px] font-semibold flex items-center gap-1 transition shadow-sm"
              >
                <Waves className="w-3 h-3 text-c2-accent" />
                1. Simulate Flood
              </button>
              <button 
                onClick={handleEscalateCritical}
                className="px-2.5 py-1 bg-c2-critical-bg hover:bg-red-100 border border-c2-critical-border text-c2-critical-text rounded text-[11px] font-semibold flex items-center gap-1 transition shadow-sm"
              >
                <Flame className="w-3 h-3 text-c2-critical" />
                2. Escalate Critical
              </button>
              <button 
                onClick={() => handleOpenMergeModal(selectedIncident, 'INC-104')}
                className="px-2.5 py-1 bg-c2-medium-bg hover:bg-amber-100 border border-c2-medium-border text-c2-medium-text rounded text-[11px] font-semibold flex items-center gap-1 transition shadow-sm"
              >
                <Zap className="w-3 h-3 text-c2-medium" />
                3. Duplicate Merge
              </button>
              <button 
                onClick={handleSimulateUnitFailure}
                className="px-2.5 py-1 bg-c2-critical-bg hover:bg-red-100 border border-c2-critical text-c2-critical-text rounded text-[11px] font-semibold flex items-center gap-1 transition glow-critical shadow-sm"
              >
                <AlertTriangle className="w-3 h-3 text-c2-critical" />
                4. Fail Unit (AMB-07)
              </button>
              <button 
                onClick={() => setIsBriefingModalOpen(true)}
                className="px-2.5 py-1 bg-c2-ai-bg hover:bg-purple-100 border border-c2-ai-border text-c2-ai-text rounded text-[11px] font-semibold flex items-center gap-1 transition shadow-sm"
              >
                <Sparkles className="w-3 h-3 text-c2-ai" />
                5. AI Briefing
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="px-2 py-1 bg-c2-surface hover:bg-slate-200 border border-c2-border text-c2-text-muted rounded text-[11px] flex items-center gap-1 transition" 
                title="Reset Demo Scenario"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>
          </div>
        }
        leftPanel={
          <div className="flex flex-col h-full bg-c2-card">
            {/* Feed Header */}
            <div className="p-3 border-b border-c2-border flex items-center justify-between bg-c2-surface/50">
              <div>
                <h2 className="text-xs font-mono font-bold uppercase text-c2-text tracking-wider">
                  ACTIVE INCIDENTS ({incidents.length})
                </h2>
                <p className="text-[11px] text-c2-text-muted">Real-time incoming triage</p>
              </div>
              <span className="w-2 h-2 rounded-full bg-c2-low animate-ping" />
            </div>

            {/* Incident List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-c2-paper">
              {incidents.map((inc) => {
                const isSelected = selectedIncident?.id === inc.id;
                const isCrit = inc.severity === 'CRITICAL';
                return (
                  <div 
                    key={inc.id}
                    onClick={() => selectIncident(inc.id)}
                    className={`p-3 rounded bg-c2-card border transition shadow-sm cursor-pointer ${
                      isSelected 
                        ? 'border-c2-accent ring-2 ring-c2-accent/30' 
                        : isCrit 
                          ? 'border-c2-critical-border glow-critical hover:border-c2-critical' 
                          : 'border-c2-border hover:border-c2-border-dark'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <PriorityBadge priority={inc.priority} />
                        <span className="font-mono text-xs font-bold text-c2-text">#{inc.id}</span>
                      </div>
                      <SeverityBadge severity={inc.severity} pulse={isCrit} />
                    </div>
                    <h3 className="text-xs font-bold text-c2-text mb-1 flex items-center gap-1.5">
                      {inc.type === 'WATER_RESCUE' ? (
                        <Waves className="w-3.5 h-3.5 text-c2-accent shrink-0" />
                      ) : (
                        <Flame className="w-3.5 h-3.5 text-c2-high shrink-0" />
                      )}
                      {inc.title}
                    </h3>
                    <p className="text-[11px] text-c2-text-muted line-clamp-2 mb-2">
                      {inc.description}
                    </p>
                    <div className="flex items-center justify-between text-[10px] font-mono text-c2-text-muted border-t border-c2-border pt-1.5">
                      <span className="flex items-center gap-1 font-medium text-c2-text">
                        <MapPin className="w-3 h-3 text-c2-critical" />
                        {inc.location?.sector || 'Sector 4B'} • {inc.peopleAtRisk} at risk
                      </span>
                      <span className="text-c2-text-subtle">LIVE</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        }
        centerPanel={
          <div className="relative w-full h-full bg-c2-paper overflow-hidden">
            {/* Live Leaflet Map Engine */}
            <EmergencyMap />

            {/* Dynamic Recovery Alert Banner */}
            {compromised && (
              <div className="absolute top-14 left-4 right-4 z-[500] bg-c2-critical-bg border-2 border-c2-critical rounded-lg p-3 shadow-2xl glow-recovery flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-c2-critical text-c2-card flex items-center justify-center font-bold text-sm animate-pulse">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-mono text-xs font-bold text-c2-critical-text uppercase tracking-wider">
                      ⚠ RESPONSE PLAN COMPROMISED: {compromised.failedResourceName} FAILED
                    </div>
                    <div className="text-[11px] text-c2-text-muted font-mono">
                      Alternative: <strong className="text-c2-text">{compromised.alternativeRecommendation?.resourceName}</strong> (New ETA: {compromised.alternativeRecommendation?.newEtaMinutes} min, Delay: +{compromised.alternativeRecommendation?.delayImpactMinutes} min)
                    </div>
                  </div>
                </div>
                <button 
                  onClick={handleApproveRecovery}
                  className="px-3 py-1.5 bg-c2-critical hover:bg-red-700 text-c2-card font-mono text-xs font-bold rounded shadow-md transition shrink-0"
                >
                  APPROVE REASSIGNMENT
                </button>
              </div>
            )}
          </div>
        }
        rightPanel={
          <AICommandPanel
            incident={selectedIncident}
            recommendations={activeRecs}
            onApproveDispatch={handleApproveDispatch}
            onOpenMergeModal={handleOpenMergeModal}
            onOpenBriefingModal={() => setIsBriefingModalOpen(true)}
            onEscalateSeverity={handleEscalateCritical}
          />
        }
        bottomPanel={
          <div className="space-y-1 text-xs">
            {timeline.map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-c2-text py-0.5 border-b border-c2-border">
                <span className="text-c2-text-muted">{item.timestamp}</span>
                <span className="text-c2-accent font-semibold">[{item.category || item.type}]</span>
                <span>{item.description || item.title}</span>
              </div>
            ))}
          </div>
        }
      />

      {/* Event Notification Pop-up Modal */}
      <EventNotificationModal
        isOpen={eventModalState.isOpen}
        onClose={() => setEventModalState({ isOpen: false, eventData: null })}
        eventData={eventModalState.eventData}
      />

      {/* Duplicate / Merge Modal */}
      <DuplicateMergeModal
        isOpen={isMergeModalOpen}
        onClose={() => setIsMergeModalOpen(false)}
        primaryIncident={selectedIncident}
        candidateIncident={mergeTargetIncident}
        onMerge={handleConfirmMerge}
      />

      {/* Operational Briefing Modal */}
      <OperationalBriefingModal
        isOpen={isBriefingModalOpen}
        onClose={() => setIsBriefingModalOpen(false)}
        incident={selectedIncident}
      />

      {/* Alert Center Slide-out Drawer */}
      <AlertCenterDrawer />

      {/* Floating Tactical Toast Stack */}
      <ToastContainer />
    </>
  );
}
