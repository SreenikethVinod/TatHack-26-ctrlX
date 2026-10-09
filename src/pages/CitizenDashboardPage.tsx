import React, { useEffect, useState } from 'react';
import {
  FileText,
  Clock,
  CheckCircle2,
  PlusCircle,
  MapPin,
  Calendar,
  AlertTriangle,
  User,
  IndianRupee,
  HardHat,
  ArrowRight,
  Eye,
  Camera,
  Upload,
  Check,
  ShieldAlert,
  ChevronRight,
  X,
  MessageSquare,
  Bell,
  BellRing,
  Sparkles,
  Lock,
} from 'lucide-react';
import { api } from '../lib/api';
import { Complaint, ComplaintCategory, ComplaintHistoryEntry, OfficialNote, PhotoVerificationMetadata } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { PhotoVerificationBadge } from '../components/PhotoVerificationBadge';
import { InAppCameraCapture } from '../components/InAppCameraCapture';
import { useAuth } from '../context/AuthContext';
import { detectRealLocation, reverseGeocodeCoordinates } from '../lib/geo';

interface Props {
  onTrackNavigate?: (reference: string) => void;
  onReportNavigate?: () => void;
}

export const CitizenDashboardPage: React.FC<Props> = ({ onTrackNavigate }) => {
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'my-reports' | 'followed-reports' | 'new-report'>('my-reports');
  const [myComplaints, setMyComplaints] = useState<Complaint[]>([]);
  const [followedComplaints, setFollowedComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingLoading, setFollowingLoading] = useState(false);

  // Selected complaint for modal details
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [complaintHistory, setComplaintHistory] = useState<ComplaintHistoryEntry[]>([]);
  const [complaintNotes, setComplaintNotes] = useState<OfficialNote[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // New report form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ComplaintCategory>('road_damage');
  const [otherCategoryDetail, setOtherCategoryDetail] = useState('');
  const [address, setAddress] = useState('');
  const [locality, setLocality] = useState('');
  const [landmark, setLandmark] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [safetyRisk, setSafetyRisk] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [photoFingerprint, setPhotoFingerprint] = useState<string | null>(null);
  const [photoMetadata, setPhotoMetadata] = useState<PhotoVerificationMetadata | null>(null);
  const [isFlaggedMismatch, setIsFlaggedMismatch] = useState<boolean>(false);
  const [photoDistanceMeters, setPhotoDistanceMeters] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const handleDetectLocation = async () => {
    setLocating(true);
    setSubmitError(null);
    try {
      const geo = await detectRealLocation();
      setAddress(geo.address);
      if (geo.locality) {
        setLocality(geo.locality);
      }
      setLatitude(geo.latitude);
      setLongitude(geo.longitude);
    } catch (err: any) {
      console.warn('Geolocation error:', err);
      alert(err.message || 'Could not retrieve your location. Please enter your street address manually.');
    } finally {
      setLocating(false);
    }
  };

  const loadCitizenComplaints = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const res = await api.getComplaints();
      const all = res.complaints || [];
      // Filter for this citizen's reports (or match current user ID/email)
      const mine = all.filter(
        (c) => c.reporterId === currentUser.id || c.reporterName === currentUser.name
      );
      const followed = all.filter((c) => c.isFollowing);
      setMyComplaints(mine);
      setFollowedComplaints(followed);
    } catch (err) {
      console.error('Failed to load citizen complaints', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCitizenComplaints();
  }, [currentUser]);

  const handleOpenDetail = async (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setDetailLoading(true);
    try {
      const res = await api.getComplaint(complaint.id);
      setSelectedComplaint(res.complaint);
      setComplaintHistory(res.history || []);
      setComplaintNotes(res.notes || []);
    } catch (err) {
      console.error('Failed to load complaint details', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleToggleFollow = async (complaintId: string) => {
    if (!currentUser || followingLoading) return;
    setFollowingLoading(true);
    try {
      const res = await api.followComplaint(complaintId);
      if (selectedComplaint && selectedComplaint.id === complaintId) {
        setSelectedComplaint({
          ...selectedComplaint,
          isFollowing: res.isFollowing,
          followersCount: res.followersCount,
        });
      }
      await loadCitizenComplaints();
    } catch (err) {
      console.error('Failed to toggle follow status', err);
    } finally {
      setFollowingLoading(false);
    }
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !address.trim()) {
      setSubmitError('Please complete all required fields.');
      return;
    }

    if (category === 'other' && !otherCategoryDetail.trim()) {
      setSubmitError('Please specify the issue type for "Other".');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const finalDesc =
        category === 'other' && otherCategoryDetail.trim()
          ? `[Custom Category: ${otherCategoryDetail.trim()}]\n\n${description.trim()}`
          : description.trim();

      const composedAddress = landmark.trim()
        ? (address.trim() ? `${address.trim()} (Near: ${landmark.trim()})` : `Landmark: ${landmark.trim()}`)
        : address.trim();

      if (!composedAddress || composedAddress.length < 3) {
        setSubmitError('Please capture an evidence photo below to auto-detect location, or specify a nearby landmark.');
        setSubmitting(false);
        return;
      }

      const res = await api.createComplaint({
        title: title.trim(),
        description: finalDesc,
        category,
        address: composedAddress,
        locality: locality.trim(),
        latitude,
        longitude,
        safetyRisk,
        imageUrl: imageUrl.trim() || undefined,
        photoFingerprint: photoFingerprint || null,
        photoMetadata: photoMetadata || null,
        photoDistanceMeters,
        isFlaggedLocationMismatch: isFlaggedMismatch,
        locationMatchStatus: imageUrl ? (isFlaggedMismatch ? 'FLAGGED_MISMATCH' : 'VERIFIED') : 'NO_PHOTO',
      });

      let successText = `Report registered successfully with Reference ID ${res.complaint.reference}! 14-day municipal review started.`;
      if (res.complaint.isFlaggedLocationMismatch) {
        successText += ` ⚠️ Note: Photo location discrepancy flagged (${res.complaint.photoDistanceMeters || 0}m away from reported location) for on-site inspection.`;
      }
      setSubmitSuccess(successText);

      // Reset form
      setTitle('');
      setCategory('road_damage');
      setOtherCategoryDetail('');
      setDescription('');
      setAddress('');
      setLocality('');
      setLandmark('');
      setLatitude(null);
      setLongitude(null);
      setImageUrl('');
      setPhotoFingerprint(null);
      setPhotoMetadata(null);
      setIsFlaggedMismatch(false);
      setPhotoDistanceMeters(null);
      setSafetyRisk(false);

      // Refresh list and switch to "my-reports"
      await loadCitizenComplaints();
      setTimeout(() => {
        setActiveTab('my-reports');
        setSubmitSuccess(null);
      }, 1500);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit civic report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6 animate-in fade-in duration-150">
      {/* Citizen Header Greeting */}
      <div className="syntrix-card bg-white p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-extrabold text-xl shrink-0">
            {currentUser?.name ? currentUser.name[0].toUpperCase() : 'C'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                {currentUser?.name || 'Citizen Resident'}
              </h1>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-emerald-200">
                Citizen Portal
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {currentUser?.email} • Track your civic grievances &amp; resolutions transparently
            </p>
          </div>
        </div>

        {/* Tab Switcher: View Reports vs Followed Reports vs Create Report */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl self-start md:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('my-reports')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'my-reports'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>My Reports ({myComplaints.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('followed-reports')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'followed-reports'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bell className="w-3.5 h-3.5 text-indigo-600" />
            <span>Followed Reports ({followedComplaints.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('new-report')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'new-report'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create New Report</span>
          </button>
        </div>
      </div>

      {/* TAB 1: CREATE NEW REPORT */}
      {activeTab === 'new-report' && (
        <div className="syntrix-card bg-white p-6 sm:p-8 space-y-6 border border-slate-200">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-extrabold text-slate-900">Report a Civic Problem</h2>
            <p className="text-xs text-slate-500 mt-1">
              Your report will be registered immediately into the municipal queue. The municipal administration has up to 14 days to acknowledge and assign workers before automatic District Admin escalation.
            </p>
          </div>

          <form onSubmit={handleCreateReport} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Issue Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Hazardous Pothole on Maple Road"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ComplaintCategory)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                >
                  <option value="road_damage">Road &amp; Pavement Damage</option>
                  <option value="waste_management">Sanitation &amp; Waste Management</option>
                  <option value="drainage">Drainage &amp; Stormwater</option>
                  <option value="streetlights">Streetlights &amp; Electrical</option>
                  <option value="water_supply">Water Supply &amp; Pipelines</option>
                  <option value="public_safety">Public Safety Infrastructure</option>
                  <option value="other">Other Civic Issue (Specify below)</option>
                </select>
              </div>
            </div>

            {/* Conditional field for Other category */}
            {category === 'other' && (
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1.5 animate-in fade-in duration-200">
                <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <span>Specify Civic Issue Type / What is the issue? *</span>
                </label>
                <input
                  type="text"
                  required
                  value={otherCategoryDetail}
                  onChange={(e) => setOtherCategoryDetail(e.target.value)}
                  placeholder="e.g. Broken park playground bench, commercial hoarding blocking footpath, noise nuisance, etc."
                  className="w-full px-3.5 py-2.5 bg-white border border-indigo-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 placeholder-slate-400"
                />
                <p className="text-[11px] text-indigo-700">
                  Please describe the specific issue category not listed above.
                </p>
              </div>
            )}

            {/* Physical Location & Landmark Section */}
            <div className="space-y-3">
              <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Physical Location (Auto-Filled from Photo GPS)</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={locating}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <MapPin className={`w-3.5 h-3.5 ${locating ? 'animate-bounce text-indigo-600' : ''}`} />
                    <span>{locating ? 'Detecting...' : 'Detect Device GPS'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={address}
                      placeholder="📸 Will auto-populate from photo camera capture..."
                      className="w-full px-3.5 py-2.5 bg-slate-100 text-slate-700 font-medium border border-slate-300 rounded-xl text-xs sm:text-sm cursor-not-allowed select-all placeholder-slate-400 shadow-inner"
                    />
                  </div>

                  <div>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={locality}
                      placeholder="Locality / Ward"
                      className="w-full px-3.5 py-2.5 bg-slate-100 text-slate-700 font-medium border border-slate-300 rounded-xl text-xs sm:text-sm cursor-not-allowed select-all placeholder-slate-400 shadow-inner"
                    />
                  </div>
                </div>

                {latitude && longitude ? (
                  <div className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Camera Sensor Coordinates: {latitude.toFixed(5)}, {longitude.toFixed(5)}</span>
                    </div>
                    <span className="font-bold text-[10px] text-emerald-700">GPS Locked</span>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 italic">
                    The physical street address and coordinates are auto-detected when you take an evidence photo below.
                  </p>
                )}
              </div>

              {/* User-editable Landmark Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">
                  Nearby Landmark / Local Proximity <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="e.g. Near the statue, opposite campus gate 3, beside ATM..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 shadow-2xs"
                />
                <p className="text-[11px] text-slate-500">
                  Enter recognizable local landmarks (statue, campus gate, shop, pillar number) so ground teams locate the exact spot.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Detailed Description *</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain the severity, impact on traffic or residents, and how long the problem has existed..."
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
              />
            </div>

            {/* Live In-App Camera Evidence */}
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

                // Autofill physical location from camera image GPS metadata!
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
                    console.warn('Auto reverse geocoding error:', err);
                    setAddress(`GPS Pin: ${pLat.toFixed(5)}, ${pLng.toFixed(5)}`);
                  }
                }
              }}
              onPhotoCleared={() => {
                setImageUrl('');
                setPhotoFingerprint(null);
                setPhotoMetadata(null);
                setIsFlaggedMismatch(false);
                setPhotoDistanceMeters(null);
              }}
            />

            {/* Safety Risk Checkbox */}
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start gap-3">
              <input
                type="checkbox"
                id="safetyRiskCheck"
                checked={safetyRisk}
                onChange={(e) => setSafetyRisk(e.target.checked)}
                className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="safetyRiskCheck" className="text-xs text-amber-900 cursor-pointer">
                <span className="font-bold">Immediate Safety Risk:</span> Check this if this issue poses an imminent physical hazard to pedestrians or vehicular traffic.
              </label>
            </div>

            {submitError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{submitError}</span>
              </div>
            )}

            {submitSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{submitSuccess}</span>
              </div>
            )}

            <div className="pt-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="py-3 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" />
                    <span>Submit Civic Report</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('my-reports')}
                className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: MY REPORTS & STATUS */}
      {activeTab === 'my-reports' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Reports You Sent</h2>
              <p className="text-xs text-slate-500">
                Track real-time progress, assigned workers, and approved repair budgets for your submissions.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('new-report')}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Report Another Issue</span>
            </button>
          </div>

          {loading ? (
            <div className="syntrix-card bg-white p-12 text-center space-y-3">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Loading your reports...</p>
            </div>
          ) : myComplaints.length === 0 ? (
            <div className="syntrix-card bg-white p-10 text-center space-y-4 border border-dashed border-slate-300">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-base">No Reports Filed Yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  You have not submitted any civic complaints yet. Notice a pothole, broken streetlight, or garbage backlog? Report it now!
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('new-report')}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Your First Report</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {myComplaints.map((c) => {
                const isOverdue = c.isEscalatedDistrict || c.status === 'Escalated to District Admin';
                const isAcked = Boolean(c.acknowledgedAt) || c.status !== 'Submitted';
                const hasWorker = Boolean(c.assignedWorker);
                const isResolved = c.status === 'Resolved';

                return (
                  <div
                    key={c.id}
                    className="syntrix-card bg-white p-5 border border-slate-200 hover:border-slate-300 transition-all space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                          {c.reference}
                        </span>
                        <StatusBadge status={c.status} />
                        <PriorityBadge priority={c.priority} />
                        {c.imageUrl && (
                          <PhotoVerificationBadge
                            imageUrl={c.imageUrl}
                            photoFingerprint={c.photoFingerprint}
                            photoMetadata={c.photoMetadata}
                            isFlaggedLocationMismatch={c.isFlaggedLocationMismatch}
                            locationMatchStatus={c.locationMatchStatus}
                            photoDistanceMeters={c.photoDistanceMeters}
                            compact
                          />
                        )}
                        <span className="text-xs text-slate-400">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenDetail(c)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Audit Details</span>
                      </button>
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-extrabold text-slate-900 text-base">{c.title}</h3>
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {c.description}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        <span>{c.address} ({c.locality})</span>
                      </div>
                    </div>

                    {/* LIVE RESOLUTION STAGES PROGRESS BAR */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70 space-y-2">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                        <span>Resolution Stages</span>
                        {isOverdue && (
                          <span className="text-rose-600 font-bold flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" />
                            <span>Escalated to District Admin (&gt;14d Unacknowledged)</span>
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-4 gap-2 text-center text-xs">
                        {/* Step 1: Submitted */}
                        <div className="p-2 rounded-lg bg-emerald-100/70 border border-emerald-300 text-emerald-900 font-bold flex flex-col items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-[11px]">1. Submitted</span>
                        </div>

                        {/* Step 2: Acknowledged */}
                        <div
                          className={`p-2 rounded-lg border font-bold flex flex-col items-center gap-1 ${
                            isAcked
                              ? 'bg-emerald-100/70 border-emerald-300 text-emerald-900'
                              : isOverdue
                              ? 'bg-rose-50 border-rose-200 text-rose-700'
                              : 'bg-white border-slate-200 text-slate-400'
                          }`}
                        >
                          {isAcked ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Clock className="w-3.5 h-3.5" />
                          )}
                          <span className="text-[11px]">2. Acknowledged</span>
                        </div>

                        {/* Step 3: Assigned & Budget */}
                        <div
                          className={`p-2 rounded-lg border font-bold flex flex-col items-center gap-1 ${
                            hasWorker
                              ? 'bg-indigo-100/70 border-indigo-300 text-indigo-900'
                              : 'bg-white border-slate-200 text-slate-400'
                          }`}
                        >
                          {hasWorker ? (
                            <HardHat className="w-3.5 h-3.5 text-indigo-600" />
                          ) : (
                            <Clock className="w-3.5 h-3.5" />
                          )}
                          <span className="text-[11px]">3. Assigned / Budget</span>
                        </div>

                        {/* Step 4: Resolved */}
                        <div
                          className={`p-2 rounded-lg border font-bold flex flex-col items-center gap-1 ${
                            isResolved
                              ? 'bg-emerald-100/70 border-emerald-300 text-emerald-900'
                              : 'bg-white border-slate-200 text-slate-400'
                          }`}
                        >
                          {isResolved ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Clock className="w-3.5 h-3.5" />
                          )}
                          <span className="text-[11px]">4. Resolved</span>
                        </div>
                      </div>

                      {/* WORKER AND BUDGET DISPLAY FOR CITIZEN */}
                      {(hasWorker || (c.budget && c.budget > 0)) && (
                        <div className="mt-2 pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                          {c.assignedWorker && (
                            <div className="flex items-center gap-1.5 text-indigo-900 font-semibold">
                              <HardHat className="w-4 h-4 text-indigo-600" />
                              <span>Assigned Worker/Crew: <strong className="text-slate-900">{c.assignedWorker}</strong></span>
                            </div>
                          )}

                          {c.budget !== undefined && c.budget > 0 && (
                            <div className="flex items-center gap-1 text-emerald-800 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                              <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Approved Repair Budget: ₹{c.budget.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ACKNOWLEDGEMENT INFO */}
                      {c.acknowledgedAt && (
                        <div className="text-[11px] text-slate-500 pt-1 flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>
                            Acknowledged on {new Date(c.acknowledgedAt).toLocaleString()}
                            {c.acknowledgedByName ? ` by ${c.acknowledgedByName}` : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: FOLLOWED REPORTS */}
      {activeTab === 'followed-reports' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Reports You Are Following</h2>
              <p className="text-xs text-slate-500">
                You receive instant in-app alerts whenever work orders are assigned, inspections occur, or repairs conclude.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="syntrix-card bg-white p-12 text-center space-y-3">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Loading followed reports...</p>
            </div>
          ) : followedComplaints.length === 0 ? (
            <div className="syntrix-card bg-white p-10 text-center space-y-4 border border-dashed border-slate-300">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Bell className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">You haven't followed any reports yet</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Browse the public feed or explore reports in your neighborhood and click "Follow Report" to receive notifications.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {followedComplaints.map((c) => (
                <div
                  key={c.id}
                  className="syntrix-card bg-white p-5 rounded-2xl border border-slate-200/80 space-y-4 shadow-2xs hover:border-indigo-300 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {c.reference}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={c.status} />
                      <PriorityBadge priority={c.priority} />
                    </div>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm leading-snug line-clamp-1">{c.title}</h3>
                    <p className="text-xs text-slate-600 line-clamp-2 mt-1">{c.description}</p>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2 truncate">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{c.address} ({c.locality})</span>
                    </div>
                  </div>

                  {c.isMerged && (
                    <div className="p-2.5 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-900 flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span className="text-[11px] font-semibold">
                        Spatial Auto-Merge: Clustered with matching report ~50m across road.
                      </span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleToggleFollow(c.id)}
                      disabled={followingLoading}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                    >
                      <BellRing className="w-3.5 h-3.5" />
                      <span>Unfollow</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onTrackNavigate && onTrackNavigate(c.reference)}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Track Status</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DETAIL MODAL FOR CITIZEN INSPECTION */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-indigo-600">
                  {selectedComplaint.reference}
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">
                  {selectedComplaint.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedComplaint(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={selectedComplaint.status} />
                <PriorityBadge priority={selectedComplaint.priority} />
                <span className="text-xs text-slate-500">
                  Assigned Department: <strong className="text-slate-800">{selectedComplaint.assignedDepartment}</strong>
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl text-xs space-y-2 border border-slate-200">
                <div className="font-bold text-slate-700">Complaint Details</div>
                <p className="text-slate-600 leading-relaxed">{selectedComplaint.description}</p>
                <div className="text-slate-400">Location: {selectedComplaint.address} ({selectedComplaint.locality})</div>
              </div>

              {/* Worker & Budget Card */}
              <div className="p-3.5 bg-indigo-50/60 border border-indigo-200 rounded-xl text-xs space-y-2">
                <div className="font-bold text-indigo-900 flex items-center gap-1.5">
                  <HardHat className="w-4 h-4 text-indigo-600" />
                  <span>Repair Allocation &amp; Budget</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <div>
                    <span className="text-slate-400">Assigned Worker:</span>{' '}
                    <strong>{selectedComplaint.assignedWorker || 'Pending Assignment'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Budget Sanctioned:</span>{' '}
                    <strong className="text-emerald-700 font-mono">
                      {selectedComplaint.budget ? `₹${selectedComplaint.budget.toLocaleString()}` : 'Pending Budgeting'}
                    </strong>
                  </div>
                </div>
                {selectedComplaint.budgetNotes && (
                  <div className="text-[11px] text-indigo-700 pt-1">
                    Instructions: {selectedComplaint.budgetNotes}
                  </div>
                )}
              </div>

              {/* Photo if any */}
              {selectedComplaint.imageUrl && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-700">Photographic Evidence</div>
                  <img
                    src={selectedComplaint.imageUrl}
                    alt="Evidence"
                    className="w-full h-48 object-cover rounded-xl border border-slate-200"
                  />
                  <PhotoVerificationBadge
                    imageUrl={selectedComplaint.imageUrl}
                    photoFingerprint={selectedComplaint.photoFingerprint}
                    photoMetadata={selectedComplaint.photoMetadata}
                    isFlaggedLocationMismatch={selectedComplaint.isFlaggedLocationMismatch}
                    locationMatchStatus={selectedComplaint.locationMatchStatus}
                    photoDistanceMeters={selectedComplaint.photoDistanceMeters}
                  />
                </div>
              )}

              {/* History Timeline */}
              <div className="space-y-2 pt-2">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Audit History Events
                </div>
                {detailLoading ? (
                  <div className="text-xs text-slate-400 py-3 text-center">Loading audit log...</div>
                ) : complaintHistory.length === 0 ? (
                  <div className="text-xs text-slate-400">No events logged yet.</div>
                ) : (
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    {complaintHistory.map((h) => (
                      <div key={h.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-0.5">
                        <div className="flex items-center justify-between text-slate-400 text-[10px]">
                          <span>{h.actorName} ({h.actorRole})</span>
                          <span>{new Date(h.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="font-bold text-slate-800">{h.publicUpdate}</div>
                        {h.explanation && (
                          <div className="text-slate-500 text-[11px] italic">{h.explanation}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Auto-Merge Notice */}
            {selectedComplaint.isMerged && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                <span>
                  <strong>Spatial Auto-Merge:</strong> Clustered with matching report ~50m across the road into a unified municipal work order.
                </span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-between gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleToggleFollow(selectedComplaint.id)}
                disabled={followingLoading}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  selectedComplaint.isFollowing
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                }`}
                title={
                  selectedComplaint.isFollowing
                    ? 'Click to unfollow report updates'
                    : 'Follow this report to receive in-app notifications on all updates'
                }
              >
                {selectedComplaint.isFollowing ? (
                  <BellRing className="w-3.5 h-3.5 text-white" />
                ) : (
                  <Bell className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>{selectedComplaint.isFollowing ? 'Following' : 'Follow This Report'} ({selectedComplaint.followersCount || 1})</span>
              </button>

              <div className="flex items-center gap-2">
                {onTrackNavigate && (
                  <button
                    type="button"
                    onClick={() => {
                      const ref = selectedComplaint.reference;
                      setSelectedComplaint(null);
                      onTrackNavigate(ref);
                    }}
                    className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Track Full Details</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedComplaint(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
