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
} from 'lucide-react';
import { api } from '../lib/api';
import { ComplaintCategory, PriorityLevel } from '../types';
import { useAuth } from '../context/AuthContext';

interface Props {
  onSuccessNavigate: (reference: string) => void;
  onExploreNavigate: () => void;
}

export const ReportIssuePage: React.FC<Props> = ({ onSuccessNavigate, onExploreNavigate }) => {
  const { currentUser } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ComplaintCategory>('road_damage');
  const [address, setAddress] = useState('');
  const [locality, setLocality] = useState('Central Metro');
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
  ];

  // Preset sample photos for rapid demonstration
  const sampleImages = [
    {
      label: 'Deep Pothole',
      url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
    },
    {
      label: 'Dumpster Overflow',
      url: 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=800&q=80',
    },
    {
      label: 'Pipe Leak',
      url: 'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&w=800&q=80',
    },
    {
      label: 'Broken Streetlight',
      url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
    },
  ];

  // Geolocation trigger
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Math.round(position.coords.latitude * 10000) / 10000;
        const lng = Math.round(position.coords.longitude * 10000) / 10000;
        setLatitude(lat);
        setLongitude(lng);
        if (!address) {
          setAddress(`GPS Location: ${lat.toFixed(4)}, ${lng.toFixed(4)} (Metro District)`);
        }
        setLocating(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        // Fallback demo coordinates
        setLatitude(37.7749);
        setLongitude(-122.4194);
        if (!address) {
          setAddress('Simulated GPS: Civic Center Plaza, Downtown');
        }
        setLocating(false);
      },
      { timeout: 8000 }
    );
  };

  // Image file upload handler (converts to base64 DataURL for offline self-contained demo)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (JPEG, PNG, or WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit. Please select a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
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

    if (!address.trim() || address.trim().length < 3) {
      setErrorMsg('Please provide the physical location or street landmark.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.createComplaint({
        title: title.trim(),
        description: description.trim(),
        category,
        address: address.trim(),
        locality: locality.trim() || 'Metro District',
        latitude,
        longitude,
        imageUrl: imageUrl || undefined,
        safetyRisk,
      });

      if (response.success && response.complaint) {
        setCreatedRef(response.complaint.reference);
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

        {/* Location Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              4. Physical Location &amp; Landmark <span className="text-rose-500">*</span>
            </label>
            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={locating}
              className="text-xs text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1 transition-colors"
            >
              <Navigation className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
              <span>{locating ? 'Locating...' : 'Use My GPS Location'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <input
                type="text"
                required
                placeholder="Street address or nearby landmark (e.g. 742 4th Ave near Elm)"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 placeholder-slate-400"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="Neighborhood / Locality"
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 placeholder-slate-400"
              />
            </div>
          </div>

          {latitude && longitude && (
            <div className="text-[11px] text-teal-800 bg-teal-50/80 border border-teal-200 px-3 py-1.5 rounded-lg flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span>
                Coordinates locked: {latitude.toFixed(4)}, {longitude.toFixed(4)} (Accurate for Leaflet map display)
              </span>
            </div>
          )}
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

        {/* Photo Upload & Sample Presets */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            5. Evidence Photo (Optional but Recommended)
          </label>

          <div className="flex flex-col sm:flex-row gap-4 items-start">
            {/* Custom file picker */}
            <label className="cursor-pointer border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-2xl p-4 text-center flex flex-col items-center justify-center w-full sm:w-60 h-36 bg-slate-50 transition-colors">
              <Upload className="w-6 h-6 text-slate-400 mb-1" />
              <span className="text-xs font-semibold text-slate-700">Choose Photo File</span>
              <span className="text-[10px] text-slate-400 mt-0.5">JPG, PNG up to 5MB</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>

            {/* Quick Demo preset selection */}
            <div className="flex-1 space-y-2">
              <span className="text-xs font-semibold text-slate-500">Or use a sample demo incident photo:</span>
              <div className="grid grid-cols-2 gap-2">
                {sampleImages.map((samp, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => setImageUrl(samp.url)}
                    className={`text-left p-2 rounded-xl border text-xs flex items-center gap-2 transition-all ${
                      imageUrl === samp.url
                        ? 'border-teal-500 bg-teal-50 text-teal-900 font-semibold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <img src={samp.url} alt={samp.label} className="w-8 h-8 rounded-lg object-cover" />
                    <span className="truncate text-[11px]">{samp.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Active Image Preview */}
          {imageUrl && (
            <div className="relative mt-2 rounded-xl overflow-hidden border border-slate-200 h-40 w-full bg-slate-100 flex items-center justify-center">
              <img src={imageUrl} alt="Complaint preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setImageUrl('')}
                className="absolute top-2 right-2 bg-slate-900/90 hover:bg-slate-900 text-white text-xs px-2.5 py-1 rounded-lg cursor-pointer"
              >
                Remove
              </button>
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
