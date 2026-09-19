import React from 'react';
import { ShieldCheck } from 'lucide-react';

export default function ConfidenceScore({ score = 85, showIcon = true }) {
  const numScore = typeof score === 'number' ? score : parseInt(score, 10) || 85;
  
  let color = 'text-c2-ai-text border-c2-ai-border bg-c2-ai-bg';
  if (numScore >= 90) color = 'text-c2-low-text border-c2-low-border bg-c2-low-bg';
  else if (numScore >= 75) color = 'text-c2-ai-text border-c2-ai-border bg-c2-ai-bg';
  else color = 'text-c2-medium-text border-c2-medium-border bg-c2-medium-bg';

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border ${color} font-mono text-[11px]`}>
      {showIcon && <ShieldCheck className="w-3.5 h-3.5" />}
      <span className="font-semibold">{numScore}%</span>
      <span className="text-[9px] uppercase tracking-tighter opacity-80">CONF</span>
    </div>
  );
}
