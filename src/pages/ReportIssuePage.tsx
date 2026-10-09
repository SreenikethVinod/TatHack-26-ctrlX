import React, { useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Copy,
  MapPin,
  Navigation,
  Send,
  Sparkles,
  Upload,
  ArrowRight,
  ShieldAlert,
  Info,
  Construction,
  Trash2,
  Waves,
  Lightbulb,
  Droplets,
  HelpCircle,
  Lock,
} from 'lucide-react';
import { api } from '../lib/api';
import { ComplaintCategory, PriorityLevel, PhotoVerificationMetadata, AIVerificationResult } from '../types';
import { useAuth } from '../context/AuthContext';
import { detectRealLocation, reverseGeocodeCoordinates } from '../lib/geo';
import { InAppCameraCapture } from '../components/InAppCameraCapture';
import { AIVerifierCard } from '../../ai-module/AIVerifierCard.tsx';

interface Props {
  onSuccessNavigate: (reference: string) => void;
  onExploreNavigate: () => void;
}

export const ReportIssuePage: React.FC<Props> = ({ onSuccessNavigate, onExploreNavigate }) => {
  const { currentUser } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ComplaintCategory>('road_damage');
  const [otherCategoryDetail, setOtherCategoryDetail] = useState('');
  const [address, setAddress] = useState('');
  const [locality, setLocality] = useState('');
  const [landmark, setLandmark] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [safetyRisk, setSafetyRisk] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Success state container
  const [createdRef, setCreatedRef] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [photoFingerprint, setPhotoFingerprint] = useState<string | null>(null);
  const [photoMetadata, setPhotoMetadata] = useState<PhotoVerificationMetadata | null>(null);
  const [isFlaggedMismatch, setIsFlaggedMismatch] = useState<boolean>(false);
  const [photoDistanceMeters, setPhotoDistanceMeters] = useState<number | null>(null);
  const [mergeInfo, setMergeInfo] = useState<{
    autoMerged: boolean;
    canonicalReference: string | null;
    message: string;
  } | null>(null);

  // AI Module Forensics & Triage State
  const [aiVerification, setAiVerification] = useState<AIVerificationResult | null>(null);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);

  const handleRunAIVerification = async (imgToVerify?: string) => {
    const photo = imgToVerify !== undefined ? imgToVerify : imageUrl;
    setAiAnalyzing(true);
    try {
      const res = await api.verifyWithAI({
        title: title || 'Municipal infrastructure issue',
        description: description || 'Civic issue report',
        category,
        imageUrl: photo || undefined,
        safetyRisk,
      });
      if (res && res.verification) {
        setAiVerification(res.verification);
      }
    } catch (err) {
      console.warn('AI verification transient error:', err);
    } finally {
      setAiAnalyzing(false);
    }
  };

  const categories = [
    {
      id: 'road_damage' as ComplaintCategory,
      title: 'Road & Pavement',
      desc: 'Potholes, cracks, damaged asphalt, faded crosswalks',
      Icon: Construction,
    },
    {
      id: 'waste_management' as ComplaintCategory,
      title: 'Waste & Sanitation',
      desc: 'Overflowing dumpsters, illegal trash dumping, litter',
      Icon: Trash2,
    },
    {
      id: 'drainage' as ComplaintCategory,
      title: 'Drainage & Stormwater',
      desc: 'Clogged grates, flooding, standing sewer overflow',
      Icon: Waves,
    },
    {
      id: 'streetlights' as ComplaintCategory,
      title: 'Lighting & Signals',
      desc: 'Dark streetlights, malfunctioning traffic signals',
      Icon: Lightbulb,
    },
    {
      id: 'water_supply' as ComplaintCategory,
      title: 'Water Supply',
      desc: 'Burst mains, dirty tap water, leaking hydrants',
      Icon: Droplets,
    },
    {
      id: 'public_safety' as ComplaintCategory,
      title: 'Safety Infrastructure',
      desc: 'Broken guardrails, exposed wiring, open manholes',
      Icon: AlertTriangle,
    },
    {
      id: 'other' as ComplaintCategory,
      title: 'Other Civic Issue',
      desc: 'Parks, encroachments, noise, or unlisted issues',
      Icon: HelpCircle,
    },
  ];

  // Geolocation trigger
  const handleDetectLocation = async () => {
    setLocating(true);
    setErrorMsg(null);
    try {
      const geo = await detectRealLocation();
      setLatitude(geo.latitude);
      setLongitude(geo.longitude);
      setAddress(geo.address);
      if (geo.locality) {
        setLocality(geo.locality);
      }
    } catch (err: any) {
      console.warn('Geolocation error:', err);
      alert(err.message || 'Could not retrieve your location. Please enter your street address manually.');
    } finally {
      setLocating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim() || title.trim().length < 5) {
      setErrorMsg('Please enter a descriptive title of at least 5 characters.');
      return;
    }

    if (!description.trim() || description.trim().length < 10) {
      setErrorMsg('Please provide a detailed description (at least 10 characters) to assist field technicians.');
      return;
    }

    const composedAddress = landmark.trim()
      ? (address.trim() ? `${address.trim()} (Near: ${landmark.trim()})` : `Landmark: ${landmark.trim()}`)
      : address.trim();

    if (!composedAddress || composedAddress.length < 3) {
      setErrorMsg('Please capture a photo below to auto-detect location, or specify a nearby landmark.');
      return;
    }

    if (category === 'other' && !otherCategoryDetail.trim()) {
      setErrorMsg('Please specify what kind of other issue this is.');
      return;
    }

    setSubmitting(true);
    try {
      const finalDesc =
        category === 'other' && otherCategoryDetail.trim()
          ? `[Custom Category: ${otherCategoryDetail.trim()}]\n\n${description.trim()}`
          : description.trim();

      const response = await api.createComplaint({
        title: title.trim(),
        description: finalDesc,
        category,
        address: composedAddress,
        locality: locality.trim() || 'Metro District',
        latitude,
        longitude,
        imageUrl: imageUrl || undefined,
        safetyRisk,
        photoFingerprint: photoFingerprint || null,
        photoMetadata: photoMetadata || null,
        photoDistanceMeters,
        isFlaggedLocationMismatch: isFlaggedMismatch,
        locationMatchStatus: imageUrl ? (isFlaggedMismatch ? 'FLAGGED_MISMATCH' : 'VERIFIED') : 'NO_PHOTO',
      });

      if (response.success && response.complaint) {
        setCreatedRef(response.complaint.reference);
        if (response.autoMerged && response.canonicalReference) {
          setMergeInfo({
            autoMerged: true,
            canonicalReference: response.canonicalReference,
            message: response.message,
          });
        }
      } else {
        setErrorMsg('Failed to record submission. Please check inputs.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Submission error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyRef = () => {
    if (!createdRef) return;
    navigator.clipboard.writeText(createdRef);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Dynamic Rule-Based Priority Preview
  const getRulePreview = (): { level: PriorityLevel; reason: string } => {
    if (safetyRisk || category === 'public_safety') {
      return {
        level: 'Critical',
        reason: 'Immediate safety hazard flag applied. SLA Target: 24 Hours.',
      };
    }
    if (category === 'water_supply' || category === 'drainage') {
      return {
        level: 'High',
        reason: 'Public utility disruption baseline. SLA Target: 48 Hours.',
      };
    }
    return {
      level: 'Medium',
      reason: 'Standard municipal turnaround queue. SLA Target: 72 Hours.',
    };
  };

  const preview = getRulePreview();

  // If successfully submitted, show clean confirmation card
  if (createdRef) {
    return (
      <div className="max-w-xl mx-auto py-10 px-4">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto ring-8 ring-emerald-50">
            <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Complaint Registered Successfully
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900 mt-3">
              Your Report is in the Municipal Queue
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Your issue has been routed to the relevant municipal department and assigned an audit tracking ID.
            </p>
          </div>

          {/* Reference Card */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
            <div className="text-left">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Complaint Reference</span>
              <div className="font-mono text-xl font-black text-slate-900">{createdRef}</div>
            </div>
            <button
              onClick={handleCopyRef}
              className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>
          </div>

          {/* Spatial Auto-Merge Banner */}
          {mergeInfo?.autoMerged && (
            <div className="p-4 bg-purple-50/90 border-2 border-purple-200 rounded-2xl text-left space-y-2.5 animate-in fade-in">
              <div className="flex items-center gap-2 text-purple-950 font-extrabold text-xs sm:text-sm">
                <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                <span>Automatic Spatial Merge (~50m Across Road)</span>
              </div>
              <p className="text-xs text-purple-900 leading-relaxed">
                Another resident reported the same problem across the road. Both reports are automatically clustered into canonical ticket <strong className="font-mono text-purple-950 font-bold bg-purple-100 px-1.5 py-0.5 rounded border border-purple-200">{mergeInfo.canonicalReference}</strong> to pool community urgency and eliminate duplicate contractor visits!
              </p>
              <div className="flex items-center gap-2 text-[11px] text-purple-800 bg-white/80 p-2.5 rounded-xl border border-purple-100 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>You are automatically subscribed as a follower. You will receive notifications whenever this issue is updated.</span>
              </div>
            </div>
          )}

          {/* Photo Verification Banner */}
          {imageUrl && (
            <div
              className={`p-4 rounded-2xl border text-left space-y-1.5 ${
                isFlaggedMismatch
                  ? 'bg-rose-50 border-rose-200 text-rose-950'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-950'
              }`}
            >
              <div className="flex items-center gap-2 font-extrabold text-xs">
                {isFlaggedMismatch ? (
                  <>
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>⚠️ Camera Photo Flagged: Location Discrepancy</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>✅ Live In-App Camera Photo Verified On-Site</span>
                  </>
                )}
              </div>
              <p className="text-xs leading-relaxed">
                {isFlaggedMismatch
                  ? `Photo was captured ${
                      photoDistanceMeters && photoDistanceMeters > 1000
                        ? `${(photoDistanceMeters / 1000).toFixed(1)} km`
                        : `${photoDistanceMeters || 0} meters`
                    } away from the selected pin. Flagged for officer physical audit.`
                  : 'Photo sensor coordinates match your incident pin. Cryptographic fingerprint recorded in public municipal ledger.'}
              </p>
              {photoFingerprint && (
                <div className="font-mono text-[10px] text-slate-500 pt-1 truncate">
                  SHA-256: <span className="text-slate-800">{photoFingerprint}</span>
                </div>
              )}
            </div>
          )}

          {/* AI Forensics & Severity Verdict Card */}
          {aiVerification && (
            <div className="space-y-1.5 text-left">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>AI Forensics &amp; Severity Assessment</span>
              </span>
              <AIVerifierCard verification={aiVerification} compact />
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-3 pt-2">
            <button
              onClick={() => onSuccessNavigate(createdRef)}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Track Resolution Progress Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                setCreatedRef(null);
                setTitle('');
                setDescription('');
                setAddress('');
                setImageUrl('');
                setSafetyRisk(false);
              }}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Submit Another Civic Report
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-8">
      {/* Page Title */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-teal-600 uppercase tracking-wider mb-1">
          <Send className="w-3.5 h-3.5" />
          <span>Municipal Citizen Service</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Report a Local Civic Issue
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Submit potholes, broken streetlights, waste overflow, or utility damage directly to municipal services with verifiable photo evidence.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Submission Form */}
      <form onSubmit={handleSubmit} className="syntrix-card p-6 sm:p-8 bg-white space-y-6">
        {/* Category Picker */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            1. Select Issue Category <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {categories.map((cat) => {
              const isSelected = category === cat.id;
              const Icon = cat.Icon;
              return (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`p-3 rounded-xl border text-left transition-colors flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-500'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-indigo-600' : 'text-slate-600'}`} />
                  <div>
                    <div className="text-xs font-bold text-slate-900">{cat.title}</div>
                    <div className="text-[10px] text-slate-500 line-clamp-1">{cat.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Conditional field for Other category */}
          {category === 'other' && (
            <div className="mt-3 p-4 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-1.5 animate-in fade-in duration-200">
              <label className="block text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-indigo-600" />
                <span>Specify Issue Type / What is the issue? <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Broken park playground swing, Illegal sidewalk commercial hoarding, Encroachment, etc."
                value={otherCategoryDetail}
                onChange={(e) => setOtherCategoryDetail(e.target.value)}
                className="w-full text-xs sm:text-sm bg-white border border-indigo-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-slate-900 placeholder-slate-400"
              />
              <p className="text-[11px] text-indigo-700">
                Tell us specifically what civic problem isn't covered in the standard categories above.
              </p>
            </div>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            2. Issue Headline / Title <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Hazardous 6-inch pothole in school zone crosswalk"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-sm border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 placeholder-slate-400"
          />
        </div>

        {/* Detailed Description */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            3. Detailed Description <span className="text-rose-500">*</span>
          </label>
          <textarea
            required
            rows={3}
            placeholder="Describe the severity, exact landmark, and how it impacts pedestrians or vehicles..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full text-sm border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 placeholder-slate-400"
          />
        </div>

        {/* 4. Location Section */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              4. Physical Location &amp; Landmark
            </label>
            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={locating}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Navigation className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
              <span>{locating ? 'Detecting...' : 'Quick Device GPS'}</span>
            </button>
          </div>

          {/* Greyed out Physical Location (Autofilled from Image Metadata) */}
          <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Physical Location (Auto-Filled from Photo GPS)</span>
              </span>
              {address ? (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Auto-Detected &amp; Locked</span>
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 font-medium">
                  Take photo below to auto-fill
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  readOnly
                  disabled
                  placeholder="📸 Will auto-populate from photo camera metadata..."
                  value={address}
                  className="w-full text-xs sm:text-sm bg-slate-100 text-slate-700 font-medium border border-slate-300 rounded-xl px-3.5 py-2.5 cursor-not-allowed select-all placeholder-slate-400 shadow-inner"
                />
              </div>
              <div>
                <input
                  type="text"
                  readOnly
                  disabled
                  placeholder="Ward / Locality"
                  value={locality}
                  className="w-full text-xs sm:text-sm bg-slate-100 text-slate-700 font-medium border border-slate-300 rounded-xl px-3.5 py-2.5 cursor-not-allowed select-all placeholder-slate-400 shadow-inner"
                />
              </div>
            </div>

            {latitude && longitude ? (
              <div className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Sensor Pin: {latitude.toFixed(5)}, {longitude.toFixed(5)}</span>
                </div>
                <span className="font-bold text-[10px] text-emerald-700">GPS Locked</span>
              </div>
            ) : (
              <p className="text-[10px] text-slate-400 italic">
                The exact street address and coordinates will be automatically extracted from your camera capture below.
              </p>
            )}
          </div>

          {/* User-editable Landmark Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              Nearby Landmark / Local Proximity <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Near the statue, opposite campus gate 3, beside blue pharmacy..."
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              className="w-full text-xs sm:text-sm bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 placeholder-slate-400 text-slate-900 shadow-2xs"
            />
            <p className="text-[11px] text-slate-500">
              Provide visual landmarks (statue, campus gate, pillar number, building name) so ground crews locate the issue immediately.
            </p>
          </div>
        </div>

        {/* Safety Risk Toggle with Smart Rule Engine Rationale Preview */}
        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                  Immediate Public Safety Risk?
                </h4>
                <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                  Toggle this if this hazard poses an immediate danger of bodily injury, collision, or electrical shock.
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={safetyRisk}
                onChange={(e) => setSafetyRisk(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600" />
            </label>
          </div>

          {/* Transparent Rule-Engine Explanation preview */}
          <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-amber-900">
              <Info className="w-3.5 h-3.5 text-amber-700" />
              <span>Smart Triage Recommendation:</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                preview.level === 'Critical'
                  ? 'bg-rose-600 text-white'
                  : preview.level === 'High'
                  ? 'bg-orange-100 text-orange-900 border border-orange-300'
                  : 'bg-amber-100 text-amber-900'
              }`}
            >
              {preview.level} Priority
            </span>
          </div>
          <p className="text-[11px] text-amber-800 italic">{preview.reason}</p>
        </div>

        {/* 5. Live In-App Camera Evidence Capture */}
        <InAppCameraCapture
          reportedLatitude={latitude}
          reportedLongitude={longitude}
          reportedAddress={address}
          existingImageUrl={imageUrl}
          existingMetadata={photoMetadata}
          onPhotoCaptured={async ({ imageUrl, photoFingerprint, photoMetadata, isFlaggedMismatch, distanceMeters }) => {
            setImageUrl(imageUrl);
            setPhotoFingerprint(photoFingerprint);
            setPhotoMetadata(photoMetadata);
            setIsFlaggedMismatch(isFlaggedMismatch);
            setPhotoDistanceMeters(distanceMeters);

            // Automatically extract and autofill physical location from camera image GPS metadata!
            if (photoMetadata.deviceGps) {
              const pLat = photoMetadata.deviceGps.latitude;
              const pLng = photoMetadata.deviceGps.longitude;
              setLatitude(pLat);
              setLongitude(pLng);
              try {
                const geo = await reverseGeocodeCoordinates(pLat, pLng);
                if (geo.address) setAddress(geo.address);
                if (geo.locality) setLocality(geo.locality);
              } catch (err) {
                console.warn('Auto reverse geocoding warning:', err);
                setAddress(`GPS Pin: ${pLat.toFixed(5)}, ${pLng.toFixed(5)}`);
              }
            }
            // Run AI Forensics & Triage immediately on captured photo
            handleRunAIVerification(imageUrl);
          }}
          onPhotoCleared={() => {
            setImageUrl('');
            setPhotoFingerprint(null);
            setPhotoMetadata(null);
            setIsFlaggedMismatch(false);
            setPhotoDistanceMeters(null);
            setAiVerification(null);
          }}
        />

        {/* 6. AI Forensics & Severity Triage (ai-module) */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-indigo-100 text-indigo-700">
                <Sparkles className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  AI Image Forensics &amp; Severity Triage
                </h4>
                <p className="text-[11px] text-slate-500">
                  Detects real camera photos vs synthetic AI tampering &amp; calculates municipal priority score
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleRunAIVerification()}
              disabled={aiAnalyzing}
              className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shrink-0 self-start sm:self-auto"
            >
              <Sparkles className={`w-3.5 h-3.5 ${aiAnalyzing ? 'animate-spin text-indigo-600' : ''}`} />
              <span>{aiAnalyzing ? 'Analyzing Image...' : aiVerification ? 'Re-Analyze with AI' : 'Run AI Inspection'}</span>
            </button>
          </div>

          {aiAnalyzing && (
            <div className="p-5 rounded-2xl bg-indigo-50/60 border border-indigo-200 text-center space-y-2 animate-in fade-in">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="text-xs font-bold text-indigo-950">
                Running Gemini Vision Forensics &amp; Severity Model...
              </div>
              <div className="text-[11px] text-indigo-700">
                Evaluating optical sensor grain, diffusion artifacts, and calculating safety hazard scores.
              </div>
            </div>
          )}

          {aiVerification && !aiAnalyzing && (
            <div className="animate-in fade-in duration-200">
              <AIVerifierCard verification={aiVerification} />
            </div>
          )}
        </div>

        {/* Reporter info */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div>
            Submitting as verified citizen: <strong className="text-slate-900">{currentUser?.name}</strong> ({currentUser?.email})
          </div>
          <span className="text-[10px] font-mono text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 font-bold">
            Audit Linked
          </span>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {submitting ? (
              <span>Saving Complaint to City Database...</span>
            ) : (
              <>
                <Send className="w-4 h-4 stroke-[2.5]" />
                <span>Submit Complaint to CivicPulse</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
