import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Copy, 
  Check, 
  Printer, 
  FileText, 
  ShieldAlert, 
  Layers 
} from 'lucide-react';
import { incidentsApi } from '../../services/api/incidentsApi';

export default function OperationalBriefingModal({
  isOpen,
  onClose,
  incident
}) {
  if (!isOpen || !incident) return null;

  const [briefingText, setBriefingText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchBriefing() {
      setIsLoading(true);
      try {
        const res = await incidentsApi.getBriefing(incident.id);
        if (isMounted && res.success) {
          setBriefingText(res.data.briefingMarkdown);
        }
      } catch (err) {
        console.error('Failed to load briefing:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    fetchBriefing();
    return () => { isMounted = false; };
  }, [incident.id]);

  const handleCopy = () => {
    navigator.clipboard.writeText(briefingText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 font-sans select-none animate-fadeIn">
      <div className="bg-c2-card border border-c2-border rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-c2-ai-bg/40 px-6 py-4 border-b border-c2-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-c2-ai-bg border border-c2-ai-border flex items-center justify-center text-c2-ai">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-mono text-sm font-bold text-c2-ai-text uppercase tracking-wider flex items-center gap-2">
                AI OPERATIONAL SITUATION BRIEFING
              </h3>
              <p className="text-xs text-c2-text-muted">
                Executive synthesized C2 briefing for Incident #{incident.id}
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
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="py-12 text-center font-mono text-xs text-c2-text-muted animate-pulse">
              Generating executive situation briefing with AI Copilot...
            </div>
          ) : (
            <div className="bg-c2-paper border border-c2-border p-5 rounded-lg font-mono text-xs text-c2-text space-y-3 leading-relaxed whitespace-pre-wrap select-text">
              {briefingText}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-c2-surface px-6 py-3 border-t border-c2-border flex items-center justify-between">
          <div className="text-[11px] font-mono text-c2-text-muted">
            Generated: {new Date().toLocaleTimeString()} • SURGE C2 AI Engine
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg border border-c2-border bg-c2-card hover:bg-c2-surface text-c2-text font-mono text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>

            <button
              onClick={handleCopy}
              className="px-4 py-1.5 rounded-lg bg-c2-accent hover:bg-blue-700 text-c2-card font-mono text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'COPIED TO CLIPBOARD' : 'COPY BRIEFING'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
