import React, { useState } from 'react';
import {
  X,
  Presentation,
  CheckCircle2,
  HelpCircle,
  Play,
  Layers,
  Award,
  Shield,
  Clock,
  Sparkles,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const PitchModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'pitch' | 'demo' | 'qa' | 'architecture'>('pitch');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <Presentation className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">CivicPulse • Hackathon Pitch Deck</h2>
                <span className="text-xs bg-teal-900 text-teal-300 font-semibold px-2 py-0.5 rounded border border-teal-700">
                  30-Hour Build
                </span>
              </div>
              <p className="text-xs text-slate-400">Track: Civic Tech & Municipal Governance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-2">
          <button
            onClick={() => setActiveTab('pitch')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'pitch'
                ? 'border-teal-600 text-teal-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Award className="w-4 h-4" />
            1. Problem & Solution
          </button>
          <button
            onClick={() => setActiveTab('demo')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'demo'
                ? 'border-teal-600 text-teal-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Play className="w-4 h-4" />
            2. 2-Min Live Demo Script
          </button>
          <button
            onClick={() => setActiveTab('qa')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'qa'
                ? 'border-teal-600 text-teal-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            3. Judge Q&A (5 Defenses)
          </button>
          <button
            onClick={() => setActiveTab('architecture')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'architecture'
                ? 'border-teal-600 text-teal-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            4. Architecture & Team
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-800 text-sm">
          {activeTab === 'pitch' && (
            <div className="space-y-6">
              <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-800">Problem Statement</span>
                <p className="text-base font-semibold text-slate-900 mt-1">
                  "Citizens feel ignored by bureaucratic municipal grievance portals that act as black boxes, while overworked city departments lack objective, rule-based urgency triage to prioritize dangerous hazards over cosmetic complaints."
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">The CivicPulse Solution</span>
                <p className="text-slate-700 mt-1">
                  CivicPulse bridges citizens and local government with a transparent, two-sided civic resolution system. Citizens report verified issues with geolocation and track resolution through auditable status timelines with before-and-after photographic evidence. Authorized officials manage triage through a smart, explainable priority recommendation engine and public accountability dashboards.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold mb-2">
                    1
                  </div>
                  <h4 className="font-semibold text-slate-900 mb-1">Explainable Smart Triage</h4>
                  <p className="text-xs text-slate-600">
                    Transparent rule engine weighs bodily hazard risk, community upvote density, and SLA aging—allowing officials to review and override with public justification.
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold mb-2">
                    2
                  </div>
                  <h4 className="font-semibold text-slate-900 mb-1">Total Auditability</h4>
                  <p className="text-xs text-slate-600">
                    Every status update, department handoff, and official note logs the acting official and timestamp, separating internal ops notes from public citizen updates.
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold mb-2">
                    3
                  </div>
                  <h4 className="font-semibold text-slate-900 mb-1">Community Validation</h4>
                  <p className="text-xs text-slate-600">
                    Citizens endorse existing reports to highlight widespread neighborhood impact, reducing duplicate submissions and spotlighting urgent clusters.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide mb-1">
                  Realistic Limitations & Roadmap
                </h4>
                <ul className="text-xs text-amber-800 list-disc list-inside space-y-1">
                  <li>Current demo uses persistent schematized SQLite-ready storage; production migration targets Cloud SQL PostgreSQL.</li>
                  <li>SLA deadlines are simulated municipal targets and do not promise legally binding municipal repair windows.</li>
                  <li>Next milestone: Automated computer-vision duplicate photo clustering and municipal work-order ERP integration (Cityworks/Open311).</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'demo' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-800">
                <Clock className="w-4 h-4 text-teal-600" />
                <span className="font-semibold">Recommended 2-Minute Judge Walkthrough Sequence:</span>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 bg-white border border-slate-200 rounded-xl">
                  <span className="text-xs font-bold text-teal-700 uppercase">Step 1 (0:00 - 0:30) • Citizen Submission Flow</span>
                  <p className="text-xs text-slate-700 mt-1">
                    As Citizen Aisha Chen, click <strong>"Report an Issue"</strong>. Fill in a real street issue (e.g. Broken Water Main on 5th Ave). Toggle <strong>"Immediate Public Safety Risk"</strong>. Show how the Smart Rule Engine immediately explains why it recommends a Critical priority. Submit and copy the generated reference ID (e.g., <strong>CP-2026-017</strong>).
                  </p>
                </div>

                <div className="p-3.5 bg-white border border-slate-200 rounded-xl">
                  <span className="text-xs font-bold text-blue-700 uppercase">Step 2 (0:30 - 1:00) • Tracking & Public Accountability</span>
                  <p className="text-xs text-slate-700 mt-1">
                    Open <strong>"Track Complaint"</strong>. Paste the reference code. Notice the instant status timeline, assigned department ("Water Supply Board"), and SLA target timer. Point out how internal official notes are strictly hidden from citizens while public updates are transparent.
                  </p>
                </div>

                <div className="p-3.5 bg-white border border-slate-200 rounded-xl">
                  <span className="text-xs font-bold text-purple-700 uppercase">Step 3 (1:00 - 1:30) • Municipal Officer Workstation</span>
                  <p className="text-xs text-slate-700 mt-1">
                    Use the Top Bar role selector to switch to <strong>"Director Marcus Vance (Public Works)"</strong>. Go to <strong>"Official Dashboard"</strong>. Show the prioritized queue with SLA badges. Open the complaint, update status to <strong>"In Progress"</strong> with a work order dispatch note, or override priority with auditable rationale.
                  </p>
                </div>

                <div className="p-3.5 bg-white border border-slate-200 rounded-xl">
                  <span className="text-xs font-bold text-emerald-700 uppercase">Step 4 (1:30 - 2:00) • Public Map & Transparency KPI Dashboard</span>
                  <p className="text-xs text-slate-700 mt-1">
                    Visit <strong>"Civic Map"</strong> to view real geographic pin clusters with OpenStreetMap. Then open <strong>"Transparency"</strong> to show actual calculated resolution times, category distributions, and department performance index computed strictly from live records!
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'qa' && (
            <div className="space-y-3">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <h4 className="font-semibold text-slate-900 text-sm">
                  1. "Why not just use an existing 311 app or Google Form?"
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                  Existing 311 systems are infamous dead-ends where tickets disappear without accountability or before-and-after photo verification. CivicPulse provides a two-sided accountability loop: citizens see live progress and community endorsements, while officials get automated risk-weighted prioritization rather than first-in-first-out bottlenecks.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <h4 className="font-semibold text-slate-900 text-sm">
                  2. "Is your priority recommendation really AI, or rule-based?"
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                  It is an explicit, explainable <strong>rule-based prioritization engine</strong>, not a black-box LLM. In civic governance, life-safety triage must be completely auditable, deterministic, and explainable to public ombudsmen. Officials can inspect the exact score breakdown and override it with signed justification.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <h4 className="font-semibold text-slate-900 text-sm">
                  3. "How do you prevent spam, trolls, or fake complaints?"
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                  We enforce server-validated user authentication, browser geolocation pinning, deduplicated single-vote community endorsement constraints, and an official 'Rejected' status with required justification notes for fraudulent or out-of-scope reports.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <h4 className="font-semibold text-slate-900 text-sm">
                  4. "Can citizens see confidential government notes?"
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                  No. Our Express API backend enforces strict visibility boundaries at the database query layer (`visibility === 'public'`), ensuring internal worker safety warnings, contractor billing codes, and administrative notes never leak to citizen endpoints.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <h4 className="font-semibold text-slate-900 text-sm">
                  5. "How would you scale this past this 30-hour hackathon?"
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                  The relational schema is already designed for zero-migration transition to PostgreSQL/Cloud SQL. Production additions include Open311 standard API connectors, automated reverse geocoding for exact street addresses, and SMS notification dispatch via Twilio.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'architecture' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Frontend Stack</span>
                  <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                    <li>React 19 + TypeScript with strict types</li>
                    <li>Tailwind CSS v4 for clean, responsive civic styling</li>
                    <li>Leaflet & OpenStreetMap for geographic visualization</li>
                    <li>Lucide React iconography & accessible contrast</li>
                  </ul>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Backend & Data</span>
                  <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                    <li>Node.js + Express REST API on port 3000</li>
                    <li>Schematized relational store (`server/db.ts`) with ACID atomic file commits</li>
                    <li>Smart rule-based priority engine (`server/priorityEngine.ts`)</li>
                    <li>Role-based access control protecting official mutations</li>
                  </ul>
                </div>
              </div>

              <div className="p-4 bg-slate-900 text-slate-200 rounded-xl font-mono text-xs">
                <div className="text-teal-400 font-bold mb-1">Team Ownership Matrix (4 Members):</div>
                <div>• Member 1 (Frontend & Design): Citizen reporting UX, Leaflet map integration, responsive layouts</div>
                <div>• Member 2 (Backend Engineering): Express REST API, RBAC validation, upload handler</div>
                <div>• Member 3 (Data & Analytics): Relational schema, seed dataset, KPI calculations, SLA counters</div>
                <div>• Member 4 (Integration & Presentation): Official workstation, audit timeline, pitch guide</div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 px-6 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            CivicPulse Hackathon Edition • Prepared for Demo Evaluation
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            Close Deck
          </button>
        </div>
      </div>
    </div>
  );
};
