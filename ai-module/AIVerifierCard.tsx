import React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Camera,
  Flame,
} from 'lucide-react';
import { AIVerificationResult } from './types.ts';

interface Props {
  verification: AIVerificationResult;
  compact?: boolean;
}

/**
 * Reusable, self-contained AI Verification & Severity Triage Card.
 * Displays only genuine forensic indicators: Real vs AI-Generated and Mapped Severity Tier.
 */
export const AIVerifierCard: React.FC<Props> = ({ verification, compact = false }) => {
  const {
    isAuthentic,
    authenticityScore,
    visualSeverity,
    severityScore,
    severityRationale,
    fraudFlag,
    fraudReason,
    verdict,
  } = verification;

  const getVerdictHeader = () => {
    switch (verdict) {
      case 'VERIFIED_REAL':
        return {
          icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />,
          title: 'Real Image Verified',
          subtitle: 'Authentic real-world camera capture confirmed by visual inspection.',
          badgeBg: 'bg-emerald-50/80 text-emerald-900 border-emerald-200',
        };
      case 'SUSPICIOUS_AI':
        return {
          icon: <ShieldAlert className="w-5 h-5 text-rose-600" />,
          title: 'AI-Generated / Synthetic Image Detected',
          subtitle: 'Anomalous diffusion artifacts or synthetic smoothing detected.',
          badgeBg: 'bg-rose-50/80 text-rose-900 border-rose-200',
        };
      case 'IRRELEVANT':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
          title: 'Irrelevant Image Warning',
          subtitle: 'Image does not clearly portray a municipal infrastructure issue.',
          badgeBg: 'bg-amber-50/80 text-amber-900 border-amber-200',
        };
      case 'NEEDS_INSPECTION':
      default:
        return {
          icon: <ShieldAlert className="w-5 h-5 text-orange-600" />,
          title: 'Flagged for Review',
          subtitle: fraudReason || 'Discrepancy detected during forensic evaluation.',
          badgeBg: 'bg-orange-50/80 text-orange-900 border-orange-200',
        };
    }
  };

  const headerInfo = getVerdictHeader();

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'Critical':
        return 'text-rose-700 bg-rose-100 border-rose-300';
      case 'High':
        return 'text-orange-700 bg-orange-100 border-orange-300';
      case 'Medium':
        return 'text-amber-700 bg-amber-100 border-amber-300';
      default:
        return 'text-blue-700 bg-blue-100 border-blue-300';
    }
  };

  if (compact) {
    return (
      <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${headerInfo.badgeBg}`}>
        <div className="flex items-center gap-2">
          {headerInfo.icon}
          <div>
            <span className="font-semibold">{headerInfo.title}</span>
            <div className="text-[11px] opacity-80">
              {isAuthentic ? `Real Capture (${authenticityScore}%)` : `AI-Generated (${100 - authenticityScore}%)`}
            </div>
          </div>
        </div>
        <span className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] border ${getSeverityColor(visualSeverity)}`}>
          Severity: {visualSeverity}
        </span>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border shadow-xs p-5 transition-all ${headerInfo.badgeBg}`}>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-black/10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-white shadow-xs">
            {headerInfo.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-slate-900 text-sm tracking-tight">{headerInfo.title}</h4>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                <Sparkles className="w-3 h-3" /> Gemini 3.8 Flash Vision
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">{headerInfo.subtitle}</p>
          </div>
        </div>

        <span className={`px-3 py-1 rounded-full font-bold text-xs uppercase tracking-wider border ${getSeverityColor(visualSeverity)}`}>
          AI Severity: {visualSeverity} ({severityScore}/100)
        </span>
      </div>

      {/* Fraud Alert Callout if Flagged */}
      {fraudFlag && (
        <div className="mt-3 p-3 rounded-xl bg-rose-100/90 border border-rose-300 text-rose-900 text-xs flex items-center gap-2 font-medium">
          <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{fraudReason || 'Report flagged as synthetic or unverified image.'}</span>
        </div>
      )}

      {/* Core AI Parameters: Image Origin + Mapped Severity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
        {/* Parameter 1: Image Authenticity (Real vs AI Generated) */}
        <div className="bg-white/90 backdrop-blur-xs p-3.5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
            <span className="flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-slate-400" /> Image Authenticity
            </span>
            <span className={`text-[11px] font-bold ${isAuthentic ? 'text-emerald-600' : 'text-rose-600'}`}>
              {isAuthentic ? 'Real Camera Capture' : 'AI-Generated / Synthetic'}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">{authenticityScore}%</span>
            <span className="text-xs text-slate-500 font-medium">Authenticity Score</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                authenticityScore >= 60 ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
              style={{ width: `${authenticityScore}%` }}
            />
          </div>
        </div>

        {/* Parameter 2: Mapped Visual Severity */}
        <div className="bg-white/90 backdrop-blur-xs p-3.5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
            <span className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-slate-400" /> Mapped Severity
            </span>
            <span className={`text-[11px] font-bold uppercase ${
              visualSeverity === 'Critical' ? 'text-rose-600' : visualSeverity === 'High' ? 'text-orange-600' : 'text-amber-600'
            }`}>
              {visualSeverity} Tier
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">{severityScore}/100</span>
            <span className="text-xs text-slate-500 font-medium">Hazard Score</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                severityScore >= 75
                  ? 'bg-rose-500'
                  : severityScore >= 50
                  ? 'bg-orange-500'
                  : severityScore >= 25
                  ? 'bg-amber-500'
                  : 'bg-blue-500'
              }`}
              style={{ width: `${severityScore}%` }}
            />
          </div>
        </div>
      </div>

      {/* Severity Assessment Rationale */}
      {severityRationale && severityRationale.length > 0 && (
        <div className="mt-3 pt-3 border-t border-black/10">
          <span className="text-[11px] font-bold text-slate-700 block mb-1.5">
            Severity Assessment Rationale:
          </span>
          <ul className="space-y-1 text-xs text-slate-700">
            {severityRationale.map((rat, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                <span>{rat}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AIVerifierCard;
