import React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Sparkles,
  MapPin,
  CheckCircle2,
  Cpu,
  Layers,
  Activity,
} from 'lucide-react';
import { AIVerificationResult } from '../types';

interface Props {
  verification: AIVerificationResult;
  compact?: boolean;
}

export const AIVerificationCard: React.FC<Props> = ({ verification, compact = false }) => {
  const {
    isAuthentic,
    authenticityScore,
    isRelevant,
    relevanceScore,
    aiGeneratedProbability,
    detectedObjects,
    visualSeverity,
    severityScore,
    severityRationale,
    corroboratingReportsCount,
    spatialClusterInfo,
    fraudFlag,
    fraudReason,
    verdict,
  } = verification;

  const getVerdictHeader = () => {
    switch (verdict) {
      case 'VERIFIED_REAL':
        return {
          icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />,
          title: 'Genuine Photographic Evidence Verified',
          subtitle: 'Natural sensor noise, optical lens grain, and authentic road grit confirmed.',
          badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        };
      case 'SUSPICIOUS_AI':
        return {
          icon: <ShieldAlert className="w-5 h-5 text-rose-600" />,
          title: 'High Risk: AI-Generated / Synthetic Photo Detected',
          subtitle: 'Diffusion smoothing, procedural pattern repetition, or surreal lighting artifacts found.',
          badgeBg: 'bg-rose-50 text-rose-800 border-rose-200',
        };
      case 'IRRELEVANT':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
          title: 'Low Relevance Warning',
          subtitle: 'Uploaded photo does not visibly represent the reported municipal issue category.',
          badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
        };
      case 'NEEDS_INSPECTION':
      default:
        return {
          icon: <ShieldAlert className="w-5 h-5 text-orange-600" />,
          title: 'Flagged for Fraud / Review',
          subtitle: fraudReason || 'Discrepancy detected with coordinates, duplicates, or image authenticity.',
          badgeBg: 'bg-orange-50 text-orange-800 border-orange-200',
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
              Credibility: {authenticityScore}% • Relevance: {relevanceScore}%
            </div>
          </div>
        </div>
        <span className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] border ${getSeverityColor(visualSeverity)}`}>
          AI Triage: {visualSeverity}
        </span>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border shadow-sm p-5 transition-all ${headerInfo.badgeBg}`}>
      {/* Header Banner */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-black/10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-white shadow-xs">
            {headerInfo.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-slate-900 text-sm tracking-tight">{headerInfo.title}</h4>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                <Sparkles className="w-3 h-3" /> Gemini 3.8 Flash + Forensics
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">{headerInfo.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full font-bold text-xs uppercase tracking-wider border ${getSeverityColor(visualSeverity)}`}>
            AI Severity: {visualSeverity} ({severityScore}/100)
          </span>
        </div>
      </div>

      {/* Fraud Alert Callout if Flagged */}
      {fraudFlag && (
        <div className="mt-3 p-3 rounded-xl bg-rose-100/80 border border-rose-300 text-rose-900 text-xs flex items-center gap-2 font-medium">
          <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{fraudReason || 'Report flagged by automated fraud heuristics for administrative inspection.'}</span>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        {/* Metric 1: Authenticity */}
        <div className="bg-white/80 backdrop-blur-xs p-3 rounded-xl border border-slate-200/80">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1">
            <span>Authenticity</span>
            <Cpu className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-slate-900">{authenticityScore}%</span>
            <span className="text-[11px] font-medium text-emerald-600">
              {aiGeneratedProbability < 25 ? 'Camera Real' : 'AI Risk'}
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                authenticityScore > 70 ? 'bg-emerald-500' : authenticityScore > 40 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${authenticityScore}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Relevance */}
        <div className="bg-white/80 backdrop-blur-xs p-3 rounded-xl border border-slate-200/80">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1">
            <span>Issue Relevance</span>
            <Layers className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-slate-900">{relevanceScore}%</span>
            <span className="text-[11px] font-medium text-indigo-600">
              {isRelevant ? 'Matches Topic' : 'Off-Topic'}
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full ${relevanceScore > 70 ? 'bg-indigo-500' : 'bg-amber-500'}`}
              style={{ width: `${relevanceScore}%` }}
            />
          </div>
        </div>

        {/* Metric 3: AI Synthetic Prob */}
        <div className="bg-white/80 backdrop-blur-xs p-3 rounded-xl border border-slate-200/80">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1">
            <span>Synthetic AI Risk</span>
            <Activity className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-slate-900">{aiGeneratedProbability}%</span>
            <span className="text-[11px] font-medium text-slate-500">Diffusion</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                aiGeneratedProbability > 50 ? 'bg-rose-500' : aiGeneratedProbability > 20 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${aiGeneratedProbability}%` }}
            />
          </div>
        </div>

        {/* Metric 4: Spatial Corroboration */}
        <div className="bg-white/80 backdrop-blur-xs p-3 rounded-xl border border-slate-200/80">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1">
            <span>Nearby Cluster</span>
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-slate-900">{corroboratingReportsCount}</span>
            <span className="text-[11px] font-medium text-slate-600">Reports</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1 truncate" title={spatialClusterInfo}>
            {corroboratingReportsCount > 0 ? 'Corroborated (<600m)' : 'Single report'}
          </p>
        </div>
      </div>

      {/* Detected Objects Tags */}
      {detectedObjects && detectedObjects.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-slate-600 mr-1">Visual Entities:</span>
          {detectedObjects.map((obj, i) => (
            <span
              key={i}
              className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[11px] font-medium shadow-2xs"
            >
              ✓ {obj}
            </span>
          ))}
        </div>
      )}

      {/* Severity Rationale Bullets */}
      {severityRationale && severityRationale.length > 0 && (
        <div className="mt-3 pt-3 border-t border-black/10">
          <span className="text-[11px] font-bold text-slate-700 block mb-1">AI Severity Assessment Rationale:</span>
          <ul className="space-y-1 text-xs text-slate-600">
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
